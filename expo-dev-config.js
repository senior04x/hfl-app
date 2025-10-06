// Expo development configuration for mobile testing
const { createDevConfig } = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createDevConfig({
    ...env,
    babel: {
      dangerouslyAddModulePathsToTranspile: ['@expo/vector-icons']
    }
  }, argv);

  // Configure for mobile development
  config.devServer = {
    ...config.devServer,
    host: '0.0.0.0', // Allow connections from any IP
    port: 8081,
    allowedHosts: 'all',
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }
  };

  return config;
};
