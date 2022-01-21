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
import { capitalize } from 'lodash';
import { fetchStrapiContentTypes, fetchEntities, fetchEntity } from './fetch';
import { getEndpoints } from './helpers';
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
  const contentTypesSchemas = await fetchStrapiContentTypes(pluginOptions);
  const { touchNode } = actions;

  const ctx = {
    strapiConfig: pluginOptions,
    actions,
    contentTypesSchemas,
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

  const endpoints = getEndpoints(pluginOptions, contentTypesSchemas);

  const data = await Promise.all(
    endpoints.map(({ kind, ...config }) => {
      if (kind === 'singleType') {
        return fetchEntity(config, ctx);
      }

      return fetchEntities(config, ctx);
    })
  );

  for (let i = 0; i < endpoints.length; i++) {
    const { singularName, uid } = endpoints[i];

    const nodeType = `Strapi${capitalize(singularName)}`;

    for (let entity of data[i]) {
      await Promise.all(createNodes(entity, nodeType, ctx, uid));
    }

    await downloadMediaFiles(data[i], ctx, uid);
  }

  return;
};
