const { createRemoteFileNode } = require(`gatsby-source-filesystem`);
const { getContentTypeSchema } = require('./helpers');
const _ = require('lodash');

const prepareJSONNode = (json, ctx) => {
  const { createContentDigest, createNodeId, parentNode, attributeName } = ctx;

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
      contentDigest: createContentDigest(json),
    },
  };

  return JSONNode;
};

const prepareRelationNode = (relation, ctx) => {
  const { schemas, createNodeId, createContentDigest, parentNode, targetSchemaUid } = ctx;

  const targetSchema = getContentTypeSchema(schemas, targetSchemaUid);
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
      contentDigest: createContentDigest(relation),
    },
  };

  return node;
};

const prepareTextNode = (text, ctx) => {
  const { createContentDigest, createNodeId, parentNode, attributeName } = ctx;
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
      contentDigest: createContentDigest(text),
    },
  };

  return textNode;
};

export const createNodes = (entity, nodeType, ctx, uid) => {
  const nodes = [];

  const { schemas, createNodeId, createContentDigest, getNode } = ctx;

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

  const schema = getContentTypeSchema(schemas, uid);

  for (const attributeName of Object.keys(entity)) {
    const value = entity[attributeName];

    const attribute = schema.schema.attributes[attributeName];
    const type = _.get(attribute, 'type', null);

    if (value) {
      // Add support for dynamic zones
      if (type === 'dynamiczone') {
        value.forEach((v) => {
          const componentSchema = getContentTypeSchema(schemas, v.strapiComponent);
          const componentNode = `StrapiComponent${_.upperFirst(_.camelCase(componentSchema.uid))}`;

          const valueNodes = _.flatten(createNodes(v, componentNode, ctx, v.strapiComponent));
          const compoNodeIds = valueNodes
            .filter(({ internal }) => internal.type === componentNode)
            .map(({ id }) => id);

          entity[`${attributeName}___NODE`] = [
            ...(entity[`${attributeName}___NODE`] || []),
            ...compoNodeIds,
          ];

          valueNodes.forEach((n) => {
            nodes.push(n);
          });
        });

        delete entity[attributeName];
      }

      if (type === 'relation') {
        // Create type for the first level of relations, otherwise the user should fetch the other content type
        // to link them
        const config = {
          schemas,
          createContentDigest,
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
              nodes.push(node);
            }
          });
        } else {
          const relationNode = prepareRelationNode(value, config);

          entity[`${attributeName}___NODE`] = relationNode.id;

          const relationNodeToCreate = getNode(relationNode.id);

          if (!relationNodeToCreate) {
            nodes.push(relationNode);
          }
        }
        delete entity[attributeName];
      }

      // Apply transformations to components: markdown, json...
      if (type === 'component') {
        const componentSchema = getContentTypeSchema(schemas, attribute.component);
        const componentNode = `StrapiComponent${_.upperFirst(_.camelCase(componentSchema.uid))}`;

        if (attribute.repeatable) {
          const compoNodes = _.flatten(
            value.map((v) => createNodes(v, componentNode, ctx, attribute.component))
          );

          entity[`${attributeName}___NODE`] = compoNodes
            .filter(({ internal }) => internal.type === componentNode)
            .map(({ id }) => id);

          compoNodes.forEach((node) => {
            nodes.push(node);
          });
        } else {
          const compoNodes = _.flatten(createNodes(value, componentNode, ctx, attribute.component));

          entity[`${attributeName}___NODE`] = compoNodes.filter(
            ({ internal }) => internal.type === componentNode
          )[0].id;

          compoNodes.forEach((node) => {
            nodes.push(node);
          });
        }

        delete entity[attributeName];
      }

      // Create nodes for richtext in order to make the markdown-remark plugin works
      if (type === 'richtext') {
        const textNode = prepareTextNode(value, {
          createContentDigest,
          createNodeId,
          parentNode: entryNode,
          attributeName,
        });

        entryNode.children = entryNode.children.concat([textNode.id]);

        entity[`${attributeName}___NODE`] = textNode.id;
        delete entity[attributeName];

        nodes.push(textNode);
      }

      // Create nodes for JSON fields in order to be able to query each field in GraphiQL
      // We can remove this if not pertinent
      if (type === 'json') {
        const JSONNode = prepareJSONNode(value, {
          createContentDigest,
          createNodeId,
          parentNode: entryNode,
          attributeName,
        });

        entryNode.children = entryNode.children.concat([JSONNode.id]);

        entity[`${attributeName}___NODE`] = JSONNode.id;
        delete entity[attributeName];

        nodes.push(JSONNode);
      }
    }
  }

  entryNode = {
    ...entity,
    ...entryNode,
  };

  nodes.push(entryNode);

  return nodes;
};

const extractImages = async (item, ctx, uid) => {
  const {
    actions: { createNode, touchNode },
    cache,
    schemas,
    createNodeId,
    getNode,
    store,
    strapiConfig: { apiURL },
  } = ctx;

  const schema = getContentTypeSchema(schemas, uid);

  for (const attributeName of Object.keys(item)) {
    const value = item[attributeName];

    const attribute = schema.schema.attributes[attributeName];

    const type = attribute?.type || null;

    // TODO maybe extract images for relations but at some point it causes issues
    // if (attribute?.type === 'relation' ) {
    //   return extractImages(value, ctx, attribute.target);
    // }

    // Always extract images for components

    if (value && type) {
      // TODO check recursivity
      if (type === 'dynamiczone') {
        for (const element of value) {
          await extractImages(element, ctx, element.strapiComponent);
        }
      }

      if (type === 'component') {
        if (attribute.repeatable) {
          for (const element of value) {
            await extractImages(element, ctx, attribute.component);
          }
        } else {
          await extractImages(value, ctx, attribute.component);
        }
      }

      if (type === 'media') {
        const isMultiple = attribute.multiple;
        const imagesField = isMultiple ? value : [value];

        // Dowload all files
        const files = await Promise.all(
          imagesField.map(async (file) => {
            let fileNodeID;

            const mediaDataCacheKey = `strapi-media-${file.id}`;
            const cacheMediaData = await cache.get(mediaDataCacheKey);

            // If we have cached media data and it wasn't modified, reuse
            // previously created file node to not try to redownload
            if (cacheMediaData && cacheMediaData.updatedAt === file.updatedAt) {
              fileNodeID = cacheMediaData.fileNodeID;
              touchNode(getNode(fileNodeID));
            }

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

                  await cache.set(mediaDataCacheKey, {
                    fileNodeID,
                    updatedAt: file.updatedAt,
                  });
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
          if (isMultiple) {
            for (let i = 0; i < value.length; i++) {
              item[attributeName][i][`localFile___NODE`] = images[i];
            }
          } else {
            item[attributeName][`localFile___NODE`] = isMultiple ? images : images[0];
          }
        }
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
