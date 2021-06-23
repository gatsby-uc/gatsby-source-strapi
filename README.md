# gatsby-source-strapi

Source plugin for pulling documents into Gatsby from a Strapi API.

## Installing the plugin

```sh
# Using Yarn
yarn add gatsby-source-strapi

# Or using NPM
npm install --save gatsby-source-strapi
```

## Setting up the plugin

You can enable and configure this plugin in your `gatsby-config.js` file.

### Basic usage

```javascript
// In your gatsby-config.js
plugins: [
  {
    resolve: `gatsby-source-strapi`,
    options: {
      apiURL: `http://localhost:1337`,
      queryLimit: 1000, // Defaults to 100
      collectionTypes: [`article`, `user`],
      singleTypes: [`home-page`, `contact`],
    },
  },
];
```

### Advanced usage

#### Custom endpoint

By default, we use the pluralize module to deduct the endpoint that matches a collection type. You can opt out of this behavior. To do so, pass an entity definition object with your custom endpoint.

```javascript
// In your gatsby-config.js
plugins: [
  {
    resolve: `gatsby-source-strapi`,
    options: {
      apiURL: `http://localhost:1337`,
      collectionTypes: [
        {
          name: `collection-name`,
          endpoint: `custom-endpoint`,
        },
      ]
    },
  },
];
```

#### Internationalization support

Strapi now supports [internationalization](https://strapi.io/documentation/developer-docs/latest/development/plugins/i18n.html#installation). But by default, this plugin will only fetch data in the default locale of your Strapi app. If your content types are available in different locales, you can also pass an entity definition object to specify the locale you want to fetch for a content type. Use the `all` value to get all available locales on a collection type.

```javascript
// In your gatsby-config.js
plugins: [
  {
    resolve: `gatsby-source-strapi`,
    options: {
      apiURL: `http://localhost:1337`,
      collectionTypes: [
        // Fetch all locales for collection-name
        {
          name: `collection-name`,
          api: { qs: { _locale: `all` } }
        },
        // Only fetch english content for other-collection-name
        {
          name: `other-collection-name`,
          api: { qs: { _locale: `en` } }
        },
        // Combined with a custom endpoint
        {
          name: `another-collection-name`,
          endpoint: `custom-endpoint`,
          api: { qs: { _locale: `en` } }
        },
      ]
    },
  },
];
```

For single types, the `all` value will not work, since single type queries do not return an array. If you want a single type to be available in different locales, add several entity definition objects for that same single type. The source plugin will merge them together, so you can access the right locale in your queries using the `locale` filter.

```javascript
// In your gatsby-config.js
plugins: [
  {
    resolve: `gatsby-source-strapi`,
    options: {
      apiURL: `http://localhost:1337`,
      singleTypes: [
        {
          name: 'single-type-name',
          api: {
            qs: {
              _locale: 'en'
            }
          },
        },
        {
          name: 'single-type-name',
          api: {
            qs: {
              _locale: 'fr'
            }
          },
        },
      ],
    },
  },
];
```

#### Draft content

Strapi now supports [Draft and publish](https://strapi.io/documentation/developer-docs/latest/concepts/draft-and-publish.html#draft-and-publish), which allows you to save your content as a draft and publish it later. By default, this plugin will only fetch the published content.

But you may want to fetch unpublished content in Gatsby as well. To do so, find a content type that has draft & publish enabled, and add an entity definition object to your config. Then, use the query string option to specify the [publication state](https://strapi.io/documentation/developer-docs/latest/developer-resources/content-api/content-api.html#publication-state) API parameter.

```javascript
// In your gatsby-config.js
plugins: [
  {
    resolve: `gatsby-source-strapi`,
    options: {
      apiURL: `http://localhost:1337`,
      collectionTypes: [
        {
          name: 'collection-name',
          api: {
            qs: {
              // 'preview' fetches both draft & published content
              _publicationState: 'preview',
            }
          }
        }
      ],
    },
  },
],
```

#### Authenticated requests

Strapi's [Roles & Permissions plugin](https://strapi.io/documentation/developer-docs/latest/development/plugins/users-permissions.html#concept) allows you to protect your API actions. If you need to access a route that is only available to a logged in user, you can provide your credentials so that this plugin can access to the protected data.

```javascript
// In your gatsby-config.js
plugins: [
  {
    resolve: `gatsby-source-strapi`,
    options: {
      apiURL: `http://localhost:1337`,
      collectionTypes: [`collection-name`],
      loginData: {
        identifier: '',
        password: '',
      },
    },
  },
];
```

#### Default data
It's possible to add default data, if by any chances your API request fails with error code 404.

```javascript
// In your gatsby-config.js
plugins: [
  {
    resolve: `gatsby-source-strapi`,
    options: {
      apiURL: `http://localhost:1337`,
      collectionTypes: [
        {
          name: 'collection-name',
          api: {
            qs: {
              // 'preview' fetches both draft & published content
              _publicationState: 'preview',
            }
          },
          defaultData: {
            // default data for collection-name
          }
        }
      ],
    },
  },
],
```

## Querying data

You can query Document nodes created from your Strapi API like the following:

```graphql
{
  allStrapiArticle {
    edges {
      node {
        id
        title
        content
      }
    }
  }
}
```

You can query Document nodes in a chosen language

Make sure to add `api.qs._locale` to your strapi configuration in `gatsby-config.js` (see example above)

```graphql
{
  allStrapiArticle(filter: { locale: { eq: "en" } }) {
    edges {
      node {
        id
        title
        content
      }
    }
  }
}
```

To query images you can do the following:

```graphql
{
  allStrapiArticle {
    edges {
      node {
        id
        singleImage {
          localFile {
            publicURL
          }
        }
        multipleImages {
          localFile {
            publicURL
          }
        }
      }
    }
  }
}
```
