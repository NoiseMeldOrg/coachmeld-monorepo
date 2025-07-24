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

  // Ensure React is available globally and resolve to single instance
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native$': 'react-native-web',
    'react': require.resolve('react'),
    'react-dom': require.resolve('react-dom'),
  };

  // Ensure only one copy of React
  config.resolve.dedupe = ['react', 'react-dom'];

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
    new webpack.DefinePlugin({
      __DEV__: JSON.stringify(process.env.NODE_ENV !== 'production'),
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
    }),
  ];

  return config;
};