const { createRemoteFileNode } = require(`gatsby-source-filesystem`)

const isImage = obj => {
  // image fields have a mime property among other
  // maybe should find a better test
  return obj && Object.prototype.hasOwnProperty.call(obj, 'mime')
}

const isObject = obj => {
  return obj && Object.prototype.toString.apply(obj) === '[object Object]'
}

const extractFields = async (
  apiURL,
  store,
  cache,
  createNode,
  createNodeId,
  touchNode,
  auth,
  item
) => {
  if (isImage(item)) {
    let fileNodeID
    // using field on the cache key for multiple image field
    const mediaDataCacheKey = `strapi-media-${item.id}`
    const cacheMediaData = await cache.get(mediaDataCacheKey)
    const itemUpdatedAt = item.updatedAt || item.updated_at

    // If we have cached media data and it wasn't modified, reuse
    // previously created file node to not try to redownload
    if (cacheMediaData && itemUpdatedAt === cacheMediaData.updatedAt) {
      fileNodeID = cacheMediaData.fileNodeID
      touchNode({ nodeId: cacheMediaData.fileNodeID })
    }

    // If we don't have cached data, download the file
    if (!fileNodeID) {
      try {
        // full media url
        const source_url = `${item.url.startsWith('http') ? '' : apiURL}${
          item.url
        }`
        const fileNode = await createRemoteFileNode({
          url: source_url,
          store,
          cache,
          createNode,
          createNodeId,
          auth,
          name: item.hash,
          ext: item.ext,
        })

        // If we don't have cached data, download the file
        if (fileNode) {
          fileNodeID = fileNode.id

          await cache.set(mediaDataCacheKey, {
            fileNodeID,
            updatedAt: itemUpdatedAt,
          })
        }
      } catch (e) {
        // Ignore
      }
    }

    if (fileNodeID) {
      item.localFile___NODE = fileNodeID
    }
  }

  // keep looping for extra fields such as formats
  if (Array.isArray(item)) {
    for (const key of item) {
      await extractFields(
        apiURL,
        store,
        cache,
        createNode,
        createNodeId,
        touchNode,
        auth,
        key
      )
    }
  } else if (isObject(item)) {
    for (const key of Object.keys(item)) {
      const field = item[key]

      await extractFields(
        apiURL,
        store,
        cache,
        createNode,
        createNodeId,
        touchNode,
        auth,
        field
      )
    }
  }
}

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
}) =>
  Promise.all(
    entities.map(async entity => {
      for (let item of entity) {
        // loop item over fields
        await extractFields(
          apiURL,
          store,
          cache,
          createNode,
          createNodeId,
          touchNode,
          auth,
          item
        )
      }
      return entity
    })
  )
