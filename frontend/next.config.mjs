/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // 禁用内置图片优化（项目使用 <img> 标签），避免打包 sharp 二进制（~19MB）
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    // pdf.js worker — disable canvas for SSR
    config.resolve.alias.canvas = false
    return config
  },
  turbopack: {
    resolveAlias: {
      canvas: { browser: '' },
    },
  },
}

export default nextConfig
