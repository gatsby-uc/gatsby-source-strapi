import axios from 'axios';
import { isObject, forEach, set, castArray, startsWith } from 'lodash';

module.exports = async (entityDefinition, ctx) => {
  const { apiURL, queryLimit, jwtToken, reporter } = ctx;

  const { endpoint, api, defaultData } = entityDefinition;

  // Define API endpoint.
  let apiBase = `${apiURL}/${endpoint}`;

  const requestOptions = {
    method: 'GET',
    url: apiBase,
    // Place global params first, so that they can be overriden by api.qs
    params: { _limit: queryLimit, ...api?.qs },
    headers: addAuthorizationHeader({}, jwtToken),
  };

  reporter.info(
    `Starting to fetch data from Strapi - ${apiBase} with params ${JSON.stringify(
      requestOptions.params
    )}`
  );

  try {
    const { data } = await axios(requestOptions);
    return castArray(data).map(clean);
  } catch (error) {
    if (error.response.status === 404 && defaultData) {
      reporter.info(`Use Default Data for ${apiBase}`);
      return castArray(defaultData).map(clean);
    }
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
