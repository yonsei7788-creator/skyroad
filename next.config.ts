import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
  outputFileTracingIncludes: {
    "/api/admin/reports/\\[id\\]/pdf": [
      "./node_modules/@sparticuz/chromium/bin/**",
      "./node_modules/.pnpm/@sparticuz+chromium@*/node_modules/@sparticuz/chromium/bin/**",
    ],
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
      ],
    },
  ],
};

export default nextConfig;
