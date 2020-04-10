# gatsby-source-strapi

Source plugin for pulling documents into Gatsby from a Strapi API.

## Install

`npm install --save gatsby-source-strapi`

## How to use

```javascript
// In your gatsby-config.js
plugins: [
  {
    resolve: `gatsby-source-strapi`,
    options: {
      apiURL: `http://localhost:1337`,
      queryLimit: 1000, // Default to 100
      contentTypes: [`article`, `user`, `upload/file`],
      //If using single types place them in this array.
      singleTypes: [`home-page`, `contact`],
      // Possibility to login with a strapi user, when content types are not publicly available (optional).
      loginData: {
        identifier: "",
        password: "",
      },
      useNamedImages: false,
      // used file names in images, instead of hashes
    },
  },
]
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

To query images you can do the following:

```graphql
{
  allStrapiArticle {
    edges {
      node {
        id
        singleImage {
         publicURL
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
