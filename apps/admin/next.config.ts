import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@reworth/ui-web"],
  reactStrictMode: true,
};

export default nextConfig;
