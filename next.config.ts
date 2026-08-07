import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async redirects() {
    return [
      // Legacy Vietnamese paths from localePrefix "as-needed" + localized pathnames
      {
        source: "/tin-tuc/:slug",
        destination: "/vi/news/:slug",
        permanent: true,
      },
      {
        source: "/trang/:slug",
        destination: "/vi/pages/:slug",
        permanent: true,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/media/:path*",
        destination: "/api/media/:path*",
      },
    ];
  },
};

export default withNextIntl(nextConfig);
