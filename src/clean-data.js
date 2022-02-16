import _ from 'lodash';

import { getContentTypeSchema } from './helpers';

const MEDIA_FIELDS = [
  'name',
  'alternativeText',
  'caption',
  'width',
  'height',
  'formats',
  'hash',
  'ext',
  'mime',
  'size',
  'url',
  'previewUrl',
  'createdAt',
  'updatedAt',
];

const restrictedFields = ['__component', `children`, `fields`, `internal`, `parent`];

/**
 * Removes the attribute key in the entire data.
 * @param {Object} attributes response from the API
 * @param {Object} currentSchema
 * @param {*} schemas
 * @returns
 */
export const cleanAttributes = (attributes, currentSchema, schemas) => {
  if (!attributes) {
    return null;
  }

  return Object.entries(attributes).reduce((acc, [name, value]) => {
    const attribute = currentSchema.schema.attributes[name];

    const attributeName = restrictedFields.includes(name) ? _.snakeCase(`strapi_${name}`) : name;

    if (!attribute?.type) {
      acc[attributeName] = value;

      return acc;
    }

    if (!value) {
      acc[attributeName] = value;

      return acc;
    }

    // Changing the format in order to extract images from the richtext field
    // NOTE: We could add an option to disable the extraction
    if (attribute.type === 'richtext') {
      return {
        ...acc,
        [attributeName]: {
          data: value,
          medias: [],
        },
      };
    }

    if (attribute.type === 'dynamiczone') {
      return {
        ...acc,
        [attributeName]: value.map((v) => {
          const compoSchema = getContentTypeSchema(schemas, v.__component);

          return cleanAttributes(v, compoSchema, schemas);
        }),
      };
    }

    if (attribute.type === 'component') {
      const isRepeatable = attribute.repeatable;
      const compoSchema = getContentTypeSchema(schemas, attribute.component);

      if (isRepeatable) {
        return {
          ...acc,
          [attributeName]: value.map((v) => {
            return cleanAttributes(v, compoSchema, schemas);
          }),
        };
      }

      return {
        ...acc,
        [attributeName]: cleanAttributes(value, compoSchema, schemas),
      };
    }

    if (attribute.type === 'media') {
      if (Array.isArray(value?.data)) {
        return {
          ...acc,
          [attributeName]: value.data
            ? value.data.map(({ id, attributes }) => ({
                id,
                ..._.pick(attributes, MEDIA_FIELDS),
              }))
            : null,
        };
      }

      return {
        ...acc,
        [attributeName]: value.data
          ? {
              id: value.data.id,
              ..._.pick(value.data.attributes, MEDIA_FIELDS),
            }
          : null,
      };
    }

    if (attribute.type === 'relation') {
      const relationSchema = getContentTypeSchema(schemas, attribute.target);

      if (Array.isArray(value?.data)) {
        return {
          ...acc,
          [attributeName]: value.data.map(({ id, attributes }) =>
            cleanAttributes({ id, ...attributes }, relationSchema, schemas)
          ),
        };
      }

      return {
        ...acc,
        [attributeName]: cleanAttributes(
          value.data ? { id: value.data.id, ...value.data.attributes } : null,
          relationSchema,
          schemas
        ),
      };
    }

    acc[attributeName] = value;

    return acc;
  }, {});
};

/**
 * Transform v4 API response to the v3 format, remove data and attributes key
 * Transform richtext field to prepare media extraction
 * @param {Object} data
 * @param {Object} ctx
 * @returns {Object}
 */
export const cleanData = ({ id, attributes, ...rest }, ctx) => {
  const { schemas, contentTypeUid } = ctx;
  const currentContentTypeSchema = getContentTypeSchema(schemas, contentTypeUid);

  return {
    id,
    ...rest,
    ...cleanAttributes(attributes, currentContentTypeSchema, schemas),
  };
};
