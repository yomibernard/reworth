import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' http://localhost:3001 https:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@reworth/ui-web", "@reworth/shared"],
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  /**
   * Public storefront lives at `/u/[handle]` (API: GET /storefronts/:handle).
   * Production vanity `/@handle` can rewrite here via reverse proxy or:
   * `{ source: '/@:handle', destination: '/u/:handle' }` when the host supports it.
   * Next.js App Router cannot use `app/@[handle]` (reserved for parallel routes).
   */
  async rewrites() {
    return [];
  },
};

export default nextConfig;
