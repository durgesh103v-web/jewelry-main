/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://jewelry-main.onrender.com/api/:path*'
      }
    ]
  }
}

module.exports = nextConfig
