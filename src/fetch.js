import { castArray, flattenDeep } from 'lodash';
import createInstance from './axiosInstance';
import qs from 'qs';
import { cleanData } from './clean-data';

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

    const { data: response } = await axiosInstance(opts);

    const data = response?.data || response;
    const meta = response?.meta;

    const page = parseInt(meta?.pagination.page || 1, 10);
    const pageCount = parseInt(meta?.pagination.pageCount || 1, 10);

    const pagesToGet = Array.from({
      length: pageCount - page,
    }).map((_, i) => i + page + 1);

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
