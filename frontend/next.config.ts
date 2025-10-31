import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Disable React Strict Mode in dev to avoid double-rendering and duplicate effect logs
  reactStrictMode: false,
  // Set the output file tracing root to fix workspace detection
  outputFileTracingRoot: __dirname,
  webpack: (config, { dev }) => {
    // Disable Webpack filesystem cache in dev to avoid ENOENT rename errors on Windows
    // This reduces unnecessary full reloads and noisy logs during Fast Refresh
    if (dev) {
      // Disable Webpack cache explicitly; supported in webpack 5
      // See: https://webpack.js.org/configuration/other-options/#cache
      (config as any).cache = false;
    }
    return config;
  },
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://family.thelodgegroup.id';
    return [
      { source: '/api/:path*', destination: `${apiUrl}/api/:path*` },
      { source: '/files/:path*', destination: `${apiUrl}/files/:path*` },
    ];
  },
};

export default nextConfig;
