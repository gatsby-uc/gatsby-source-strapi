'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _keys = require('babel-runtime/core-js/object/keys');

var _keys2 = _interopRequireDefault(_keys);

var _getIterator2 = require('babel-runtime/core-js/get-iterator');

var _getIterator3 = _interopRequireDefault(_getIterator2);

var _promise = require('babel-runtime/core-js/promise');

var _promise2 = _interopRequireDefault(_promise);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var _require = require('gatsby-source-filesystem'),
    createRemoteFileNode = _require.createRemoteFileNode;

// Downloads media from image type fields


exports.downloadMediaFiles = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee2(_ref2) {
    var entities = _ref2.entities,
        apiURL = _ref2.apiURL,
        store = _ref2.store,
        cache = _ref2.cache,
        createNode = _ref2.createNode,
        touchNode = _ref2.touchNode,
        auth = _ref2.jwtToken;
    return _regenerator2.default.wrap(function _callee2$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            return _context2.abrupt('return', _promise2.default.all(entities.map(function () {
              var _ref3 = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(entity) {
                var _iteratorNormalCompletion, _didIteratorError, _iteratorError, _iterator, _step, item, _iteratorNormalCompletion2, _didIteratorError2, _iteratorError2, _iterator2, _step2, key, field, fileNodeID, mediaDataCacheKey, cacheMediaData, source_url, fileNode;

                return _regenerator2.default.wrap(function _callee$(_context) {
                  while (1) {
                    switch (_context.prev = _context.next) {
                      case 0:
                        _iteratorNormalCompletion = true;
                        _didIteratorError = false;
                        _iteratorError = undefined;
                        _context.prev = 3;
                        _iterator = (0, _getIterator3.default)(entity);

                      case 5:
                        if (_iteratorNormalCompletion = (_step = _iterator.next()).done) {
                          _context.next = 57;
                          break;
                        }

                        item = _step.value;

                        // loop item over fields
                        _iteratorNormalCompletion2 = true;
                        _didIteratorError2 = false;
                        _iteratorError2 = undefined;
                        _context.prev = 10;
                        _iterator2 = (0, _getIterator3.default)((0, _keys2.default)(item));

                      case 12:
                        if (_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done) {
                          _context.next = 40;
                          break;
                        }

                        key = _step2.value;
                        field = item[key];
                        // image fields have a mime property among other
                        // maybe should find a better test

                        if (!(field !== null && field.hasOwnProperty('mime'))) {
                          _context.next = 37;
                          break;
                        }

                        fileNodeID = void 0;
                        // using field on the cache key for multiple image field

                        mediaDataCacheKey = 'strapi-media-' + item.id + '-' + key;
                        _context.next = 20;
                        return cache.get(mediaDataCacheKey);

                      case 20:
                        cacheMediaData = _context.sent;


                        // If we have cached media data and it wasn't modified, reuse
                        // previously created file node to not try to redownload
                        if (cacheMediaData && field.updatedAt === cacheMediaData.updatedAt) {
                          fileNodeID = cacheMediaData.fileNodeID;
                          touchNode(cacheMediaData.fileNodeID);
                        }

                        // If we don't have cached data, download the file

                        if (fileNodeID) {
                          _context.next = 36;
                          break;
                        }

                        _context.prev = 23;

                        // full media url
                        source_url = apiURL + field.url;
                        _context.next = 27;
                        return createRemoteFileNode({
                          url: source_url,
                          store: store,
                          cache: cache,
                          createNode: createNode,
                          auth: auth
                        });

                      case 27:
                        fileNode = _context.sent;

                        if (!fileNode) {
                          _context.next = 32;
                          break;
                        }

                        fileNodeID = fileNode.id;

                        _context.next = 32;
                        return cache.set(mediaDataCacheKey, {
                          fileNodeID: fileNodeID,
                          modified: field.updatedAt
                        });

                      case 32:
                        _context.next = 36;
                        break;

                      case 34:
                        _context.prev = 34;
                        _context.t0 = _context['catch'](23);

                      case 36:
                        if (fileNodeID) {
                          item[key + '___NODE'] = fileNodeID;
                        }

                      case 37:
                        _iteratorNormalCompletion2 = true;
                        _context.next = 12;
                        break;

                      case 40:
                        _context.next = 46;
                        break;

                      case 42:
                        _context.prev = 42;
                        _context.t1 = _context['catch'](10);
                        _didIteratorError2 = true;
                        _iteratorError2 = _context.t1;

                      case 46:
                        _context.prev = 46;
                        _context.prev = 47;

                        if (!_iteratorNormalCompletion2 && _iterator2.return) {
                          _iterator2.return();
                        }

                      case 49:
                        _context.prev = 49;

                        if (!_didIteratorError2) {
                          _context.next = 52;
                          break;
                        }

                        throw _iteratorError2;

                      case 52:
                        return _context.finish(49);

                      case 53:
                        return _context.finish(46);

                      case 54:
                        _iteratorNormalCompletion = true;
                        _context.next = 5;
                        break;

                      case 57:
                        _context.next = 63;
                        break;

                      case 59:
                        _context.prev = 59;
                        _context.t2 = _context['catch'](3);
                        _didIteratorError = true;
                        _iteratorError = _context.t2;

                      case 63:
                        _context.prev = 63;
                        _context.prev = 64;

                        if (!_iteratorNormalCompletion && _iterator.return) {
                          _iterator.return();
                        }

                      case 66:
                        _context.prev = 66;

                        if (!_didIteratorError) {
                          _context.next = 69;
                          break;
                        }

                        throw _iteratorError;

                      case 69:
                        return _context.finish(66);

                      case 70:
                        return _context.finish(63);

                      case 71:
                        return _context.abrupt('return', entity);

                      case 72:
                      case 'end':
                        return _context.stop();
                    }
                  }
                }, _callee, undefined, [[3, 59, 63, 71], [10, 42, 46, 54], [23, 34], [47,, 49, 53], [64,, 66, 70]]);
              }));

              return function (_x2) {
                return _ref3.apply(this, arguments);
              };
            }())));

          case 1:
          case 'end':
            return _context2.stop();
        }
      }
    }, _callee2, undefined);
  }));

  return function (_x) {
    return _ref.apply(this, arguments);
  };
}();