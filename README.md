# gatsby-source-strapi

Source plugin for pulling documents into Gatsby from a Strapi API.

> ⚠️ This version of `gatsby-source-strapi` is only compatible with Strapi v4. For v3 use this [release](https://www.npmjs.com/package/gatsby-source-strapi/v/1.0.3)

<details>
<summary><strong>Table of contents</strong></summary>

- [gatsby-source-strapi](#gatsby-source-strapi)
  - [Install](#installing-the-plugin)
    - [Basic usage](#basic-usage)
    - [Advanced usage](#advanced-usage)
      - [Deep queries populate](#deep-queries-populate)
      - [Draft content](#draft-content)
      - [Image optimisation](#image-optimisation)
      - [Rich text field](#rich-text-field)
      - [Components](#components)
      - [Dynamic zones](#dynamic-zones)
  - [Restrictions and limitations](#restrictions-and-limitations)

</details>

## Installing the plugin

### Using yarn

```sh
yarn add gatsby-source-strapi gatsby-plugin-image gatsby-plugin-sharp gatsby-source-filesystem gatsby-transformer-remark gatsby-transformer-sharp
```

### Or using NPM

```sh
npm install --save gatsby-source-strapi gatsby-plugin-image gatsby-plugin-sharp gatsby-source-filesystem gatsby-transformer-remark gatsby-transformer-sharp
```

## Setting up the plugin

You can enable and configure this plugin in your `gatsby-config.js` file.

### Basic usage

First, you need to configure the `STRAPI_API_URL` and the `STRAPI_TOKEN` environment variables. We recommend using [`dotenv`][https://github.com/motdotla/dotenv] to expose these variables.

Make sure to create a full-access [API TOKEN](https://docs.strapi.io/developer-docs/latest/setup-deployment-guides/configurations/optional/api-tokens.html) in Strapi.

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

But you may want to fetch unpublished content in Gatsby as well. To do so, find a content type that has draft & publish enabled, and add an entity definition object to your config. Then, use the query string option to specify the [publication state](https://docs.strapi.io/developer-docs/latest/concepts/draft-and-publish.html) API parameter.

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

By default all medias are downloaded in the Gatsby file system.
To query your asset use the following query:

```graphql
{
  allStrapiArticle {
    nodes {
      cover {
        localFile {
          childImageSharp {
            gatsbyImageData
          }
        }
      }
    }
  }
}
```

#### Rich text field

Rich text fields can now be processed using the [`gatsby-transformer-remark`](https://www.gatsbyjs.com/plugins/gatsby-transformer-remark/https://www.gatsbyjs.com/plugins/gatsby-transformer-remark/) plugin.

> It only works if the content of the rich text field saved in the database is in markdown format. So if you customized the WYSIWYG in your Strapi Administration panel make sure that it is saved in a markdown format.

Files that are added in the richtext field can now also be processed by the [`gatsby-plugin-image`](https://www.gatsbyjs.com/plugins/gatsby-plugin-image/?=gatsby-plugin-i#gatsby-plugin-image) plugin.

To do so, according the [restrictons and limitations of the plugin](#restrictions-and-limitations) you need to make sure that at least one of your content types entities has a file uploaded in the richtext field.

To query markdown local fields use the following query:

```graphql
{
  allStrapiArticle {
    nodes {
      # richtext field content
      body {
        # object to access the markdown node
        data {
          # unprocessed data from Strapi
          body
          # processed markdown
          childMarkdownRemark {
            html
            rawMarkdownBody
          }
        }
        # files from the markdown that are processed using the gatsby-image-plugin
        medias {
          # alternative text saved in the markdown
          alternativeText
          # file from the media library
          file {
            # alternative text of the file in the media library
            # it can be different from the one set in your markdown
            alternativeText
          }
          # file processed with gatsby-plugin-image
          localFile {
            childImageSharp {
              gatsbyImageData
            }
          }
          # src set in your markdown field (ex: [alternativeText](src))
          src
          # prefixed url with the Strapi api endpoint of the file
          # when using a provider the src field value is equal to the url field value
          url
        }
      }
    }
  }
}
```

#### Components

Strapi components creates unique Gatsby nodes to be able to query a single component in GraphQL using the Gatsby id.
To query a specific component use the following query:

```graphql
{
  strapiComponentSharedRichText(id: { eq: "id" }) {
    id
  }
}
```

#### Dynamic zones

To query dynamic zones, , write a query using [inline GraphQL fragments](https://graphql.org/learn/queries/#inline-fragments).

You can use the following query:

```graphql
{
  allStrapiArticle {
    nodes {
      blocks {
        ... on STRAPI__COMPONENT_SHARED_RICH_TEXT {
          id
          # Since __component is forbidden in gatsby this field is prefixed by strapi_
          strapi_component
        }
        ... on STRAPI__COMPONENT_SHARED_QUOTE {
          id
          strapi_component
        }
        ... on STRAPI__COMPONENT_SHARED_MEDIA {
          id
          strapi_component
        }
        ... on STRAPI__COMPONENT_SHARED_SLIDER {
          id
          strapi_component
        }
      }
    }
  }
}
```

## Restrictions and limitations

This plugin has several limitations, please be aware of these:

1. At the moment, fields that do not have at least one populated instance will not be created in the GraphQL schema. This can break your site when field values get removed. You may workaround with an extra content entry with all fields filled out.

2. When using relational fields, be aware that this source plugin will automatically create the reverse reference for the first level of relation. It is advised to query both `articles` and `categories` if you want to link the properly and be able to navigate properly in the GraphQL schema.

3. In Gatsby, some field names are restricted therefore these fields will be prefixed by `strapi_`. Here's the list of the restricted field names:

- `children`
- `fields`
- `internal`
- `parent`
