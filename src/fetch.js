import { castArray, flattenDeep, pick } from 'lodash';
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
  'provider',
  'provider_metadata',
  'createdAt',
  'updatedAt',
];

/**
 * Removes the attribute key in the entire data.
 * @param {Object} attributes response from the API
 * @param {Object} currentSchema
 * @param {*} allSchemas
 * @returns
 */
const cleanAttributes = (attributes, currentSchema, allSchemas) => {
  if (!attributes) {
    return null;
  }

  return Object.entries(attributes).reduce((acc, [name, value]) => {
    const attribute = currentSchema.schema.attributes[name];

    // createdAt and updatedAt are not returned by the api
    if (!['relation', 'media'].includes(attribute?.type)) {
      acc[name] = value;

      return acc;
    }

    if (attribute.type === 'media') {
      if (Array.isArray(value?.data)) {
        return {
          ...acc,
          [name]: value.data
            ? value.data.map(({ id, attributes }) => ({
                id,
                ...pick(attributes, MEDIA_FIELDS),
              }))
            : null,
        };
      }

      return {
        ...acc,
        [name]: value.data
          ? {
              id: value.data.id,
              ...pick(value.data.attributes, MEDIA_FIELDS),
            }
          : null,
      };
    }

    const relationSchema = getContentTypeSchema(allSchemas, attribute.target);

    if (Array.isArray(value?.data)) {
      return {
        ...acc,
        [name]: value.data.map(({ id, attributes }) =>
          cleanAttributes({ id, ...attributes }, relationSchema, allSchemas)
        ),
      };
    }

    return {
      ...acc,
      [name]: cleanAttributes(
        value.data ? { id: value.data.id, ...value.data.attributes } : null,
        relationSchema,
        allSchemas
      ),
    };
  }, {});
};

const cleanData = ({ id, attributes }, ctx) => {
  const { contentTypesSchemas, contentTypeUid } = ctx;
  const currentContentTypeSchema = getContentTypeSchema(contentTypesSchemas, contentTypeUid);

  return {
    id,
    ...cleanAttributes(attributes, currentContentTypeSchema, contentTypesSchemas),
  };
};

const fetchStrapiContentTypes = async (pluginOptions) => {
  const axiosInstance = createInstance(pluginOptions);
  const {
    data: { data },
  } = await axiosInstance.get('/api/content-type-builder/content-types');

  return data;
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
