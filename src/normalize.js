import { has, isObject } from 'lodash/fp';
import { createRemoteFileNode } from 'gatsby-source-filesystem';
import { merge, cloneDeep, size } from 'lodash';

const isImage = has('mime');
const hasData = has('data');
const hasId = has('id');
const hasAttributes = has('attributes');
const getUpdatedAt = (image) => image.updatedAt || image.updated_at;

const extractImage = async (image, ctx) => {
  const { apiURL, store, cache, createNode, createNodeId, touchNode, getNode, auth } = ctx;

  let fileNodeID;

  // using field on the cache key for multiple image field
  const mediaDataCacheKey = `strapi-media-${image.id}`;
  const cacheMediaData = await cache.get(mediaDataCacheKey);

  // If we have cached media data and it wasn't modified, reuse
  // previously created file node to not try to redownload
  if (cacheMediaData && getUpdatedAt(image) === cacheMediaData.updatedAt) {
    fileNodeID = cacheMediaData.fileNodeID;
    touchNode(getNode(fileNodeID));
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
  return image;
};

const flatMapAttributes = (item) => {
  const attributes = cloneDeep(item.attributes);
  delete item.attributes;
  return merge(item, attributes);
};

const extractFields = async (item, ctx) => {
  if (isImage(item)) {
    return await extractImage(item, ctx);
  }
  if (Array.isArray(item)) {
    return Promise.all(item.map((entity) => extractFields(entity, ctx)));
  }

  if (isObject(item)) {
    if (hasData(item) && size(item) === 1) {
      return await extractFields(item.data, ctx);
    }
    if (hasId(item) && hasAttributes(item) && size(item) === 2) {
      return await extractFields(flatMapAttributes(item), ctx);
    }

    var newObject = {};
    for (const key in item) {
      newObject[key] = await extractFields(item[key], ctx);
    }
    return newObject;
  }

  return item;
};

exports.isDynamicZone = (node) => {
  // Dynamic zones are always arrays
  if (Array.isArray(node)) {
    return node.some((nodeItem) => {
      // The object is a dynamic zone if it has a strapi_component key
      return has('strapi_component', nodeItem);
    });
  }
  return false;
};

// Downloads media from image type fields
exports.downloadMediaFiles = async (entities, ctx) => {
  return Promise.all(entities.map((entity) => extractFields(entity, ctx)));
};
