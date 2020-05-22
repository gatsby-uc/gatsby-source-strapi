import axios from 'axios'
import { isObject, startsWith, forEach } from 'lodash'
import pluralize from 'pluralize'

module.exports = async ({
  apiURL,
  contentType,
  singleType,
  jwtToken,
  queryLimit,
  reporter,
}) => {
  // Define API endpoint.
  let apiBase = singleType
    ? `${apiURL}/${singleType}`
    : `${apiURL}/${pluralize(contentType)}`

  const apiEndpoint = `${apiBase}?_limit=${queryLimit}`

  reporter.info(`Starting to fetch data from Strapi - ${apiEndpoint}`)

  // Set authorization token
  let fetchRequestConfig = {}
  if (jwtToken !== null) {
    fetchRequestConfig.headers = {
      Authorization: `Bearer ${jwtToken}`,
    }
  }

  // Make API request.
  const documents = await axios(apiEndpoint, fetchRequestConfig)

  // Make sure response is an array for single type instances
  const response = Array.isArray(documents.data)
    ? documents.data
    : [documents.data]

  // Map and clean data.
  return response.map(item => clean(item))
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
      item['strapi' + key] = value
    } else if (startsWith(key, `_`)) {
      delete item[key]
      item[key.slice(1)] = value
    } else if (isObject(value)) {
      item[key] = clean(value)
    }
  })

  return item
}
