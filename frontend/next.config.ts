import type { NextConfig } from "next";

const INTERNAL_BACKEND_PORT = process.env.SELECTA_INTERNAL_BACKEND_PORT || "8081";
const INTERNAL_BACKEND_HOST =
  process.env.SELECTA_INTERNAL_BACKEND_HOST || "127.0.0.1";
const INTERNAL_BACKEND_SCHEME =
  process.env.SELECTA_INTERNAL_BACKEND_SCHEME || "http";

const nextConfig: NextConfig = {
  output: "standalone",
  webpack(config) {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...(config.resolve.fallback || {}),
      canvas: false,
    };
    return config;
  },
  async rewrites() {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return [];
    }
    const destinationBase = process.env.SELECTA_INTERNAL_BACKEND_URL
      ? process.env.SELECTA_INTERNAL_BACKEND_URL.replace(/\/+$/, "")
      : `${INTERNAL_BACKEND_SCHEME}://${INTERNAL_BACKEND_HOST}:${INTERNAL_BACKEND_PORT}`;

    return [
      {
        source: "/run",
        destination: `${destinationBase}/run`,
      },
      {
        source: "/run_sse",
        destination: `${destinationBase}/run_sse`,
      },
      {
        source: "/apps/:path*",
        destination: `${destinationBase}/apps/:path*`,
      },
      {
        source: "/docs",
        destination: `${destinationBase}/docs`,
      },
      {
        source: "/openapi.json",
        destination: `${destinationBase}/openapi.json`,
      },
    ];
  },
};

export default nextConfig;
