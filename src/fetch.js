import axios from 'axios'
import { isObject, startsWith, forEach } from 'lodash'
import pluralize from 'pluralize'

const TIME_PREFIX = 'Fetch Strapi data';

module.exports = async ({ apiURL, contentType, jwtToken, queryLimit }) => {
  const contentTypePlural = pluralize(contentType);
  const timeLabel = `${TIME_PREFIX}: ${contentTypePlural}`;

  console.time(timeLabel)

  console.log(`Starting to fetch data from Strapi (${contentTypePlural})`)

  // Define API endpoint.
  const apiEndpoint = `${apiURL}/${contentTypePlural}?_limit=${queryLimit}`

  // Set authorization token
  let fetchRequestConfig = {}

  if (jwtToken !== null) {
    fetchRequestConfig.headers = {
      Authorization: `Bearer ${jwtToken}`,
    }
  }

  // Make API request.
  const documents = await axios(apiEndpoint, fetchRequestConfig)

  // Query all documents from client.
  console.timeEnd(timeLabel)

  // Map and clean data.
  return documents.data.map(item => clean(item))
}

/**
 * Remove fields starting with `_` symbol.
 *
 * @param {object} item - Entry needing clean
 * @returns {object} output - Object cleaned
 */
const clean = item => {
  forEach(item, (value, key) => {
    if (startsWith(key, `__`)) {
      delete item[key]
    } else if (startsWith(key, `_`)) {
      delete item[key]
      item[key.slice(1)] = value
    } else if (isObject(value)) {
      item[key] = clean(value)
    }
  })

  return item
}
