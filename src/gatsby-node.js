import axios from 'axios'
import fetchData from './fetch'
import { Node } from './nodes'
import { capitalize } from 'lodash'
import normalize from './normalize'

exports.sourceNodes = async (
  { store, actions, cache, reporter },
  {
    apiURL = 'http://localhost:1337',
    contentTypes = [],
    singleTypes = [],
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
    const authenticationActivity = reporter.activityTimer(
      `Authenticate Strapi User`
    )
    authenticationActivity.start()

    // Define API endpoint.
    const loginEndpoint = `${apiURL}/auth/local`

    // Make API request.
    try {
      const loginResponse = await axios.post(loginEndpoint, loginData)

      if (loginResponse.hasOwnProperty('data')) {
        jwtToken = loginResponse.data.jwt
      }
    } catch (e) {
      reporter.panic('Strapi authentication error: ' + e)
    }

    authenticationActivity.end()
  }

  const fetchActivity = reporter.activityTimer(`Fetched Strapi Data`)
  fetchActivity.start()

  // Generate a list of promises based on the `contentTypes` option.
  const contentTypePromises = contentTypes.map(contentType =>
    fetchData({
      apiURL,
      contentType,
      jwtToken,
      queryLimit,
      reporter
    })
  )

  // Generate a list of promises based on the `singleTypes` option.
  const singleTypePromises = singleTypes.map(singleType =>
    fetchData({
      apiURL,
      singleType,
      jwtToken,
      reporter
    })
  )

  // Execute the promises
  let entities = await Promise.all([
    ...contentTypePromises,
    ...singleTypePromises,
  ])

  entities = await normalize.downloadMediaFiles({
    entities,
    apiURL,
    store,
    cache,
    createNode,
    touchNode,
    jwtToken,
  })
  
  // Merge single and content types and retrieve create nodes
  contentTypes.concat(singleTypes).forEach((contentType, i) => {
    const items = entities[i]
    items.forEach((item, i) => {
      const node = Node(capitalize(contentType), item)
      createNode(node)
    })
  })

  fetchActivity.end()
}
