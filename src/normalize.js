const { createRemoteFileNode } = require(`gatsby-source-filesystem`)
const commonmark = require('commonmark')

const reader = new commonmark.Parser()

function markdownImages(options, type) {
  const typesToParse = options.typesToParse || {}
  const fieldsToParse = typesToParse[type] || []

  const shouldParseForImages = key => fieldsToParse.indexOf(key) > -1

  return {
    shouldParseForImages,
  }
}

const extractFields = async (
  apiURL,
  store,
  cache,
  createNode,
  touchNode,
  auth,
  item,
  options
) => {
  const { shouldParseForImages } = markdownImages(
    options.markdownImages,
    options.itemType
  )

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
            touchNode,
            auth,
            f,
            options
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
          touchNode,
          auth,
          field,
          options
        )
      } else if (field !== null && shouldParseForImages(key)) {
        // parse the markdown content
        const parsed = reader.parse(field)
        const walker = parsed.walker()
        let event, node

        while ((event = walker.next())) {
          node = event.node
          // process image nodes
          if (event.entering && node.type === 'image') {
            let fileNodeID, fileNodeBase
            const filePathname = node.destination

            // using filePathname on the cache key for multiple image field
            const mediaDataCacheKey = `strapi-media-${item.id}-${filePathname}`
            const cacheMediaData = await cache.get(mediaDataCacheKey)

            // If we have cached media data and it wasn't modified, reuse
            // previously created file node to not try to redownload
            if (cacheMediaData) {
              fileNodeID = cacheMediaData.fileNodeID
              fileNodeBase = cacheMediaData.fileNodeBase
              touchNode({ nodeId: cacheMediaData.fileNodeID })
            }

            if (!fileNodeID) {
              try {
                // full media url
                const source_url = `${
                  filePathname.startsWith('http') ? '' : apiURL
                }${filePathname}`

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
                  fileNodeBase = fileNode.base

                  await cache.set(mediaDataCacheKey, {
                    fileNodeID,
                    fileNodeBase,
                  })
                }
              } catch (e) {
                // Ignore
              }
            }
            if (fileNodeID) {
              // create an array of parsed and downloaded images as a new field
              if (!item[`${key}_images___NODE`]) {
                item[`${key}_images___NODE`] = []
              }
              item[`${key}_images___NODE`].push(fileNodeID)

              // replace filePathname with the newly created base
              // useful for future operations in Gatsby
              item[key] = item[key].replace(filePathname, fileNodeBase)
            }
          }
        }
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
  touchNode,
  jwtToken: auth,
  options,
}) =>
  Promise.all(
    entities.map(async (entity, i) => {
      const itemType = options.allTypes[i]

      for (let item of entity) {
        // loop item over fields
        await extractFields(
          apiURL,
          store,
          cache,
          createNode,
          touchNode,
          auth,
          item,
          {
            itemType,
            markdownImages: options.markdownImages,
          }
        )
      }
      return entity
    })
  )
