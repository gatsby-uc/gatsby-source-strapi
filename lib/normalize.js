"use strict";

var _fp = require("lodash/fp");

var _gatsbySourceFilesystem = require("gatsby-source-filesystem");

const isImage = (0, _fp.has)('mime');

const getUpdatedAt = image => image.updatedAt || image.updated_at;

const extractImage = async (image, ctx) => {
  const {
    apiURL,
    store,
    cache,
    createNode,
    createNodeId,
    touchNode,
    getNode,
    auth
  } = ctx;
  let fileNodeID; // using field on the cache key for multiple image field

  const mediaDataCacheKey = `strapi-media-${image.id}`;
  const cacheMediaData = await cache.get(mediaDataCacheKey); // If we have cached media data and it wasn't modified, reuse
  // previously created file node to not try to redownload

  if (cacheMediaData && getUpdatedAt(image) === cacheMediaData.updatedAt) {
    fileNodeID = cacheMediaData.fileNodeID;
    touchNode(getNode(fileNodeID));
  } // If we don't have cached data, download the file


  if (!fileNodeID) {
    // full media url
    const source_url = `${image.url.startsWith('http') ? '' : apiURL}${image.url}`;
    const fileNode = await (0, _gatsbySourceFilesystem.createRemoteFileNode)({
      url: source_url,
      store,
      cache,
      createNode,
      createNodeId,
      auth
    });

    if (fileNode) {
      fileNodeID = fileNode.id;
      await cache.set(mediaDataCacheKey, {
        fileNodeID,
        updatedAt: getUpdatedAt(image)
      });
    }
  }

  if (fileNodeID) {
    image.localFile___NODE = fileNodeID;
  }
};

const extractFields = async (item, ctx) => {
  if (isImage(item)) {
    return extractImage(item, ctx);
  }

  if (Array.isArray(item)) {
    for (const element of item) {
      await extractFields(element, ctx);
    }

    return;
  }

  if ((0, _fp.isObject)(item)) {
    for (const key in item) {
      await extractFields(item[key], ctx);
    }

    return;
  }
};

exports.isDynamicZone = node => {
  // Dynamic zones are always arrays
  if (Array.isArray(node)) {
    return node.some(nodeItem => {
      // The object is a dynamic zone if it has a strapi_component key
      return (0, _fp.has)('strapi_component', nodeItem);
    });
  }

  return false;
}; // Downloads media from image type fields


exports.downloadMediaFiles = async (entities, ctx) => {
  return Promise.all(entities.map(entity => extractFields(entity, ctx)));
};