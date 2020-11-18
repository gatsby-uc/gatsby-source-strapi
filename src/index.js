import pluralize from 'pluralize';
import { capitalize } from 'lodash';

import fetchData from './fetch';
import { Node } from './nodes';
import normalize from './normalize';
import authentication from './authentication';

const toTypeInfo = (type, { single = false }) => {
  if (type.endpoint) {
    return { endpoint: type.endpoint, name: type.name };
  }

  return { endpoint: single ? type : pluralize(type), name: type };
};

const contentTypeToTypeInfo = toTypeInfo;
const singleTypeToTypeInfo = (singleType) => toTypeInfo(singleType, { single: true });

const fetchEntities = async ({ endpoint }, ctx) => {
  const entities = await fetchData(endpoint, ctx);
  await normalize.downloadMediaFiles(entities, ctx);

  return entities;
};

exports.sourceNodes = async (
  { store, actions, cache, reporter, getNode, getNodes, createNodeId },
  { apiURL = 'http://localhost:1337', loginData = {}, queryLimit = 100, ...options }
) => {
  const { createNode, deleteNode, touchNode } = actions;

  const jwtToken = await authentication({ loginData, reporter, apiURL });

  const ctx = {
    store,
    cache,
    createNode,
    createNodeId,
    queryLimit,
    apiURL,
    jwtToken,
    reporter,
    touchNode,
  };

  // Start activity, Strapi data fetching
  const fetchActivity = reporter.activityTimer(`Fetched Strapi Data`);
  fetchActivity.start();

  const contentTypes = (options.contentTypes || []).map(contentTypeToTypeInfo);
  const singleTypes = (options.singleTypes || []).map(singleTypeToTypeInfo);

  const types = [...contentTypes, ...singleTypes];

  // Execute the promises
  const entities = await Promise.all(types.map((type) => fetchEntities(type, ctx)));

  // new created nodes
  const newNodes = [];

  // Fetch existing strapi nodes
  const existingNodes = getNodes().filter((n) => n.internal.owner === `gatsby-source-strapi`);

  // Touch each one of them
  existingNodes.forEach((n) => touchNode({ nodeId: n.id }));

  // Merge single and content types and retrieve create nodes
  types.forEach(({ name }, i) => {
    const items = entities[i];
    items.forEach((item) => {
      const node = Node(capitalize(name), item);
      // Adding new created nodes in an Array
      newNodes.push(node);

      // Create nodes
      createNode(node);
    });
  });

  // Make a diff array between existing nodes and new ones
  const diff = existingNodes.filter((existingNode) => {
    return !newNodes.some((newNode) => newNode.id === existingNode.id);
  });

  // Delete diff nodes
  diff.forEach((node) => deleteNode({ node: getNode(node.id) }));

  fetchActivity.end();
};
