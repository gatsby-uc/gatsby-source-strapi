import axios from 'axios'
import { isObject, forEach, set, castArray } from 'lodash'
import pluralize from 'pluralize'

module.exports = async ({ apiURL, contentType, singleType, jwtToken, queryLimit, reporter }) => {
  // Define API endpoint.
  let apiBase = singleType ? `${apiURL}/${singleType}` : `${apiURL}/${pluralize(contentType)}`

  const apiEndpoint = `${apiBase}?_limit=${queryLimit}`

  reporter.info(`Starting to fetch data from Strapi - ${apiEndpoint}`)

  try {
    const { data } = await axios(apiEndpoint, addAuthorizationHeader({}, jwtToken))
    return castArray(data).map(clean)
  } catch (error) {
    reporter.panic(`Failed to fetch data from Strapi`, error)
  }
}

/**
 * Remove fields starting with `_` symbol.
 *
 * @param {object} item - Entry needing clean
 * @returns {object} output - Object cleaned
 */
const clean = item => {
  forEach(item, (value, key) => {
    // Remove mongo's __v
    if (key === `__v`) {
      delete item[key]
      // Rename mongo's "_id" key to "id".
    } else if (key === `_id`) {
      delete item[key]
      item.id = value
    } else if (isObject(value)) {
      item[key] = clean(value)
    }
  })

  return item
}

const addAuthorizationHeader = (options, token) => {
  if (token) {
    set(options, 'headers.Authorization', `Bearer ${token}`)
  }

  return options
}
