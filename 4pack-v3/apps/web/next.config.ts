import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.FOURPACK_DIST_DIR || ".next",
  devIndicators: false,
  transpilePackages: ["@4pack/domain"],
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    resolveAlias: { "./operator.js": "../../packages/domain/src/operator.ts" },
  },
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
};

export default nextConfig;
