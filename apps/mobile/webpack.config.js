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

  // Add ProvidePlugin to make React and hooks globally available
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      React: 'react',
      // Also provide individual hooks globally
      useState: ['react', 'useState'],
      useEffect: ['react', 'useEffect'],
      useCallback: ['react', 'useCallback'],
      useMemo: ['react', 'useMemo'],
      useRef: ['react', 'useRef'],
      useContext: ['react', 'useContext'],
    }),
  ];

  // Add entry point modification to ensure React is loaded first
  const originalEntry = config.entry;
  config.entry = async () => {
    const entries = await (typeof originalEntry === 'function' ? originalEntry() : originalEntry);
    
    // Ensure React is loaded before anything else
    if (typeof entries === 'object' && !Array.isArray(entries)) {
      Object.keys(entries).forEach(key => {
        if (Array.isArray(entries[key])) {
          entries[key] = [require.resolve('react'), ...entries[key]];
        } else {
          entries[key] = [require.resolve('react'), entries[key]];
        }
      });
    }
    
    return entries;
  };

  return config;
};