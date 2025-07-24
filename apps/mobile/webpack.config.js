const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(
    {
      ...env,
      babel: {
        dangerouslyAllowSyncDefaultImport: true,
      },
    },
    argv
  );

  // Ensure React is available globally
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
  };

  // Add fallbacks for Node.js modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: false,
    buffer: false,
    util: false,
    stream: false,
    assert: false,
  };

  return config;
};