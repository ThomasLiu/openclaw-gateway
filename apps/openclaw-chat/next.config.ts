import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3"],
  turbopack: {
    root: "..",
  },
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  eslint: {
    // Don't fail build on ESLint errors in production
    ignoreDuringBuilds: false,
  },
  typescript: {
    // Don't fail build on TS errors in production
    ignoreBuildErrors: false,
  },
};

export default nextConfig;
