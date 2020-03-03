'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _fetch = require('./fetch');

var _fetch2 = _interopRequireDefault(_fetch);

var _nodes = require('./nodes');

var _lodash = require('lodash');

var _normalize = require('./normalize');

var _normalize2 = _interopRequireDefault(_normalize);

var _authentication = require('./authentication');

var _authentication2 = _interopRequireDefault(_authentication);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.sourceNodes = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(_ref2, _ref3) {
    var store = _ref2.store,
        actions = _ref2.actions,
        cache = _ref2.cache,
        reporter = _ref2.reporter,
        getNode = _ref2.getNode,
        getNodes = _ref2.getNodes;
    var _ref3$apiURL = _ref3.apiURL,
        apiURL = _ref3$apiURL === undefined ? 'http://localhost:1337' : _ref3$apiURL,
        _ref3$contentTypes = _ref3.contentTypes,
        contentTypes = _ref3$contentTypes === undefined ? [] : _ref3$contentTypes,
        _ref3$loginData = _ref3.loginData,
        loginData = _ref3$loginData === undefined ? {} : _ref3$loginData,
        _ref3$queryLimit = _ref3.queryLimit,
        queryLimit = _ref3$queryLimit === undefined ? 100 : _ref3$queryLimit;
    var createNode, deleteNode, touchNode, jwtToken, fetchActivity, promises, entities, newNodes, existingNodes, diff;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            createNode = actions.createNode, deleteNode = actions.deleteNode, touchNode = actions.touchNode;

            // Authentication function

            _context.next = 3;
            return (0, _authentication2.default)({ loginData: loginData, reporter: reporter, apiURL: apiURL });

          case 3:
            jwtToken = _context.sent;


            // Start activity, Strapi data fetching
            fetchActivity = reporter.activityTimer('Fetched Strapi Data');

            fetchActivity.start();

            // Generate a list of promises based on the `contentTypes` option.
            promises = contentTypes.map(function (contentType) {
              return (0, _fetch2.default)({
                apiURL: apiURL,
                contentType: contentType,
                jwtToken: jwtToken,
                queryLimit: queryLimit,
                reporter: reporter
              });
            });

            // Execute the promises

            _context.next = 9;
            return _promise2.default.all(promises);

          case 9:
            entities = _context.sent;
            _context.next = 12;
            return _normalize2.default.downloadMediaFiles({
              entities: entities,
              apiURL: apiURL,
              store: store,
              cache: cache,
              createNode: createNode,
              touchNode: touchNode,
              jwtToken: jwtToken
            });

          case 12:
            entities = _context.sent;


            // new created nodes
            newNodes = [];

            // Fetch existing strapi nodes

            existingNodes = getNodes().filter(function (n) {
              return n.internal.owner === 'gatsby-source-strapi';
            });

            // Touch each one of them

            existingNodes.forEach(function (n) {
              touchNode({ nodeId: n.id });
            });

            // Create/update nodes
            contentTypes.forEach(function (contentType, i) {
              var items = entities[i];
              items.forEach(function (item, i) {
                var node = (0, _nodes.Node)((0, _lodash.capitalize)(contentType), item);
                // Adding new created nodes in an Array
                newNodes.push(node);

                // Create nodes
                createNode(node);
              });
            });

            // Make a diff array between existing nodes and new ones
            diff = existingNodes.filter(function (_ref4) {
              var id1 = _ref4.id;
              return !newNodes.some(function (_ref5) {
                var id2 = _ref5.id;
                return id2 === id1;
              });
            });

            // Delete diff nodes

            diff.forEach(function (data) {
              deleteNode({ node: getNode(data.id) });
            });

            fetchActivity.end();

          case 20:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();