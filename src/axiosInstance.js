import axios from 'axios';

const createInstance = (config) => {
  const headers = { ...config?.headers };

  if (config.accessToken) {
    headers.authorization = `Bearer ${config.accessToken}`;
  }

  const instance = axios.create({
    baseURL: config.apiURL,
    headers,
  });

  return instance;
};

export default createInstance;
