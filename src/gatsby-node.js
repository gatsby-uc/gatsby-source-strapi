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

import { fetchStrapiContentTypes, fetchEntities, fetchEntity } from './fetch';
import { buildMapFromNodes, buildNodesToRemoveMap, getEndpoints } from './helpers';
import { downloadMediaFiles, createNodes } from './normalize';

const LAST_FETCHED_KEY = 'timestamp';

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

  const existingNodes = getNodes().filter(
    (n) => n.internal.owner === `gatsby-source-strapi` || n.internal.type === 'File'
  );

  existingNodes.forEach((n) => touchNode(n));

  const endpoints = getEndpoints(pluginOptions, schemas);

  const lastFetched = await cache.get(LAST_FETCHED_KEY);

  const allResults = await Promise.all(
    endpoints.map(({ kind, ...config }) => {
      if (kind === 'singleType') {
        return fetchEntity(config, ctx);
      }

      return fetchEntities(config, ctx);
    })
  );

  let newOrExistingEntries;

  // Fetch only the updated data between run
  if (lastFetched) {
    const deltaEndpoints = endpoints.map((endpoint) => {
      return {
        ...endpoint,
        queryParams: {
          ...endpoint.queryParams,
          // TODO
          filters: {
            updatedAt: { $gt: lastFetched },
          },
        },
      };
    });

    newOrExistingEntries = await Promise.all(
      deltaEndpoints.map(({ kind, ...config }) => {
        if (kind === 'singleType') {
          return fetchEntity(config, ctx);
        }

        return fetchEntities(config, ctx);
      })
    );
  }

  const data = newOrExistingEntries || allResults;

  // Build a map of all nodes with the gatsby id and the strapi_id
  const existingNodesMap = buildMapFromNodes(existingNodes);

  // Build a map of all the parent nodes that should be removed
  // This should also delete all the created nodes for markdown, relations, dz...
  // When fetching only one content type and populating its relations it might cause some issues
  // as the relation nodes will never be deleted
  // it's best to fetch the content type and its relations separately and to populate
  // only one level of relation
  const nodesToRemoveMap = buildNodesToRemoveMap(existingNodesMap, endpoints, allResults);

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
    const { uid } = endpoints[i];

    await downloadMediaFiles(data[i], ctx, uid);

    for (let entity of data[i]) {
      const nodes = createNodes(entity, ctx, uid);

      await Promise.all(nodes.map((n) => actions.createNode(n)));
    }
  }

  return;
};

exports.onPostBuild = async ({ cache }) => {
  await cache.set(LAST_FETCHED_KEY, Date.now());
};
