/** @type {import('next').NextConfig} */
const gateway =
  process.env.NEXT_PUBLIC_GATEWAY_URL?.replace(/\/$/, '') ||
  'http://localhost:3000';

const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${gateway}/api/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
