import { has } from 'lodash/fp';
import axios from 'axios';

module.exports = async ({ loginData, reporter, apiURL }) => {
  const validIndentifier = has('identifier', loginData) && loginData.identifier.length !== 0;
  const validPassword = has('password', loginData) && loginData.password.length !== 0;

  if (validIndentifier && validPassword) {
    const authenticationActivity = reporter.activityTimer(`Authenticate Strapi User`);
    authenticationActivity.start();

    // Make API request.
    try {
      const loginResponse = await axios.post(`${apiURL}/auth/local`, loginData);

      authenticationActivity.end();

      if (has('data', loginResponse)) {
        return loginResponse.data.jwt;
      }
    } catch (e) {
      reporter.panic('Strapi authentication error: ' + e);
    }
  }

  return null;
};
