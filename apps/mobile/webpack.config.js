const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');

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

  // Provide React globally to prevent hook import issues
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      React: 'react',
    }),
  ];

  return config;
};