'use strict';

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _toConsumableArray2 = require('babel-runtime/helpers/toConsumableArray');

var _toConsumableArray3 = _interopRequireDefault(_toConsumableArray2);

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
    var _ref3$sources = _ref3.sources,
        sources = _ref3$sources === undefined ? {} : _ref3$sources;

    var createNode, deleteNode, touchNode, _loop, _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, source;

    return _regenerator2.default.wrap(function _callee$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            createNode = actions.createNode, deleteNode = actions.deleteNode, touchNode = actions.touchNode;
            _loop = /*#__PURE__*/_regenerator2.default.mark(function _loop(source) {
              var apiURL, contentTypes, singleTypes, loginData, queryLimit, jwtToken, fetchActivity, contentTypePromises, singleTypePromises, entities, newNodes, existingNodes, diff;
              return _regenerator2.default.wrap(function _loop$(_context) {
                while (1) {
                  switch (_context.prev = _context.next) {
                    case 0:
                      apiURL = source.apiURL, contentTypes = source.contentTypes, singleTypes = source.singleTypes, loginData = source.loginData, queryLimit = source.queryLimit;

                      // Authentication function

                      _context.next = 3;
                      return (0, _authentication2.default)({ loginData: loginData, reporter: reporter, apiURL: apiURL });

                    case 3:
                      jwtToken = _context.sent;


                      // Start activity, Strapi data fetching
                      fetchActivity = reporter.activityTimer('Fetched Strapi Data');

                      fetchActivity.start();

                      // Generate a list of promises based on the `contentTypes` option.
                      contentTypePromises = contentTypes.map(function (contentType) {
                        return (0, _fetch2.default)({
                          apiURL: apiURL,
                          contentType: contentType,
                          jwtToken: jwtToken,
                          queryLimit: queryLimit,
                          reporter: reporter
                        });
                      });

                      // Generate a list of promises based on the `singleTypes` option.

                      singleTypePromises = singleTypes.map(function (singleType) {
                        return (0, _fetch2.default)({
                          apiURL: apiURL,
                          singleType: singleType,
                          jwtToken: jwtToken,
                          queryLimit: queryLimit,
                          reporter: reporter
                        });
                      });

                      // Execute the promises

                      _context.next = 10;
                      return _promise2.default.all([].concat((0, _toConsumableArray3.default)(contentTypePromises), (0, _toConsumableArray3.default)(singleTypePromises)));

                    case 10:
                      entities = _context.sent;
                      _context.next = 13;
                      return _normalize2.default.downloadMediaFiles({
                        entities: entities,
                        apiURL: apiURL,
                        store: store,
                        cache: cache,
                        createNode: createNode,
                        touchNode: touchNode,
                        jwtToken: jwtToken
                      });

                    case 13:
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

                      // Merge single and content types and retrieve create nodes
                      contentTypes.concat(singleTypes).forEach(function (type, i) {
                        var items = entities[i];
                        var name = (0, _lodash.isObject)(type) ? type.name : type;
                        items.forEach(function (item, i) {
                          var node = (0, _nodes.Node)((0, _lodash.capitalize)(name), item);
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

                      reporter.info('Finished fetching data from Strapi');

                    case 22:
                    case 'end':
                      return _context.stop();
                  }
                }
              }, _loop, undefined);
            });
            _iteratorNormalCompletion = true;
            _didIteratorError = false;
            _iteratorError = undefined;
            _context2.prev = 5;
            _iterator = (0, _getIterator3.default)(sources);

          case 7:
            if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
              _context2.next = 13;
              break;
            }

            source = _step.value;
            return _context2.delegateYield(_loop(source), 't0', 10);

          case 10:
            _iteratorNormalCompletion = true;
            _context2.next = 7;
            break;

          case 13:
            _context2.next = 19;
            break;

          case 15:
            _context2.prev = 15;
            _context2.t1 = _context2['catch'](5);
            _didIteratorError = true;
            _iteratorError = _context2.t1;

          case 19:
            _context2.prev = 19;
            _context2.prev = 20;

            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }

          case 22:
            _context2.prev = 22;

            if (!_didIteratorError) {
              _context2.next = 25;
              break;
            }

            throw _iteratorError;

          case 25:
            return _context2.finish(22);

          case 26:
            return _context2.finish(19);

          case 27:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee, undefined, [[5, 15, 19, 27], [20,, 22, 26]]);
  }));

  return function (_x, _x2) {
    return _ref.apply(this, arguments);
  };
}();