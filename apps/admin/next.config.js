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
}

module.exports = nextConfig