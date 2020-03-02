'use strict';

var _regenerator = require('babel-runtime/regenerator');

var _regenerator2 = _interopRequireDefault(_regenerator);

var _asyncToGenerator2 = require('babel-runtime/helpers/asyncToGenerator');

var _asyncToGenerator3 = _interopRequireDefault(_asyncToGenerator2);

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = function () {
  var _ref = (0, _asyncToGenerator3.default)( /*#__PURE__*/_regenerator2.default.mark(function _callee(_ref2) {
    var loginData = _ref2.loginData,
        reporter = _ref2.reporter,
        apiURL = _ref2.apiURL;
    var jwtToken, authenticationActivity, loginEndpoint, loginResponse;
    return _regenerator2.default.wrap(function _callee$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            jwtToken = null;

            // Check if loginData is set.

            if (!(loginData.hasOwnProperty('identifier') && loginData.identifier.length !== 0 && loginData.hasOwnProperty('password') && loginData.password.length !== 0)) {
              _context.next = 16;
              break;
            }

            authenticationActivity = reporter.activityTimer('Authenticate Strapi User');

            authenticationActivity.start();

            // Define API endpoint.
            loginEndpoint = apiURL + '/auth/local';

            // Make API request.

            _context.prev = 5;
            _context.next = 8;
            return _axios2.default.post(loginEndpoint, loginData);

          case 8:
            loginResponse = _context.sent;


            if (loginResponse.hasOwnProperty('data')) {
              jwtToken = loginResponse.data.jwt;
            }
            _context.next = 15;
            break;

          case 12:
            _context.prev = 12;
            _context.t0 = _context['catch'](5);

            reporter.panic('Strapi authentication error: ' + _context.t0);

          case 15:
            authenticationActivity.end();

          case 16:
            return _context.abrupt('return', jwtToken);

          case 17:
          case 'end':
            return _context.stop();
        }
      }
    }, _callee, undefined, [[5, 12]]);
  }));

  return function (_x) {
    return _ref.apply(this, arguments);
  };
}();