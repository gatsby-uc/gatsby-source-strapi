"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

var _fp = require("lodash/fp");

var _axios = _interopRequireDefault(require("axios"));

module.exports = async ({
  loginData,
  reporter,
  apiURL
}) => {
  const validIndentifier = (0, _fp.has)('identifier', loginData) && loginData.identifier.length !== 0;
  const validPassword = (0, _fp.has)('password', loginData) && loginData.password.length !== 0;

  if (validIndentifier && validPassword) {
    const authenticationActivity = reporter.activityTimer(`Authenticate Strapi User`);
    authenticationActivity.start(); // Make API request.

    try {
      const loginResponse = await _axios.default.post(`${apiURL}/auth/local`, loginData);
      authenticationActivity.end();

      if ((0, _fp.has)('data', loginResponse)) {
        return loginResponse.data.jwt;
      }
    } catch (e) {
      reporter.panic('Strapi authentication error: ' + e);
    }
  }

  return null;
};