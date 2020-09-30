# gatsby-source-strapi

Source plugin for pulling documents into Gatsby from a Strapi API.

## Install
Codesis Website project was bootstrapped with Create React App.

Getting Started
Goto the gatsby repository
Click on the Fork button in the upper right corner.
Clone the forked repository on your local machine
git clone https://github.com/<your username>/gatsby.git
To install the dependencies ,in the project directory you can run:
  
NPM install
`npm install --save gatsby-source-strapi`

yarn install
Once the dependencies are installed,run:
yarn start
Runs the app in the development mode.
Open http://localhost:3000 to view it in the browser.

The page will reload if you make edits.
You will also see any lint errors in the console.

Adding Features
Create a branch to do your work.
A good practice is to call the branch in the form of GH- followed by the title of the issue.

git checkout -b GH-issuenumber-title-of-issue
Make necessary changes,and commit those changes.

Push your changes to github

git push -u origin GH-issuenumber-title-of-issue
Pull Request

When finished create a pull request from your branch to the main gatsby repository.

When making a pull request use Closes #(issue_number) in the description of your PR, so that GitHub automatically associates your PR with that issue.

In the description of your PR, mention what bug or feature this provides. Give any relevant information, that you think maintainer should know like :

Tests you did to check your new PR or code

Your approach to the problem

Any other relevant information that you think one might keep in mind for future

Make it clear,complete and simple so your PR gets merged easily !

you can use 
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
      contentTypes: [`article`, `user`],
      //If using single types place them in this array.
      singleTypes: [`home-page`, `contact`],
      // Possibility to login with a strapi user, when content types are not publically available (optional).
      loginData: {
        identifier: "",
        password: "",
      },
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
