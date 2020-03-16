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
  // either contentType / singleType needs to be present
  const apiEndpoint = contentType
    ? `${apiURL}/${pluralize(contentType)}?_limit=${queryLimit}`
    : `${apiURL}/${singleType}`

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

  // Map and clean data.
  return contentType
    ? documents.data.map(item => clean(item))
    : [clean(documents.data)]
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
