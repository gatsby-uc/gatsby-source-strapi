/**
 * Implement Gatsby's Node APIs in this file.
 *
 * See: https://www.gatsbyjs.com/docs/node-apis/
 */
// You can delete this file if you're not using it

/**
 * You can uncomment the following line to verify that
 * your plugin is being loaded in your site.
 *
 * See: https://www.gatsbyjs.com/docs/creating-a-local-plugin/#developing-a-local-plugin-that-is-outside-your-project
 */
import _ from 'lodash';
import { fetchStrapiContentTypes, fetchEntities, fetchEntity } from './fetch';
import { buildMapFromNodes, buildNodesToRemoveMap, getEndpoints } from './helpers';
import { downloadMediaFiles, createNodes } from './normalize';

exports.onPreInit = () => console.log('Loaded gatsby-source-strapi-plugin');

exports.sourceNodes = async (
  {
    actions,
    createContentDigest,
    createNodeId,
    reporter,
    getCache,
    store,
    cache,
    getNodes,
    getNode,
  },
  pluginOptions
) => {
  const { schemas } = await fetchStrapiContentTypes(pluginOptions);

  const { deleteNode, touchNode } = actions;

  const ctx = {
    strapiConfig: pluginOptions,
    actions,
    schemas,
    createContentDigest,
    createNodeId,
    reporter,
    getCache,
    getNode,
    getNodes,
    store,
    cache,
  };

  const existingNodes = getNodes().filter((n) => n.internal.owner === `gatsby-source-strapi`);

  existingNodes.forEach((n) => touchNode(n));

  const endpoints = getEndpoints(pluginOptions, schemas);

  // TODO caching
  // This works great to retrieve all the deleted entities but maybe we should request the api
  // another time to get the updated entries.
  // Though we might have an issue when a relation is updated...
  const data = await Promise.all(
    endpoints.map(({ kind, ...config }) => {
      if (kind === 'singleType') {
        return fetchEntity(config, ctx);
      }

      return fetchEntities(config, ctx);
    })
  );

  // Build a map of all nodes with the gatsby id and the strapi_id
  const existingNodesMap = buildMapFromNodes(existingNodes);

  // Build a map of all nodes that should be removed
  // This should also delete all the created nodes for markdown, relations, dz...
  const nodesToRemoveMap = buildNodesToRemoveMap(existingNodesMap, endpoints, data);

  // Delete all nodes that should be deleted
  Object.entries(nodesToRemoveMap).forEach(([nodeName, nodesToDelete]) => {
    if (nodesToDelete.length) {
      reporter.info(`Strapi: ${nodeName} deleting ${nodesToDelete.length}`);

      nodesToDelete.forEach(({ id }) => {
        const node = getNode(id);

        touchNode(node);
        deleteNode(node);
      });
    }
  });

  for (let i = 0; i < endpoints.length; i++) {
    const { singularName, uid } = endpoints[i];

    const nodeType = `Strapi${_.capitalize(singularName)}`;

    await downloadMediaFiles(data[i], ctx, uid);

    for (let entity of data[i]) {
      const nodes = createNodes(entity, nodeType, ctx, uid);

      await Promise.all(nodes.map((n) => actions.createNode(n)));
    }
  }

  return;
};
