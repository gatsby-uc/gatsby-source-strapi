import pluralize from 'pluralize';
import _, { upperFirst, camelCase, capitalize } from 'lodash';

import fetchData from './fetch';
import { Node } from './nodes';
import normalize from './normalize';
import authentication from './authentication';

const toTypeInfo = (type, { single = false }) => {
  if (typeof type === 'object') {
    return {
      endpoint: type.endpoint || (single ? type.name : pluralize(type.name)),
      name: type.name,
      api: type.api,
      defaultData: type.defaultData,
    };
  }

  return { endpoint: single ? type : pluralize(type), name: type };
};

const contentTypeToTypeInfo = toTypeInfo;
const singleTypeToTypeInfo = (singleType) => toTypeInfo(singleType, { single: true });

const fetchEntities = async (entityDefinition, ctx) => {
  const entities = await fetchData(entityDefinition, ctx);
  await normalize.downloadMediaFiles(entities, ctx);

  return entities;
};

const addDynamicZoneFieldsToSchema = ({ type, items, actions, schema }) => {
  const { createTypes } = actions;
  // Search for dynamic zones in all items
  const dynamicZoneFields = {};

  items.forEach((item) => {
    _.forEach(item, (value, field) => {
      if (normalize.isDynamicZone(value)) {
        dynamicZoneFields[field] = 'JSON';
      }
    });
  });

  // Cast dynamic zone fields to JSON
  if (!_.isEmpty(dynamicZoneFields)) {
    const typeDef = schema.buildObjectType({
      name: `Strapi${upperFirst(camelCase(type))}`,
      fields: dynamicZoneFields,
      interfaces: ['Node'],
    });

    createTypes([typeDef]);
  }
};

exports.sourceNodes = async (
  { store, actions, cache, reporter, getNode, getNodes, createNodeId, createContentDigest, schema },
  { apiURL = 'http://localhost:1337', loginData = {}, queryLimit = 100, ...options }
) => {
  const { createNode, deleteNode, touchNode } = actions;

  const jwtToken = await authentication({ loginData, reporter, apiURL });

  const ctx = {
    store,
    cache,
    getNode,
    createNode,
    createNodeId,
    queryLimit,
    apiURL,
    jwtToken,
    reporter,
    touchNode,
    createContentDigest,
    schema,
  };

  // Start activity, Strapi data fetching
  const fetchActivity = reporter.activityTimer(`Fetched Strapi Data`);
  fetchActivity.start();

  const collectionTypes = (options.collectionTypes || []).map(contentTypeToTypeInfo);
  const singleTypes = (options.singleTypes || []).map(singleTypeToTypeInfo);

  const types = [...collectionTypes, ...singleTypes];

  // Execute the promises
  const entities = await Promise.all(types.map((type) => fetchEntities(type, ctx)));

  // new created nodes
  const newNodes = [];

  // Fetch existing strapi nodes
  const existingNodes = getNodes().filter((n) => n.internal.owner === `gatsby-source-strapi`);

  // Touch each one of them
  existingNodes.forEach((node) => touchNode(node));

  // Merge single and collection types and retrieve create nodes
  types.forEach(({ name }, i) => {
    const items = entities[i];

    addDynamicZoneFieldsToSchema({ type: name, items, actions, schema });

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
  diff.forEach((node) => deleteNode(getNode(node.id)));

  fetchActivity.end();
};
