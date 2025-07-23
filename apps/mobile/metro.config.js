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

// 3. Force Metro to resolve workspace packages correctly
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName.startsWith('@coachmeld/')) {
    // Resolve workspace packages
    const packageName = moduleName.split('/')[1];
    return {
      filePath: path.resolve(monorepoRoot, 'packages', packageName, 'src', 'index.ts'),
      type: 'sourceFile',
    };
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