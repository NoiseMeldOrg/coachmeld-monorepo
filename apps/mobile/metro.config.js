const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo
config.watchFolders = [
  monorepoRoot,
  projectRoot,
];

// 2. Tell Metro where to find node_modules
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Add web-specific platform extensions
config.resolver.platforms = ['web', 'ios', 'android', 'native'];
config.resolver.sourceExts = [...config.resolver.sourceExts, 'web.js', 'web.ts', 'web.tsx'];

// Add alias for React to ensure proper resolution
config.resolver.alias = {
  ...config.resolver.alias,
  'react': require.resolve('react'),
  // Only alias react-native to react-native-web for web platform
  ...(process.env.EXPO_PLATFORM === 'web' ? {
    'react-native': require.resolve('react-native-web'),
  } : {}),
};

// 3. Force Metro to resolve workspace packages correctly and handle web platform
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@coachmeld/')) {
    // Resolve workspace packages
    const packageName = moduleName.split('/')[1];
    return {
      filePath: path.resolve(monorepoRoot, 'packages', packageName, 'src', 'index.ts'),
      type: 'sourceFile',
    };
  }
  
  // Handle React Native web compatibility
  if (platform === 'web') {
    // Map React Native internal modules to react-native-web equivalents
    if (moduleName.includes('react-native/Libraries/Utilities/Platform')) {
      return {
        filePath: require.resolve('react-native-web/dist/exports/Platform'),
        type: 'sourceFile',
      };
    }
    
    // Handle other React Native internal utilities
    if (moduleName.includes('react-native/Libraries/')) {
      // Try to resolve from react-native-web first
      try {
        const webModule = moduleName.replace('react-native/Libraries/', 'react-native-web/dist/exports/');
        return {
          filePath: require.resolve(webModule),
          type: 'sourceFile',
        };
      } catch {
        // If not found in react-native-web, return empty module
        return {
          filePath: require.resolve('react-native-web/dist/exports/View'),
          type: 'sourceFile',
        };
      }
    }
  }
  
  // Default resolution for other modules
  return context.resolveRequest(context, moduleName, platform);
};

// 4. Include workspace packages in transformation
config.transformer.getTransformOptions = async () => ({
  transform: {
    experimentalImportSupport: false,
    inlineRequires: true,
  },
});

module.exports = config;