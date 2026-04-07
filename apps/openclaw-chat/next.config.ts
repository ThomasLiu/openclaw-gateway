import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "ws"],
  async rewrites() {
    return [
      {
        source: '/api/gw/:path*',
        destination: 'http://127.0.0.1:18789/:path*',
      },
    ];
  },
};

export default withNextIntl(nextConfig);
