import _ from 'lodash';

const buildMapFromNodes = (nodes) => {
  return nodes.reduce((acc, current) => {
    const { internal, strapi_id, id } = current;

    if (internal?.type && strapi_id && id) {
      if (acc[internal.type]) {
        acc[internal.type] = [
          ...acc[internal.type],
          {
            strapi_id,
            id,
          },
        ];
      } else {
        acc[internal.type] = [
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

    const nodeType = `Strapi${_.capitalize(singularName)}`;

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
    const currentNodes = newNodes[name] || [];

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
  const types = [...(collectionTypes || []), ...(singleTypes || [])];

  const endpoints = schemas
    .filter(
      ({ schema }) =>
        types.findIndex(({ singularName }) => singularName === schema.singularName) !== -1
    )
    .map(({ schema: { kind, singularName, pluralName }, uid }) => {
      const options = types.find((config) => config.singularName === singularName);
      const { queryParams, queryLimit } = options;

      if (kind === 'singleType') {
        return {
          singularName,
          kind,
          uid,
          endpoint: `/api/${singularName}`,
          queryParams: queryParams || {
            populate: '*',
          },
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
      };
    });

  return endpoints;
};

export {
  buildMapFromNodes,
  buildMapFromData,
  buildNodesToRemoveMap,
  getContentTypeSchema,
  getEndpoints,
};
