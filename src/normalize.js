const { createRemoteFileNode } = require(`gatsby-source-filesystem`)

const extractFields = async ({
  apiURL,
  store,
  cache,
  createNode,
  touchNode,
  auth,
  item,
}) => {
  for (const key of Object.keys(item)) {
    const field = item[key]
    // handle multiple files
    if (Array.isArray(field)) {
      if (field && field[0] && field[0].hasOwnProperty('mime')) {
        await Promise.all(
          field.map(async f =>
            extractFile({
              apiURL,
              store,
              cache,
              createNode,
              touchNode,
              auth,
              item,
              key,
              file: f,
            })
          )
        )
      }
      // add recursion to fetch nested strapi references
      await Promise.all(
        field.map(async f =>
          extractFields({
            apiURL,
            store,
            cache,
            createNode,
            touchNode,
            auth,
            item: f,
          })
        )
      )
    } else {
      // file fields have a mime property among other
      // maybe should find a better test
      if (field !== null && field.hasOwnProperty('mime')) {
        await extractFile({
          apiURL,
          store,
          cache,
          createNode,
          touchNode,
          auth,
          item,
          key,
          file: field,
        })
      }
    }
  }
}

const extractFile = async ({
  apiURL,
  store,
  cache,
  createNode,
  touchNode,
  auth,
  item,
  key,
  file,
}) => {
  let fileNodeID
  // using field on the cache key for multiple image field
  const mediaDataCacheKey = `strapi-media-${file.id}-${key}`
  const cacheMediaData = await cache.get(mediaDataCacheKey)

  // If we have cached media data and it wasn't modified, reuse
  // previously created file node to not try to redownload
  if (cacheMediaData && file.updatedAt === cacheMediaData.updatedAt) {
    fileNodeID = cacheMediaData.fileNodeID
    touchNode({ nodeId: cacheMediaData.fileNodeID })
  }

  // If we don't have cached data, download the file
  if (!fileNodeID) {
    try {
      // full media url
      const source_url = `${file.url.startsWith('http') ? '' : apiURL}${
        file.url
      }`

      const fileNode = await createRemoteFileNode({
        url: source_url,
        store,
        cache,
        createNode,
        auth,
        parentNodeId: item.id,
      })

      // If we don't have cached data, download the file
      if (fileNode) {
        fileNodeID = fileNode.id

        await cache.set(mediaDataCacheKey, {
          fileNodeID,
          modified: file.updatedAt,
        })
      }
    } catch (e) {
      // Ignore
    }
  }
  file.localFile___NODE = fileNodeID
}

// Downloads media from image type fields
exports.downloadMediaFiles = async ({
  entities,
  apiURL,
  store,
  cache,
  createNode,
  touchNode,
  jwtToken: auth,
}) =>
  Promise.all(
    entities.map(async entity => {
      for (let item of entity) {
        // loop item over fields
        await extractFields({
          apiURL,
          store,
          cache,
          createNode,
          touchNode,
          auth,
          item,
        })
      }
      return entity
    })
  )
