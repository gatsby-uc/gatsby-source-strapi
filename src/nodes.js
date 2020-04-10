import createNodeHelpers from 'gatsby-node-helpers'

const { createNodeFactory } = createNodeHelpers({
  typePrefix: 'Strapi',
})

export const Node = (type, node) =>
  createNodeFactory(type, node => {
    node.id = `${type}_${
      type === `Upload/file` && node.hash ? node.hash : node.strapiId
    }`
    return node
  })(node)
