import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['platform.lvh.me', '*.platform.lvh.me'],
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
};

export default nextConfig;
