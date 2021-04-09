import pluralize from 'pluralize';
import { capitalize, has, isPlainObject, isArray } from 'lodash';

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

const isDynamicZone = (node) => {
  // Dynamic zones are always arrays
  if (isArray(node)) {
    return node.some((nodeItem) => {
      if (isPlainObject(nodeItem)) {
        // The object is a dynamic zone if it has a strapi_component key
        return has(nodeItem, 'strapi_component');
      }
      return false;
    });
  }
  return false;
};

exports.sourceNodes = async (
  { store, actions, cache, reporter, getNode, getNodes, createNodeId, createContentDigest },
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
    createContentDigest,
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
    const { createTypes } = actions;
    const items = entities[i];

    // Search for dynamic zones in all items
    const dynamicZoneFields = [];
    const entries = items.flatMap((item) => Object.entries(item));
    entries.forEach(([field, value]) => {
      if (isDynamicZone(value)) {
        // Add to the list of dynamic zone fields if it's not already there
        if (!dynamicZoneFields.includes(field)) {
          dynamicZoneFields.push(field);
        }
      }
    });

    // Cast dynamic zone fields to JSON
    if (dynamicZoneFields.length > 0) {
      const typeDefs = `
        type Strapi${capitalize(name)} implements Node {
          ${dynamicZoneFields.map(
            (field) => `
          ${field}: JSON
          `
          )}
        }
      `;
      createTypes(typeDefs);
    }

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
