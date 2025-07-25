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
  // Force production optimization
  swcMinify: true,
  // Preserve component displayNames in production
  productionBrowserSourceMaps: false,
  experimental: {
    // Ensure component names are preserved
    swcMinifyDebugOptions: {
      keep_fnames: true,
      keep_classnames: true,
    },
  },
  // Generate unique build ID to prevent chunk loading issues
  generateBuildId: async () => {
    // Use timestamp-based build ID to ensure fresh chunks
    return `coachmeld-admin-${Date.now()}`
  },
}

module.exports = nextConfig