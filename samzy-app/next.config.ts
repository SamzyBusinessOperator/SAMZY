import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "improved-acorn-5vq67p7wvxx7cpjw-3000.app.github.dev",
    "*.app.github.dev",
  ],

  experimental: {
    serverActions: {
      allowedOrigins: [
        "localhost:3000",
        "127.0.0.1:3000",
        "improved-acorn-5vq67p7wvxx7cpjw-3000.app.github.dev",
      ],
    },
  },
};

export default nextConfig;