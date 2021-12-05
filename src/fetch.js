import axios from 'axios';
import qs from 'qs';
import { isObject, forEach, set, castArray, startsWith } from 'lodash';

module.exports = async (entityDefinition, ctx) => {
  const { apiURL, queryLimit, token, reporter } = ctx;

  const { endpoint, api } = entityDefinition;

  // Define API endpoint.
  let apiBase = `${apiURL}/api/${endpoint}`;

  const requestOptions = {
    method: 'GET',
    url: apiBase,
    // Place global params first, so that they can be overriden by api.qs
    paramsSerializer: (params) => qs.stringify(params),
    params: { pagination: { pageSize: queryLimit }, populate: '*', ...api?.qs },
    headers: addAuthorizationHeader({}, token),
  };

  reporter.info(
    `Starting to fetch data from Strapi - ${apiBase} with params ${JSON.stringify(
      requestOptions.params
    )}`
  );

  try {
    const { data: responseData } = await axios(requestOptions);
    return castArray(responseData.data).map(clean);
  } catch (error) {
    reporter.panic(`Failed to fetch data from Strapi`, error);
  }
};

/**
 * Remove fields starting with `_` symbol.
 *
 * @param {object} item - Entry needing clean
 * @returns {object} output - Object cleaned
 */
const clean = (item) => {
  forEach(item, (value, key) => {
    if (key === `__v`) {
      // Remove mongo's __v
      delete item[key];
    } else if (key === `_id`) {
      // Rename mongo's "_id" key to "id".
      delete item[key];
      item.id = value;
    } else if (startsWith(key, '__')) {
      // Gatsby reserves double-underscore prefixes – replace prefix with "strapi"
      delete item[key];
      item[`strapi_${key.slice(2)}`] = value;
    } else if (isObject(value)) {
      item[key] = clean(value);
    }
  });

  return item;
};

const addAuthorizationHeader = (options, token) => {
  if (token) {
    set(options, 'Authorization', `Bearer ${token}`);
  }

  return options;
};
