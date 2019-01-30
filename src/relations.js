import axios from 'axios'
import pluralize from 'pluralize'

module.exports = async ({ apiURL, contentTypes, jwtToken }) => {
  console.time(`Fetch Strapi models`)

  // Define API endpoint.
  const modelsEndpoint = `${apiURL}/content-manager/models`

  // Set authorization token
  let fetchRequestConfig = {}
  if (jwtToken !== null) {
    fetchRequestConfig.headers = {
      Authorization: `Bearer ${jwtToken}`,
    }
  }

  // Make API request.
  const documents = await axios(modelsEndpoint, fetchRequestConfig)

  // Query all documents from client.
  console.timeEnd(`Fetch Strapi models`)

  const isValidTarget = isValidContentType(contentTypes)

  // Map and clean data.
  return contentTypes.map(contentType =>
    extract(contentType, documents.data.models.models, isValidTarget)
  )
}

// Only include required Content Types specified in config
const isValidContentType = contentTypes => {
  return type => contentTypes.includes(type)
}

// Extract relation of Content Type from fetch result
const extract = (contentType, models, isValidTarget) => {
  const associations = getAssociations(contentType, models)

  const relation = {}

  if (associations && associations.length) {
    associations.forEach(association => {
      const attribute = association.alias
      const type = association.type
      const target = pluralize.singular(association[type])

      if (isValidTarget(target)) {
        relation[attribute] = pluralize.singular(target)
      }
    })
  }

  return relation
}

// Find associations from fetch result
const getAssociations = (contentType, models) => {
  if (models.hasOwnProperty(contentType)) {
    return models[contentType].associations
  } else {
    for (const key of Object.keys(models.plugins)) {
      const plugin = models.plugins[key]

      if (plugin.hasOwnProperty(contentType)) {
        return plugin[contentType].associations
      }
    }
  }
}
