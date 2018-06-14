import axios from 'axios'
import fetchData from './fetch'
import { Node } from './nodes'
import { capitalize } from 'lodash'
import normalize from './normalize'

exports.sourceNodes = async (
  { store, boundActionCreators, cache },
  { apiURL = 'http://localhost:1337', contentTypes = [], loginData = {} }
) => {
  const { createNode, touchNode } = boundActionCreators
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

  // Generate a list of promises based on the `contentTypes` option.
  const promises = contentTypes.map(contentType =>
    fetchData({
      apiURL,
      contentType,
      jwtToken,
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

  contentTypes.forEach((contentType, i) => {
    const items = entities[i]
    items.forEach((item, i) => {
      const node = Node(capitalize(contentType), item)
      createNode(node)
    })
  })
}
