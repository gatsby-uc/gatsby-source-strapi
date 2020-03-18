const { createRemoteFileNode } = require(`gatsby-source-filesystem`)

// utils
const isImage = field => field.hasOwnProperty('mime')
const isImageOrImages = field => {
  if (Array.isArray(field)) {
    return field.some(f => isImage(f))
  }

  return isImage(field)
}

const extractFields = async (
  apiURL,
  store,
  cache,
  createNode,
  touchNode,
  auth,
  item
) => {
  for (const key of Object.keys(item)) {
    const field = item[key]

    if (Array.isArray(field) && !isImageOrImages(field)) {
      // add recursion to fetch nested strapi references
      await Promise.all(
        field.map(async f =>
          extractFields(apiURL, store, cache, createNode, touchNode, auth, f)
        )
      )

      return
    }

    // image fields have a mime property among other
    // maybe should find a better test
    if (field !== null && isImageOrImages(field)) {
      // item[`${key}___NODE`]
      const images = await Promise.all(
        (Array.isArray(field) ? field : [field]).map(async _field => {
          let fileNodeID
          // using field on the cache key for multiple image field
          const mediaDataCacheKey = `strapi-media-${item.id}-${key}-${
            _field.id
          }`
          const cacheMediaData = await cache.get(mediaDataCacheKey)

          // If we have cached media data and it wasn't modified, reuse
          // previously created file node to not try to redownload
          if (
            cacheMediaData &&
            _field.updated_at === cacheMediaData.updated_at
          ) {
            fileNodeID = cacheMediaData.fileNodeID
            touchNode({ nodeId: cacheMediaData.fileNodeID })
          }

          // If we don't have cached data, download the file
          if (!fileNodeID) {
            try {
              // full media url
              const source_url = `${
                _field.url.startsWith('http') ? '' : apiURL
              }${_field.url}`
              const fileNode = await createRemoteFileNode({
                url: source_url,
                store,
                cache,
                createNode,
                auth,
              })

              // If we don't have cached data, download the file
              if (fileNode) {
                fileNodeID = fileNode.id

                await cache.set(mediaDataCacheKey, {
                  fileNodeID,
                  updated_at: _field.updated_at,
                })
              }
            } catch (e) {
              // Ignore
              console.log(e)
            }
          }

          return fileNodeID
        })
      )

      if (images && images.length > 0) {
        item[`${key}___NODE`] = Array.isArray(field) ? images : images[0]
      }
    } else if (field !== null && typeof field === 'object') {
      extractFields(apiURL, store, cache, createNode, touchNode, auth, field)
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
          touchNode,
          auth,
          item
        )
      }
      return entity
    })
  )
