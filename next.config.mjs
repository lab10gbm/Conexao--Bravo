/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  // Allows gradual migration alongside Vite
  typescript: {
    ignoreBuildErrors: false,
  },
  agentRules: false,
};

export default nextConfig;
