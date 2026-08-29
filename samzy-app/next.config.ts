import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "organic-space-parakeet-jr56pwpxr4wg25jrv-3000.app.github.dev",
    "*.app.github.dev",
  ],

  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "organic-space-parakeet-jr56pwpxr4wg25jrv-3000.app.github.dev",
      ],
    },
  },
};

export default nextConfig;