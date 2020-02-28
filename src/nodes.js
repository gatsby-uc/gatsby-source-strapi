import createNodeHelpers from 'gatsby-node-helpers'

const { createNodeFactory } = createNodeHelpers({
  typePrefix: 'Strapi',
})

export const Node = (type, node) =>
  createNodeFactory(type, node => {
    node.id = `${type}_${node.strapiId}`
    return node
  })(node)
