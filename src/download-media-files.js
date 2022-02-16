import { Parser } from 'commonmark';
import qs from 'qs';
import { createRemoteFileNode } from 'gatsby-source-filesystem';
import { getContentTypeSchema } from './helpers';
import createInstance from './axiosInstance';

const reader = new Parser();

/**
 * Retrieves all medias from the markdown
 * @param {String} text
 * @param {String} apiURL
 * @returns {Object[]}
 */
const extractFiles = (text, apiURL) => {
  const files = [];
  // parse the markdown content
  const parsed = reader.parse(text);
  const walker = parsed.walker();
  let event, node;

  while ((event = walker.next())) {
    node = event.node;
    // process image nodes
    if (event.entering && node.type === 'image') {
      let destination;
      const alternativeText = node.firstChild?.literal || '';

      if (/^\//.test(node.destination)) {
        destination = `${apiURL}${node.destination}`;
      } else if (/^http/i.test(node.destination)) {
        destination = node.destination;
      }

      if (destination) {
        files.push({ url: destination, src: node.destination, alternativeText });
      }
    }
  }

  return files.filter(Boolean);
};

/**
 * Download file and create node
 * @param {Object} file
 * @param {Object} ctx
 * @returns {String} node Id
 */
export const downloadFile = async (file, ctx) => {
  const {
    actions: { createNode, touchNode },
    cache,
    createNodeId,
    getNode,
    store,
    strapiConfig,
  } = ctx;
  const { apiURL } = strapiConfig;

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
};

/**
 * Extract images and create remote nodes for images in all fields.
 * @param {Object} item the entity
 * @param {Object} ctx gatsby function
 * @param {String} uid the main schema uid
 */
const extractImages = async (item, ctx, uid) => {
  const { schemas, strapiConfig } = ctx;
  const axiosInstance = createInstance(strapiConfig);
  const schema = getContentTypeSchema(schemas, uid);
  const { apiURL } = strapiConfig;

  for (const attributeName of Object.keys(item)) {
    const value = item[attributeName];

    const attribute = schema.schema.attributes[attributeName];

    const type = attribute?.type || null;

    // TODO maybe extract images for relations but at some point it causes issues
    // if (attribute?.type === 'relation' ) {
    //   return extractImages(value, ctx, attribute.target);
    // }

    if (value && type) {
      if (type === 'richtext') {
        const extractedFiles = extractFiles(value.data, apiURL);

        const files = await Promise.all(
          extractedFiles.map(async ({ url }) => {
            const filters = qs.stringify(
              {
                filters: { url: url.replace(`${apiURL}`, '') },
              },
              { encode: false }
            );

            const { data } = await axiosInstance.get(`/api/upload/files?${filters}`);
            const file = data[0];

            if (!file) {
              return null;
            }

            const fileNodeID = await downloadFile(file, ctx);

            return { fileNodeID, file };
          })
        );

        const fileNodes = files.filter(Boolean);

        for (let i = 0; i < fileNodes.length; i++) {
          item[attributeName].medias.push({
            alternativeText: extractedFiles[i].alternativeText,
            url: extractedFiles[i].url,
            src: extractedFiles[i].src,
            localFile___NODE: fileNodes[i].fileNodeID,
            file: fileNodes[i].file,
          });
        }
      }

      if (type === 'dynamiczone') {
        for (const element of value) {
          await extractImages(element, ctx, element.strapi_component);
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
            const fileNodeID = await downloadFile(file, ctx);

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
