'use strict';

var _typeof2 = require('babel-runtime/helpers/typeof');

var _typeof3 = _interopRequireDefault(_typeof2);

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _require = require('gatsby-source-filesystem'),
    createRemoteFileNode = _require.createRemoteFileNode;

var extractFields = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(apiURL, store, cache, createNode, touchNode, auth, item) {
    var _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, key, field, fileNodeID, mediaDataCacheKey, cacheMediaData, source_url, fileNode;

    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            _iteratorNormalCompletion = true;
            _didIteratorError = false;
            _iteratorError = undefined;
            _context2.prev = 3;
            _iterator = (0, _getIterator3.default)((0, _keys2.default)(item));

          case 5:
            if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
              _context2.next = 41;
              break;
            }

            key = _step.value;
            field = item[key];

            if (!Array.isArray(field)) {
              _context2.next = 13;
              break;
            }

            _context2.next = 11;
            return _promise2.default.all(field.map(function () {
              var _ref2 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(f) {
                return _regenerator2.default.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        return _context.abrupt('return', extractFields(apiURL, store, cache, createNode, touchNode, auth, f));

                      case 1:
                      case 'end':
                        return _context.stop();
                    }
                  }
                }, _callee, undefined);
              }));

              return function (_x8) {
                return _ref2.apply(this, arguments);
              };
            }()));

          case 11:
            _context2.next = 38;
            break;

          case 13:
            if (!(field !== null && field.hasOwnProperty('mime'))) {
              _context2.next = 37;
              break;
            }

            fileNodeID = void 0;
            // using field on the cache key for multiple image field

            mediaDataCacheKey = 'strapi-media-' + item.id + '-' + key;
            _context2.next = 18;
            return cache.get(mediaDataCacheKey);

          case 18:
            cacheMediaData = _context2.sent;


            // If we have cached media data and it wasn't modified, reuse
            // previously created file node to not try to redownload
            if (cacheMediaData && field.updated_at === cacheMediaData.updated_at) {
              fileNodeID = cacheMediaData.fileNodeID;
              touchNode({ nodeId: cacheMediaData.fileNodeID });
            }

            // If we don't have cached data, download the file

            if (fileNodeID) {
              _context2.next = 34;
              break;
            }

            _context2.prev = 21;

            // full media url
            source_url = '' + (field.url.startsWith('http') ? '' : apiURL) + field.url;
            _context2.next = 25;
            return createRemoteFileNode({
              url: source_url,
              store: store,
              cache: cache,
              createNode: createNode,
              auth: auth
            });

          case 25:
            fileNode = _context2.sent;

            if (!fileNode) {
              _context2.next = 30;
              break;
            }

            fileNodeID = fileNode.id;

            _context2.next = 30;
            return cache.set(mediaDataCacheKey, {
              fileNodeID: fileNodeID,
              updated_at: field.updated_at
            });

          case 30:
            _context2.next = 34;
            break;

          case 32:
            _context2.prev = 32;
            _context2.t0 = _context2['catch'](21);

          case 34:
            if (fileNodeID) {
              item[key + '___NODE'] = fileNodeID;
            }
            _context2.next = 38;
            break;

          case 37:
            if (field !== null && (typeof field === 'undefined' ? 'undefined' : (0, _typeof3.default)(field)) === 'object') {
              extractFields(apiURL, store, cache, createNode, touchNode, auth, field);
            }

          case 38:
            _iteratorNormalCompletion = true;
            _context2.next = 5;
            break;

          case 41:
            _context2.next = 47;
            break;

          case 43:
            _context2.prev = 43;
            _context2.t1 = _context2['catch'](3);
            _didIteratorError = true;
            _iteratorError = _context2.t1;

          case 47:
            _context2.prev = 47;
            _context2.prev = 48;

            if (!_iteratorNormalCompletion && _iterator.return) {
              _iterator.return();
            }

          case 50:
            _context2.prev = 50;

            if (!_didIteratorError) {
              _context2.next = 53;
              break;
            }

            throw _iteratorError;

          case 53:
            return _context2.finish(50);

          case 54:
            return _context2.finish(47);

          case 55:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, undefined, [[3, 43, 47, 55], [21, 32], [48,, 50, 54]]);
  }));

  return function extractFields(_x, _x2, _x3, _x4, _x5, _x6, _x7) {
    return _ref.apply(this, arguments);
  };
}();

// Downloads media from image type fields
exports.downloadMediaFiles = function () {
  var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee4(_ref4) {
    var entities = _ref4.entities,
        apiURL = _ref4.apiURL,
        store = _ref4.store,
        cache = _ref4.cache,
        createNode = _ref4.createNode,
        touchNode = _ref4.touchNode,
        auth = _ref4.jwtToken;
    return _regenerator2.default.wrap(function _callee4$(_context4) {
      while (1) {
        switch (_context4.prev = _context4.next) {
          case 0:
            return _context4.abrupt('return', _promise2.default.all(entities.map(function () {
              var _ref5 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee3(entity) {
                var _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, item;

                return _regenerator2.default.wrap(function _callee3$(_context3) {
                  while (1) {
                    switch (_context3.prev = _context3.next) {
                      case 0:
                        _iteratorNormalCompletion2 = true;
                        _didIteratorError2 = false;
                        _iteratorError2 = undefined;
                        _context3.prev = 3;
                        _iterator2 = (0, _getIterator3.default)(entity);

                      case 5:
                        if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
                          _context3.next = 12;
                          break;
                        }

                        item = _step2.value;
                        _context3.next = 9;
                        return extractFields(apiURL, store, cache, createNode, touchNode, auth, item);

                      case 9:
                        _iteratorNormalCompletion2 = true;
                        _context3.next = 5;
                        break;

                      case 12:
                        _context3.next = 18;
                        break;

                      case 14:
                        _context3.prev = 14;
                        _context3.t0 = _context3['catch'](3);
                        _didIteratorError2 = true;
                        _iteratorError2 = _context3.t0;

                      case 18:
                        _context3.prev = 18;
                        _context3.prev = 19;

                        if (!_iteratorNormalCompletion2 && _iterator2.return) {
                          _iterator2.return();
                        }

                      case 21:
                        _context3.prev = 21;

                        if (!_didIteratorError2) {
                          _context3.next = 24;
                          break;
                        }

                        throw _iteratorError2;

                      case 24:
                        return _context3.finish(21);

                      case 25:
                        return _context3.finish(18);

                      case 26:
                        return _context3.abrupt('return', entity);

                      case 27:
                      case 'end':
                        return _context3.stop();
                    }
                  }
                }, _callee3, undefined, [[3, 14, 18, 26], [19,, 21, 25]]);
              }));

              return function (_x10) {
                return _ref5.apply(this, arguments);
              };
            }())));

          case 1:
          case 'end':
            return _context4.stop();
        }
      }
    }, _callee4, undefined);
  }));

  return function (_x9) {
    return _ref3.apply(this, arguments);
  };
}();