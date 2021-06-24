"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _pluralize = _interopRequireDefault(require("pluralize"));

var _lodash = _interopRequireWildcard(require("lodash"));

var _fetch = _interopRequireDefault(require("./fetch"));

var _nodes = require("./nodes");

var _normalize = _interopRequireDefault(require("./normalize"));

var _authentication = _interopRequireDefault(require("./authentication"));

function _getRequireWildcardCache(nodeInterop) { if (typeof WeakMap !== "function") return null; var cacheBabelInterop = new WeakMap(); var cacheNodeInterop = new WeakMap(); return (_getRequireWildcardCache = function (nodeInterop) { return nodeInterop ? cacheNodeInterop : cacheBabelInterop; })(nodeInterop); }

function _interopRequireWildcard(obj, nodeInterop) { if (!nodeInterop && obj && obj.__esModule) { return obj; } if (obj === null || typeof obj !== "object" && typeof obj !== "function") { return { default: obj }; } var cache = _getRequireWildcardCache(nodeInterop); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } newObj.default = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

const toTypeInfo = (type, {
  single = false
}) => {
  if (typeof type === 'object') {
    return {
      endpoint: type.endpoint || (single ? type.name : (0, _pluralize.default)(type.name)),
      name: type.name,
      api: type.api,
      defaultData: type.defaultData
    };
  }

  return {
    endpoint: single ? type : (0, _pluralize.default)(type),
    name: type
  };
};

const contentTypeToTypeInfo = toTypeInfo;

const singleTypeToTypeInfo = singleType => toTypeInfo(singleType, {
  single: true
});

const fetchEntities = async (entityDefinition, ctx) => {
  const entities = await (0, _fetch.default)(entityDefinition, ctx);
  await _normalize.default.downloadMediaFiles(entities, ctx);
  return entities;
};

const addDynamicZoneFieldsToSchema = ({
  type,
  items,
  actions,
  schema
}) => {
  const {
    createTypes
  } = actions; // Search for dynamic zones in all items

  const dynamicZoneFields = {};
  items.forEach(item => {
    _lodash.default.forEach(item, (value, field) => {
      if (_normalize.default.isDynamicZone(value)) {
        dynamicZoneFields[field] = 'JSON';
      }
    });
  }); // Cast dynamic zone fields to JSON

  if (!_lodash.default.isEmpty(dynamicZoneFields)) {
    const typeDef = schema.buildObjectType({
      name: `Strapi${(0, _lodash.upperFirst)((0, _lodash.camelCase)(type))}`,
      fields: dynamicZoneFields,
      interfaces: ['Node']
    });
    createTypes([typeDef]);
  }
};

exports.sourceNodes = async ({
  store,
  actions,
  cache,
  reporter,
  getNode,
  getNodes,
  createNodeId,
  createContentDigest,
  schema
}, {
  apiURL = 'http://localhost:1337',
  loginData = {},
  queryLimit = 100,
  ...options
}) => {
  const {
    createNode,
    deleteNode,
    touchNode
  } = actions;
  const jwtToken = await (0, _authentication.default)({
    loginData,
    reporter,
    apiURL
  });
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
    schema
  }; // Start activity, Strapi data fetching

  const fetchActivity = reporter.activityTimer(`Fetched Strapi Data`);
  fetchActivity.start();
  const collectionTypes = (options.collectionTypes || []).map(contentTypeToTypeInfo);
  const singleTypes = (options.singleTypes || []).map(singleTypeToTypeInfo);
  const types = [...collectionTypes, ...singleTypes]; // Execute the promises

  const entities = await Promise.all(types.map(type => fetchEntities(type, ctx))); // new created nodes

  const newNodes = []; // Fetch existing strapi nodes

  const existingNodes = getNodes().filter(n => n.internal.owner === `gatsby-source-strapi`); // Touch each one of them

  existingNodes.forEach(node => touchNode(node)); // Merge single and collection types and retrieve create nodes

  types.forEach(({
    name
  }, i) => {
    const items = entities[i];
    addDynamicZoneFieldsToSchema({
      type: name,
      items,
      actions,
      schema
    });
    items.forEach(item => {
      const node = (0, _nodes.Node)((0, _lodash.capitalize)(name), item); // Adding new created nodes in an Array

      newNodes.push(node); // Create nodes

      createNode(node);
    });
  }); // Make a diff array between existing nodes and new ones

  const diff = existingNodes.filter(existingNode => {
    return !newNodes.some(newNode => newNode.id === existingNode.id);
  }); // Delete diff nodes

  diff.forEach(node => deleteNode(getNode(node.id)));
  fetchActivity.end();
};