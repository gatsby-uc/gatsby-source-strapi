import _, { castArray, flattenDeep, pick } from 'lodash';
import createInstance from './axiosInstance';
import qs from 'qs';
import { getContentTypeSchema } from './helpers';

const MEDIA_FIELDS = [
  'name',
  'alternativeText',
  'caption',
  'width',
  'height',
  'formats',
  'hash',
  'ext',
  'mime',
  'size',
  'url',
  'previewUrl',
  'createdAt',
  'updatedAt',
];

const restrictedFields = ['__component'];

/**
 * Removes the attribute key in the entire data.
 * @param {Object} attributes response from the API
 * @param {Object} currentSchema
 * @param {*} schemas
 * @returns
 */
const cleanAttributes = (attributes, currentSchema, schemas) => {
  if (!attributes) {
    return null;
  }

  return Object.entries(attributes).reduce((acc, [name, value]) => {
    const attribute = currentSchema.schema.attributes[name];

    const attributeName = restrictedFields.includes(name) ? _.snakeCase(`strapi_${name}`) : name;

    if (!attribute?.type) {
      acc[attributeName] = value;

      return acc;
    }

    if (!value) {
      acc[attributeName] = value;

      return acc;
    }

    // Changing the format in order to extract images from the richtext field
    // NOTE: We could add an option to disable the extraction
    if (attribute.type === 'richtext') {
      return {
        ...acc,
        [attributeName]: {
          [attributeName]: value,
          localFiles: [],
        },
      };
    }

    if (attribute.type === 'dynamiczone') {
      return {
        ...acc,
        [attributeName]: value.map((v) => {
          const compoSchema = getContentTypeSchema(schemas, v.__component);

          return cleanAttributes(v, compoSchema, schemas);
        }),
      };
    }

    if (attribute.type === 'component') {
      const isRepeatable = attribute.repeatable;
      const compoSchema = getContentTypeSchema(schemas, attribute.component);

      if (isRepeatable) {
        return {
          ...acc,
          [attributeName]: value.map((v) => {
            return cleanAttributes(v, compoSchema, schemas);
          }),
        };
      }

      return {
        ...acc,
        [attributeName]: cleanAttributes(value, compoSchema, schemas),
      };
    }

    if (attribute.type === 'media') {
      if (Array.isArray(value?.data)) {
        return {
          ...acc,
          [attributeName]: value.data
            ? value.data.map(({ id, attributes }) => ({
                id,
                ...pick(attributes, MEDIA_FIELDS),
              }))
            : null,
        };
      }

      return {
        ...acc,
        [attributeName]: value.data
          ? {
              id: value.data.id,
              ...pick(value.data.attributes, MEDIA_FIELDS),
            }
          : null,
      };
    }

    if (attribute.type === 'relation') {
      const relationSchema = getContentTypeSchema(schemas, attribute.target);

      if (Array.isArray(value?.data)) {
        return {
          ...acc,
          [attributeName]: value.data.map(({ id, attributes }) =>
            cleanAttributes({ id, ...attributes }, relationSchema, schemas)
          ),
        };
      }

      return {
        ...acc,
        [attributeName]: cleanAttributes(
          value.data ? { id: value.data.id, ...value.data.attributes } : null,
          relationSchema,
          schemas
        ),
      };
    }

    acc[attributeName] = value;

    return acc;
  }, {});
};

const cleanData = ({ id, attributes }, ctx) => {
  const { schemas, contentTypeUid } = ctx;
  const currentContentTypeSchema = getContentTypeSchema(schemas, contentTypeUid);

  return {
    id,
    ...cleanAttributes(attributes, currentContentTypeSchema, schemas),
  };
};

const fetchStrapiContentTypes = async (pluginOptions) => {
  const axiosInstance = createInstance(pluginOptions);
  const [
    {
      data: { data: contentTypes },
    },
    {
      data: { data: components },
    },
  ] = await Promise.all([
    axiosInstance.get('/api/content-type-builder/content-types'),
    axiosInstance.get('/api/content-type-builder/components'),
  ]);

  return {
    schemas: [...contentTypes, ...components],
    contentTypes,
    components,
  };
};

const fetchEntity = async ({ endpoint, queryParams, uid }, ctx) => {
  const { strapiConfig, reporter } = ctx;
  const axiosInstance = createInstance(strapiConfig);

  const opts = {
    method: 'GET',
    url: endpoint,
    params: queryParams,
    paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
  };

  try {
    reporter.info(`Starting to fetch data from Strapi - ${opts.url} with ${JSON.stringify(opts)}`);

    const { data } = await axiosInstance(opts);

    return castArray(data.data).map((entry) => cleanData(entry, { ...ctx, contentTypeUid: uid }));
  } catch (error) {
    // reporter.panic(
    //   `Failed to fetch data from Strapi ${opts.url} with ${JSON.stringify(opts)}`,
    //   error,
    // );
    return [];
  }
};

const fetchEntities = async ({ endpoint, queryParams, uid }, ctx) => {
  const { strapiConfig, reporter } = ctx;
  const axiosInstance = createInstance(strapiConfig);

  const opts = {
    method: 'GET',
    url: endpoint,
    params: queryParams,
    paramsSerializer: (params) => qs.stringify(params, { encodeValuesOnly: true }),
  };

  try {
    reporter.info(
      `Starting to fetch data from Strapi - ${opts.url} with ${JSON.stringify(opts.params)}`
    );

    const {
      data: { data, meta },
    } = await axiosInstance(opts);

    const page = parseInt(meta.pagination.page);

    const pagesToGet = Array.from({ length: parseInt(meta.pagination.pageCount, 10) - page }).map(
      (_, i) => i + page + 1
    );

    const arrayOfPromises = pagesToGet.map((page) => {
      return (async () => {
        const options = {
          ...opts,
        };

        options.params.pagination.page = page;

        reporter.info(
          `Starting to fetch data from Strapi - ${options.url} with ${JSON.stringify(
            opts.paramsSerializer(opts.params)
          )}`
        );

        try {
          const {
            data: { data },
          } = await axiosInstance(options);

          return data;
        } catch (err) {
          reporter.panic(`Failed to fetch data from Strapi ${options.url}`, err);
        }
      })();
    });

    const results = await Promise.all(arrayOfPromises);

    const cleanedData = [...data, ...flattenDeep(results)].map((entry) =>
      cleanData(entry, { ...ctx, contentTypeUid: uid })
    );

    return cleanedData;
  } catch (error) {
    reporter.panic(`Failed to fetch data from Strapi ${opts.url}`, error);
    return [];
  }
};

export { fetchStrapiContentTypes, fetchEntity, fetchEntities };
