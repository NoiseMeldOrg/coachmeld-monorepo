const createExpoWebpackConfigAsync = require('@expo/webpack-config');
const webpack = require('webpack');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Ensure React is available globally for web builds
  config.resolve.alias = {
    ...config.resolve.alias,
    'react': require.resolve('react'),
    'react-dom': require.resolve('react-dom'),
    'react-native': 'react-native-web',
  };

  // Ensure proper module resolution for web
  config.resolve.extensions = [
    '.web.js',
    '.web.jsx', 
    '.web.ts',
    '.web.tsx',
    ...config.resolve.extensions,
  ];

  // Add ProvidePlugin to make React globally available
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      React: 'react',
    }),
  ];

  return config;
};