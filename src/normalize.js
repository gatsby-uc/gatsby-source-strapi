import { has, isObject } from 'lodash/fp';
import { createRemoteFileNode } from 'gatsby-source-filesystem';

const isImage = has('mime');
const getUpdatedAt = (image) => image.updatedAt || image.updated_at;

const extractImage = async (image, context) => {
  const { apiURL, store, cache, createNode, createNodeId, touchNode, auth } = context;

  let fileNodeID;

  // using field on the cache key for multiple image field
  const mediaDataCacheKey = `strapi-media-${image.id}`;
  const cacheMediaData = await cache.get(mediaDataCacheKey);

  // If we have cached media data and it wasn't modified, reuse
  // previously created file node to not try to redownload
  if (cacheMediaData && getUpdatedAt(image) === cacheMediaData.updatedAt) {
    fileNodeID = cacheMediaData.fileNodeID;
    touchNode({ nodeId: fileNodeID });
  }

  // If we don't have cached data, download the file
  if (!fileNodeID) {
    // full media url
    const source_url = `${image.url.startsWith('http') ? '' : apiURL}${image.url}`;
    const fileNode = await createRemoteFileNode({
      url: source_url,
      store,
      cache,
      createNode,
      createNodeId,
      auth,
      ext: image.ext,
      name: image.name,
    });

    if (fileNode) {
      fileNodeID = fileNode.id;

      await cache.set(mediaDataCacheKey, {
        fileNodeID,
        updatedAt: getUpdatedAt(image),
      });
    }
  }

  if (fileNodeID) {
    image.localFile___NODE = fileNodeID;
  }
};

const extractFields = async (item, context) => {
  if (isImage(item)) {
    return extractImage(item, context);
  }

  if (Array.isArray(item)) {
    for (const element of item) {
      await extractFields(element, context);
    }

    return;
  }

  if (isObject(item)) {
    for (const key in item) {
      await extractFields(item[key], context);
    }

    return;
  }
};

// Downloads media from image type fields
exports.downloadMediaFiles = async ({
  entities,
  apiURL,
  store,
  cache,
  createNode,
  createNodeId,
  touchNode,
  jwtToken: auth,
}) => {
  const context = { apiURL, store, cache, createNode, createNodeId, touchNode, auth };

  const extractEntity = async (entity) => {
    for (let item of entity) {
      await extractFields(item, context);
    }

    return entity;
  };

  return Promise.all(entities.map((entity) => extractEntity(entity)));
};
