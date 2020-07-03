'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _lodash = require('lodash');

var _pluralize = require('pluralize');

var _pluralize2 = _interopRequireDefault(_pluralize);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(_ref2) {
    var apiURL = _ref2.apiURL,
        _ref2$contentType = _ref2.contentType,
        contentType = _ref2$contentType === undefined ? '' : _ref2$contentType,
        _ref2$singleType = _ref2.singleType,
        singleType = _ref2$singleType === undefined ? '' : _ref2$singleType,
        jwtToken = _ref2.jwtToken,
        queryLimit = _ref2.queryLimit,
        reporter = _ref2.reporter;

    var _singleType, _contentType, queryParams, apiBase, apiEndpoint, fetchRequestConfig, documents, response;

    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            _singleType = (0, _lodash.isObject)(singleType) ? singleType.name : singleType;
            _contentType = (0, _pluralize2.default)((0, _lodash.isObject)(contentType) ? contentType.name : contentType);
            queryParams = singleType ? (0, _lodash.isObject)(singleType) ? '&' + singleType.params : '' : (0, _lodash.isObject)(contentType) ? '&' + contentType.params : '';

            // Define API endpoint.

            apiBase = singleType ? apiURL + '/' + _singleType : apiURL + '/' + _contentType;
            apiEndpoint = apiBase + '?_limit=' + queryLimit + queryParams;


            reporter.info('Starting to fetch data from Strapi - ' + apiEndpoint);

            // Set authorization token
            fetchRequestConfig = {};

            if (jwtToken !== null) {
              fetchRequestConfig.headers = {
                Authorization: 'Bearer ' + jwtToken
              };
            }

            // Make API request.
            _context.next = 10;
            return (0, _axios2.default)(apiEndpoint, fetchRequestConfig);

          case 10:
            documents = _context.sent;


            // Make sure response is an array for single type instances
            response = Array.isArray(documents.data) ? documents.data : [documents.data];

            // Map and clean data.

            return _context.abrupt('return', response.map(function (item) {
              return clean(item);
            }));

          case 13:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined);
  }));

  return function (_x) {
    return _ref.apply(this, arguments);
  };
}();

/**
 * Remove fields starting with `_` symbol.
 *
 * @param {object} item - Entry needing clean
 * @returns {object} output - Object cleaned
 */
var clean = function clean(item) {
  (0, _lodash.forEach)(item, function (value, key) {
    if ((0, _lodash.startsWith)(key, '__')) {
      delete item[key];
    } else if ((0, _lodash.startsWith)(key, '_')) {
      delete item[key];
      item[key.slice(1)] = value;
    } else if ((0, _lodash.isObject)(value)) {
      item[key] = clean(value);
    }
  });

  return item;
};