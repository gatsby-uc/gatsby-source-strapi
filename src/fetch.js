import axios from 'axios';
import { isObject, forEach, set, castArray, startsWith } from 'lodash';
import pluralize from 'pluralize';

module.exports = async ({ apiURL, contentType, singleType, jwtToken, queryLimit, reporter }) => {
  // Define API endpoint.
  let apiBase = singleType ? `${apiURL}/${singleType}` : `${apiURL}/${pluralize(contentType)}`;

  const apiEndpoint = `${apiBase}?_limit=${queryLimit}`;

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
