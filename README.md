# gatsby-source-strapi

Source plugin for pulling documents into Gatsby from a Strapi API.

> ⚠️ This version of `gatsby-source-strapi` is only compatible with Strapi v4.

<details>
<summary><strong>Table of contents</strong></summary>

- [gatsby-source-strapi](#gatsby-source-strapi)
  - [Install](#installing-the-plugin)
    - [Basic usage](#basic-usage)
    - [Advanced usage](#advanced-usage)
  - [Restrictions and limitations](#restrictions-and-limitations)

</details>

## Installing the plugin

```shell
# Using Yarn
yarn add gatsby-source-strapi

# Or using NPM
npm install --save gatsby-source-strapi
```

## Setting up the plugin

You can enable and configure this plugin in your `gatsby-config.js` file.

### Basic usage

First, you need to configure the `STRAPI_API_URL` and the `STRAPI_TOKEN` environment variables. We recommend using [`dotenv`][https://github.com/motdotla/dotenv] to expose these variables.

> Make sure to create a full-access API TOKEN in Strapi

**Path:** `./.env.development`

```sh
STRAPI_API_URL=http://localhost:1337
STRAPI_TOKEN=<my-development-api-token-for-gatsby>
```

**Path:** `./gatsby.config.js`

```javascript
require('dotenv').config({
  path: `.env.${process.env.NODE_ENV}`,
});

const strapiConfig = {
  apiURL: process.env.STRAPI_API_URL,
  accessToken: process.env.STRAPI_TOKEN,
  collectionTypes: ['article', 'company', 'author'],
  singleTypes: [],
};

module.exports = {
  plugins: [
    {
      resolve: `gatsby-source-strapi`,
      options: strapiConfig,
    },
  ],
};
```

### Advanced usage

#### Deep queries populate

```javascript
const strapiConfig = {
  // ...
  collectionTypes: [
    {
      singularName: 'article',
      queryParams: {
        // Populate media and relations
        // Make sure to not specify the fields key so the api always returns the updatedAt
        populate: {
          image: '*',
          images: '*',
          author: {
            populate: {
              avatar: '*',
              company: {
                populate: {
                  image: '*',
                },
              },
            },
          },
        },
      },
    },
  ],
  // ...
};
```

#### Draft content

Strapi now supports [Draft and publish](https://strapi.io/documentation/developer-docs/latest/concepts/draft-and-publish.html#draft-and-publish), which allows you to save your content as a draft and publish it later. By default, this plugin will only fetch the published content.

But you may want to fetch unpublished content in Gatsby as well. To do so, find a content type that has draft & publish enabled, and add an entity definition object to your config. Then, use the query string option to specify the [publication state](https://strapi.io/documentation/developer-docs/latest/developer-resources/content-api/content-api.html#publication-state) API parameter.

**Path:** `./gatsby.config.js`

```javascript
const strapiConfig = {
  // ...
  collectionTypes: [
    {
      singularName: 'article',
      queryParams: {
        publicationState: 'preview',
        populate: {
          category: { populate: '*' },
          cover: '*',
          blocks: {
            populate: '*',
          },
        },
      },
    },
  ],
  // ...
};
```

Then in your GraphQL query you should be able to display published content by using the following query:

```graphql
{
  allStrapiArticle(filter: { publishedAt: { ne: null } }) {
    nodes {
      id
    }
  }
}
`
```

#### Image optimisation

TODO

<!-- #### Internationalization support

Strapi now supports [internationalization](https://strapi.io/documentation/developer-docs/latest/development/plugins/i18n.html#installation). But by default, this plugin will only fetch data in the default locale of your Strapi app. If your content types are available in different locales, you can also pass an entity definition object to specify the locale you want to fetch for a content type. Use the `all` value to get all available locales on a collection type. -->

## Restrictions and limitations

This plugin has several limitations, please be aware of these:

1. At the moment, fields that do not have at least one populated instance will not be created in the GraphQL schema. This can break your site when field values get removed. You may workaround with an extra content entry with all fields filled out.

2. When using relational fields, be aware that this source plugin will automatically create the reverse reference for the first level of relation. It is advised to query both `articles` and `categories` if you want to link the properly and be able to navigate properly in the GraphQL schema.

## Querying data

You can query Document nodes created from your Strapi API like the following:

```graphql
{
  allStrapiArticle {
    nodes {
      author {
        name
        avatar {
          localFile {
            childImageSharp {
              gatsbyImageData
            }
          }
        }
      }
      categories {
        name
      }
      # Richtext field
      content {
        data {
          childMarkdownRemark {
            html
          }
        }
        # Extracted files from the richtext field
        medias {
          localFile {
            childImageSharp {
              gatsbyImageData
            }
          }
          alternativeText
          # Original url in the markdown
          src
          # Prefixed url
          url
          # Original media from the media library
          file
        }
      }
    }
  }
}
```
