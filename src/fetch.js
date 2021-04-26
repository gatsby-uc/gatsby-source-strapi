import axios from 'axios';
import { isObject, forEach, set, castArray, startsWith } from 'lodash';

module.exports = async (entityDefinition, ctx) => {
  const { apiURL, queryLimit, jwtToken, reporter } = ctx;

  const { endpoint, api } = entityDefinition;

  // Retrieve qs params if defined (or empty string instead)
  const qs = api ? Object.keys(api.qs).map((param) => `&${param}=${api.qs[param]}`) : ``;

  // Define API endpoint.
  let apiBase = `${apiURL}/${endpoint}`;

  const apiEndpoint = `${apiBase}?_limit=${queryLimit}${qs}`;

  reporter.info(`Starting to fetch data from Strapi - ${apiEndpoint}`);

  try {
    const { data } = await axios(apiEndpoint, addAuthorizationHeader({}, jwtToken));
    return castArray(data).map(clean);
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
    set(options, 'headers.Authorization', `Bearer ${token}`);
  }

  return options;
};
