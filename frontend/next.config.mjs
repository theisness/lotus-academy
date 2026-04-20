/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  webpack: (config) => {
    // pdf.js worker — copy to static chunks so it can be loaded via URL
    config.resolve.alias.canvas = false
    return config
  },
}

export default nextConfig
