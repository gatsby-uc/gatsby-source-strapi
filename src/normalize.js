const path = require(`path`)
const { createRemoteFileNode } = require(`gatsby-source-filesystem`)

const extractFields = async (
  apiURL,
  store,
  cache,
  createNode,
  createNodeId,
  touchNode,
  auth,
  item,
  useNamedImages
) => {
  if (item.hasOwnProperty('mime')) {
    // This allows us to run qraphql like:
    // ```strapiUploadFile {
    //   self {
    //     childImageSharp {
    // 			fluid(maxWidth: 300) {
    //       	src
    //       }
    //     }
    //   }
    // }```
    item[`self`] = item
  }
  for (const key of Object.keys(item)) {
    const field = item[key]
    if (Array.isArray(field)) {
      // add recursion to fetch nested strapi references
      await Promise.all(
        field.map(async f =>
          extractFields(
            apiURL,
            store,
            cache,
            createNode,
            createNodeId,
            touchNode,
            auth,
            f,
            useNamedImages
          )
        )
      )
    } else {
      // image fields have a mime property among other
      // maybe should find a better test
      if (field !== null && field.hasOwnProperty('mime')) {
        let fileNodeID
        // using field on the cache key for multiple image field
        const mediaDataCacheKey = `strapi-media-${item.id}-${key}`
        const cacheMediaData = await cache.get(mediaDataCacheKey)

        // If we have cached media data and it wasn't modified, reuse
        // previously created file node to not try to redownload
        if (cacheMediaData && field.updated_at === cacheMediaData.updated_at) {
          fileNodeID = cacheMediaData.fileNodeID
          touchNode({ nodeId: cacheMediaData.fileNodeID })
        }

        // If we don't have cached data, download the file
        if (!fileNodeID) {
          try {
            // full media url
            const source_url = `${field.url.startsWith('http') ? '' : apiURL}${
              field.url
            }`
            let remoteFileParams = {
              url: source_url,
              store,
              cache,
              createNode,
              createNodeId,
              auth,
            }
            if (useNamedImages) {
              remoteFileParams.name = path.parse(field.name).name
            }
            const fileNode = await createRemoteFileNode(remoteFileParams)

            // If we don't have cached data, download the file
            if (fileNode) {
              fileNodeID = fileNode.id

              await cache.set(mediaDataCacheKey, {
                fileNodeID,
                updated_at: field.updated_at,
              })
            }
          } catch (e) {
            // Ignore
          }
        }
        if (fileNodeID) {
          item[`${key}___NODE`] = fileNodeID
        }
      } else if (field !== null && typeof field === 'object') {
        extractFields(
          apiURL,
          store,
          cache,
          createNode,
          createNodeId,
          touchNode,
          auth,
          field,
          useNamedImages
        )
      }
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
  useNamedImages,
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
          item,
          useNamedImages
        )
      }
      return entity
    })
  )
