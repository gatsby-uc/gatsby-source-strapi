import axios from 'axios'
import fetchData from './fetch'
import fetchRelations from './relations'
import { Node } from './nodes'
import { capitalize } from 'lodash'
import normalize from './normalize'

exports.sourceNodes = async (
  { store, actions, createNodeId, cache },
  {
    apiURL = 'http://localhost:1337',
    contentTypes = [],
    loginData = {},
    queryLimit = 100,
  }
) => {
  const { createNode, touchNode } = actions
  let jwtToken = null

  // Check if loginData is set.
  if (
    loginData.hasOwnProperty('identifier') &&
    loginData.identifier.length !== 0 &&
    loginData.hasOwnProperty('password') &&
    loginData.password.length !== 0
  ) {
    console.time('Authenticate Strapi user')
    console.log('Authenticate Strapi user')

    // Define API endpoint.
    const loginEndpoint = `${apiURL}/auth/local`

    // Make API request.
    try {
      const loginResponse = await axios.post(loginEndpoint, loginData)

      if (loginResponse.hasOwnProperty('data')) {
        jwtToken = loginResponse.data.jwt
      }
    } catch (e) {
      console.error('Strapi authentication error: ' + e)
    }

    console.timeEnd('Authenticate Strapi user')
  }

  // Get the relation of models
  let relations = await fetchRelations({
    apiURL,
    contentTypes,
    jwtToken,
  })

  // Generate a list of promises based on the `contentTypes` option.
  const promises = contentTypes.map(contentType =>
    fetchData({
      apiURL,
      contentType,
      jwtToken,
      queryLimit,
    })
  )

  // Execute the promises.
  let entities = await Promise.all(promises)

  entities = await normalize.downloadMediaFiles({
    entities,
    apiURL,
    store,
    cache,
    createNode,
    touchNode,
    jwtToken,
  })

  entities = await normalize.addReferenceNodes({
    entities,
    createNodeId,
    relations,
  })

  contentTypes.forEach((contentType, i) => {
    const items = entities[i]
    items.forEach((item, i) => {
      const node = Node(capitalize(contentType), item)
      //node.id = createNodeId(`${contentType}-${node.id}`)
      createNode(node)
    })
  })
}
