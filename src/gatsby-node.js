import axios from 'axios'
import fetchData from './fetch'
import { Node } from './nodes'
import { capitalize, isObject } from 'lodash'
import normalize from './normalize'
import authentication from './authentication'

exports.sourceNodes = async (
  { store, actions, cache, reporter, getNode, getNodes },
  { sources = {} }
) => {
  const { createNode, deleteNode, touchNode } = actions

  // Start activity, Strapi data fetching
  const fetchActivity = reporter.activityTimer(`Fetched Strapi Data`)
  fetchActivity.start()

  // The for loop is needed because of the await promises
  for (const source of sources) {
    const { apiURL, contentTypes, singleTypes, loginData, queryLimit } = source

    // Authentication function
    const jwtToken = await authentication({ loginData, reporter, apiURL })

    // Generate a list of promises based on the `contentTypes` option.
    const contentTypePromises = contentTypes.map(contentType =>
      fetchData({
        apiURL,
        contentType,
        jwtToken,
        queryLimit,
        reporter,
      })
    )

    // Generate a list of promises based on the `singleTypes` option.
    const singleTypePromises = singleTypes.map(singleType =>
      fetchData({
        apiURL,
        singleType,
        jwtToken,
        queryLimit,
        reporter,
      })
    )

    // Execute the promises
    let entities = await Promise.all([
      ...contentTypePromises,
      ...singleTypePromises,
    ])

    // Creating files
    entities = await normalize.downloadMediaFiles({
      entities,
      apiURL,
      store,
      cache,
      createNode,
      touchNode,
      jwtToken,
    })

    // new created nodes
    let newNodes = []

    // Fetch existing strapi nodes
    const existingNodes = getNodes().filter(
      n => n.internal.owner === `gatsby-source-strapi`
    )

    // Touch each one of them
    existingNodes.forEach(n => {
      touchNode({ nodeId: n.id })
    })

    // Merge single and content types and retrieve create nodes
    contentTypes.concat(singleTypes).forEach((type, i) => {
      const items = entities[i]
      const name = isObject(type) ? type.name : type
      items.forEach((item, i) => {
        const node = Node(capitalize(name), item)
        // Adding new created nodes in an Array
        newNodes.push(node)
        // Create nodes
        createNode(node)
      })
    })

    // QUESTION: IS THE CODE BELOW NEEDED WHEN HAVING MULTIPLE CONFIGS?
    // Make a diff array between existing nodes and new ones
    // const diff = existingNodes.filter(
    //   ({ id: id1 }) => !newNodes.some(({ id: id2 }) => id2 === id1)
    // )

    // // Delete diff nodes
    // diff.forEach(data => {
    //   deleteNode({ node: getNode(data.id) })
    // })
  }

  fetchActivity.end()
}
