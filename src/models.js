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

  // Query models from client.
  console.timeEnd(`Fetch Strapi models`)

  const isValidTarget = isValidContentType(contentTypes)

  // Get all relations.
  const relations = contentTypes.map(contentType =>
    extractRelations(contentType, documents.data.models.models, isValidTarget)
  )

  return { relations }
}

// Only include required Content Types specified in config
const isValidContentType = contentTypes => {
  return type => contentTypes.includes(type)
}

// Extract relations of Content Type from fetch result
const extractRelations = (contentType, models, isValidTarget) => {
  const model = getModel(contentType, models)

  const relations = {}

  if (model && model.associations && model.associations.length) {
    model.associations.forEach(association => {
      const attribute = association.alias
      const type = association.type
      const target = pluralize.singular(association[type])

      if (isValidTarget(target)) {
        relations[attribute] = pluralize.singular(target)
      }
    })
  }

  return relations
}

// Find model from fetch result
const getModel = (contentType, models) => {
  if (models.hasOwnProperty(contentType)) {
    return models[contentType]
  } else {
    for (const key of Object.keys(models.plugins)) {
      const plugin = models.plugins[key]

      if (plugin.hasOwnProperty(contentType)) {
        return plugin[contentType]
      }
    }
  }
}
