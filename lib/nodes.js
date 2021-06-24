"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.Node = void 0;

var _gatsbyNodeHelpers = _interopRequireDefault(require("gatsby-node-helpers"));

const {
  createNodeFactory
} = (0, _gatsbyNodeHelpers.default)({
  typePrefix: 'Strapi'
});

const Node = (type, node) => createNodeFactory(type, node => {
  node.id = `${type}_${node.strapiId}`;
  return node;
})(node);

exports.Node = Node;