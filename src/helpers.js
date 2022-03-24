import _ from 'lodash';

const buildMapFromNodes = (nodes) => {
  return nodes.reduce((acc, current) => {
    const { internal, strapi_id, id } = current;
    const type = internal?.type;

    // We only delete the parent nodes
    if (type.includes('STRAPI__COMPONENT_')) {
      return acc;
    }

    if (type.includes('_JSONNODE')) {
      return acc;
    }

    if (type.includes('_TEXTNODE')) {
      return acc;
    }

    if (type && id && strapi_id) {
      if (acc[type]) {
        acc[type] = [
          ...acc[type],
          {
            strapi_id,
            id,
          },
        ];
      } else {
        acc[type] = [
          {
            strapi_id,
            id,
          },
        ];
      }
    }

    return acc;
  }, {});
};

const buildMapFromData = (endpoints, data) => {
  const map = {};

  for (let i = 0; i < endpoints.length; i++) {
    const { singularName } = endpoints[i];

    const nodeType = _.toUpper(`Strapi_${_.snakeCase(singularName)}`);

    for (let entity of data[i]) {
      if (map[nodeType]) {
        map[nodeType] = [...map[nodeType], { strapi_id: entity.id }];
      } else {
        map[nodeType] = [{ strapi_id: entity.id }];
      }
    }
  }

  return map;
};

const buildNodesToRemoveMap = (existingNodesMap, endpoints, data) => {
  const newNodes = buildMapFromData(endpoints, data);

  const toRemoveMap = Object.entries(existingNodesMap).reduce((acc, [name, value]) => {
    const currentNodes = newNodes[name];

    // Since we create nodes for relations when fetching the api
    // We only to delete nodes that are actually being fetched
    if (!currentNodes) {
      return acc;
    }

    acc[name] = value.filter((j) => {
      return currentNodes.findIndex((k) => k.strapi_id === j.strapi_id) === -1;
    });

    return acc;
  }, {});

  return toRemoveMap;
};

const getContentTypeSchema = (schemas, ctUID) => {
  const currentContentTypeSchema = schemas.find(({ uid }) => uid === ctUID);

  return currentContentTypeSchema;
};

const getEndpoints = ({ collectionTypes, singleTypes }, schemas) => {
  const types = normalizeConfig({ collectionTypes, singleTypes });

  const endpoints = schemas
    .filter(
      ({ schema }) =>
        types.findIndex(({ singularName }) => singularName === schema.singularName) !== -1
    )
    .map(({ schema: { kind, singularName, pluralName }, uid }) => {
      const options = types.find((config) => config.singularName === singularName);
      const { queryParams, queryLimit, pluginOptions } = options;

      if (kind === 'singleType') {
        return {
          singularName,
          kind,
          uid,
          endpoint: `/api/${singularName}`,
          queryParams: queryParams || {
            populate: '*',
          },
          pluginOptions,
        };
      }

      return {
        singularName,
        pluralName,
        kind,
        uid,
        endpoint: `/api/${pluralName}`,
        queryParams: {
          ...(queryParams || {}),
          pagination: {
            pageSize: queryLimit || 250,
            page: 1,
          },
          populate: queryParams?.populate || '*',
        },
        pluginOptions,
      };
    });

  return endpoints;
};

const normalizeConfig = ({ collectionTypes, singleTypes }) => {
  const toSchemaDef = (types) =>
    types
      .map((config) => {
        if (_.isPlainObject(config)) {
          return config;
        }

        return { singularName: config };
      })
      .filter(Boolean);

  const normalizedCollectionTypes = toSchemaDef(collectionTypes);
  const normalizedSingleTypes = toSchemaDef(singleTypes);

  return [...(normalizedCollectionTypes || []), ...(normalizedSingleTypes || [])];
};

const makeParentNodeName = (schemas, uid) => {
  const schema = getContentTypeSchema(schemas, uid);
  const {
    schema: { singularName, kind },
  } = schema;

  let nodeName = `Strapi_${_.snakeCase(singularName)}`;

  const isComponentType = !['collectionType', 'singleType'].includes(kind);

  if (isComponentType) {
    nodeName = `Strapi__Component_${_.snakeCase(_.replace(uid, '.', '_'))}`;
  }

  return _.toUpper(nodeName);
};

export {
  buildMapFromNodes,
  buildMapFromData,
  buildNodesToRemoveMap,
  getContentTypeSchema,
  getEndpoints,
  makeParentNodeName,
};
