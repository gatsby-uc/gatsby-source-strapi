const { createRemoteFileNode } = require(`gatsby-source-filesystem`);
const { getContentTypeSchema } = require('./helpers');
const _ = require('lodash');

const prepareJSONNode = (json, ctx) => {
  const { createNodeId, parentNode, attributeName } = ctx;

  const jsonNodeId = createNodeId(`${parentNode.strapi_id}-${attributeName}-JSONNode`);

  const JSONNode = {
    ...(_.isPlainObject(json) ? { ...json } : { strapi_json_value: json }),
    id: jsonNodeId,
    parent: parentNode.id,
    children: [],
    internal: {
      type: _.camelCase(`${parentNode.internal.type}-${attributeName}-JSONNode`),
      mediaType: `application/json`,
      content: JSON.stringify(json),
      contentDigest: parentNode.updatedAt || new Date().toISOString(),
    },
  };

  return JSONNode;
};

const prepareRelationNode = (relation, ctx) => {
  const { contentTypesSchemas, createNodeId, parentNode, targetSchemaUid } = ctx;

  const targetSchema = getContentTypeSchema(contentTypesSchemas, targetSchemaUid);
  const {
    schema: { singularName },
  } = targetSchema;

  const relationNodeId = createNodeId(`Strapi${_.capitalize(singularName)}-${relation.id}`);
  const node = {
    ...relation,
    id: relationNodeId,
    strapi_id: relation.id,
    parent: parentNode.id,
    children: [],
    internal: {
      type: `Strapi${_.capitalize(singularName)}`,
      content: JSON.stringify(relation),
      contentDigest: relation.updatedAt || parentNode.updatedAt,
    },
  };

  return node;
};

const prepareTextNode = (text, ctx) => {
  const { createNodeId, parentNode, attributeName } = ctx;
  const textNodeId = createNodeId(`${parentNode.strapi_id}-${attributeName}-TextNode`);

  const textNode = {
    id: textNodeId,
    parent: parentNode.id,
    children: [],
    [attributeName]: text,
    internal: {
      type: _.camelCase(`${parentNode.internal.type}-${attributeName}-TextNode`),
      mediaType: `text/markdown`,
      content: text,
      contentDigest: parentNode.updatedAt || new Date().toISOString(),
    },
  };

  return textNode;
};

export const createNodes = (entity, nodeType, ctx, uid) => {
  const nodes = [];

  const {
    actions: { createNode },
    contentTypesSchemas,
    createNodeId,
    createContentDigest,
    getNode,
  } = ctx;

  let entryNode = {
    id: createNodeId(`${nodeType}-${entity.id}`),
    strapi_id: entity.id,
    parent: null,
    children: [],
    internal: {
      type: nodeType,
      content: JSON.stringify(entity),
      contentDigest: createContentDigest(entity),
    },
  };

  const schema = getContentTypeSchema(contentTypesSchemas, uid);

  for (const attributeName of Object.keys(entity)) {
    const value = entity[attributeName];

    const attribute = schema.schema.attributes[attributeName];

    if (attribute?.type === 'relation' && value) {
      const config = {
        contentTypesSchemas,
        createNodeId,
        parentNode: entryNode,
        parentNodeType: nodeType,
        attributeName,
        targetSchemaUid: attribute.target,
      };
      if (Array.isArray(value)) {
        const relationNodes = value.map((relation) => prepareRelationNode(relation, config));
        entity[`${attributeName}___NODE`] = relationNodes.map(({ id }) => id);

        relationNodes.forEach((node) => {
          if (!getNode(node.id)) {
            nodes.push(createNode(node));
          }
        });
      } else {
        const relationNode = prepareRelationNode(value, config);

        entity[`${attributeName}___NODE`] = relationNode.id;

        if (!getNode(relationNode.id)) {
          nodes.push(createNode(relationNode));
        }
      }
      delete entity[attributeName];
    }

    if (attribute?.type === 'richtext' && value) {
      const textNode = prepareTextNode(value, {
        createNodeId,
        parentNode: entryNode,
        attributeName,
      });

      entryNode.children = entryNode.children.concat([textNode.id]);

      entity[`${attributeName}___NODE`] = textNode.id;
      delete entity[attributeName];

      if (!getNode()) {
        nodes.push(createNode(textNode));
      }
    }

    if (attribute?.type === 'json' && value) {
      const JSONNode = prepareJSONNode(value, {
        createNodeId,
        parentNode: entryNode,
        attributeName,
      });

      entryNode.children = entryNode.children.concat([JSONNode.id]);

      entity[`${attributeName}___NODE`] = JSONNode.id;
      delete entity[attributeName];

      nodes.push(createNode(JSONNode));
    }
  }

  entryNode = {
    ...entity,
    ...entryNode,
  };

  nodes.push(createNode(entryNode));

  return nodes;
};

// TODO components and DZ
const extractImages = async (item, ctx, uid) => {
  const {
    actions: { createNode },
    cache,
    contentTypesSchemas,
    createNodeId,
    store,
    strapiConfig: { apiURL },
  } = ctx;

  const schema = getContentTypeSchema(contentTypesSchemas, uid);

  for (const attributeName of Object.keys(item)) {
    const value = item[attributeName];

    const attribute = schema.schema.attributes[attributeName];

    if (attribute?.type === 'relation' && value) {
      return extractImages(value, ctx, attribute.target);
    }

    if (attribute?.type === 'media' && value) {
      const isMultiple = attribute.multiple;
      const imagesField = isMultiple ? value : [value];

      // Dowload all files
      const files = await Promise.all(
        imagesField.map(async (file) => {
          let fileNodeID;

          // For now always download the file
          if (!fileNodeID) {
            try {
              // full media url
              const source_url = `${file.url.startsWith('http') ? '' : apiURL}${file.url}`;
              const fileNode = await createRemoteFileNode({
                url: source_url,
                store,
                cache,
                createNode,
                createNodeId,
              });

              if (fileNode) {
                fileNodeID = fileNode.id;
              }
            } catch (e) {
              // Ignore
              console.log('err', e);
            }
          }

          return fileNodeID;
        })
      );

      const images = files.filter((fileNodeID) => fileNodeID);

      if (images && images.length > 0) {
        // item[attributeName] = isMultiple ? images : images[0];
        // Here 2 nodes will be resolved by the same GQL field
        // item[`${attributeName}___NODE`] = isMultiple ? images : images[0];

        // Foreign key
        item[attributeName][`localFile___NODE`] = isMultiple ? images : images[0];
        // Delete the other one
        // delete item[attributeName];
      }
    }
  }
};

// Downloads media from image type fields
export const downloadMediaFiles = async (entities, ctx, contentTypeUid) =>
  Promise.all(
    entities.map(async (entity) => {
      await extractImages(entity, ctx, contentTypeUid);

      return entity;
    })
  );
