import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@reworth/ui-web", "@reworth/shared"],
  reactStrictMode: true,
};

export default nextConfig;
