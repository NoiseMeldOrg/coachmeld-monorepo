/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'i.ytimg.com'], // Added YouTube thumbnails
  },
  // Disable powered by header for security
  poweredByHeader: false,
  // Compress responses
  compress: true,
  // Server Actions are enabled by default in Next.js 14+
  eslint: {
    // Skip ESLint during production builds since it's a devDependency
    ignoreDuringBuilds: true
  },
  // Preserve component displayNames in production
  productionBrowserSourceMaps: false,
  
  // Generate build ID based on git commit + package version for stability
  generateBuildId: async () => {
    try {
      // Try to get git commit hash for more stable builds
      const { execSync } = require('child_process')
      const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
      const packageJson = require('./package.json')
      return `coachmeld-admin-${packageJson.version}-${gitHash}`
    } catch (error) {
      // Fallback to package version + timestamp if git is not available
      const packageJson = require('./package.json')
      return `coachmeld-admin-${packageJson.version}-${Date.now().toString(36)}`
    }
  },
  
  // Experimental features for chunk loading optimization
  experimental: {
    // Improve chunk loading reliability
    optimizeCss: false, // Disable CSS optimization that can cause chunk issues
  },
  
  // Configure webpack for better chunk loading
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Improve chunk loading reliability in production
      config.optimization.splitChunks = {
        ...config.optimization.splitChunks,
        cacheGroups: {
          ...config.optimization.splitChunks.cacheGroups,
          // Create more stable chunks
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
            priority: 10,
          },
          common: {
            minChunks: 2,
            chunks: 'all',
            name: 'common',
            priority: 5,
          },
        },
      }
    }
    return config
  },
}

module.exports = nextConfig