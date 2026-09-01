import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  async redirects() {
    return [{ source: "/qgis", destination: "/gis", permanent: true }];
  },
};

export default nextConfig;
