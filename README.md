# gatsby-source-strapi

Source plugin for pulling documents into Gatsby from a Strapi API.


> **WARNING**: This is the README for v1.0.0 which is in `alpha` version for now. Make sure to install it with @alpha to try it out. It's designed to be used with Gatsby v3.

## Install

`npm install --save gatsby-source-strapi@alpha`

## How to use

```javascript
// In your gatsby-config.js
plugins: [
  {
    resolve: `gatsby-source-strapi`,
    options: {
      apiURL: `http://localhost:1337`,
      queryLimit: 1000, // Default to 100
      contentTypes: [
        `article`,
        `user`,
        // if you don't want to leave the definition of an api endpoint to the pluralize module
        {
          name: `collection-name`,
          endpoint: `custom-endpoint`,
        },
        // if you want to use custom query strings (e.g. to fetch all locales)
        // mapping of api.qs object will be used to create final query string (e.g: http://localhost:1337/collection-name?_locale=all)
        {
          name: `collection-name`,
          api: { qs: { _locale: 'all' } }
        },
        // exemple fetching only english content
        {
          name: `collection-name`,
          api: { qs: { _locale: 'en' } }
        },
      ],
      //If using single types place them in this array.
      singleTypes: [`home-page`, `contact`],
      // Possibility to login with a strapi user, when content types are not publically available (optional).
      loginData: {
        identifier: '',
        password: '',
      },
    },
  },
];
```

## How to query

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
  allStrapiArticle(filter: { locale: "en" }) {
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
