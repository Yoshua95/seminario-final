import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.FOURPACK_DIST_DIR || ".next",
  devIndicators: false,
  transpilePackages: ["@4pack/domain"],
  serverExternalPackages: ["@electric-sql/pglite"],
  turbopack: {
    ...(process.env.FOURPACK_TURBOPACK_ROOT
      ? { root: process.env.FOURPACK_TURBOPACK_ROOT }
      : {}),
    resolveAlias: {
      "./operator.js": "../../packages/domain/src/operator.ts",
      "./quotes.js": "../../packages/domain/src/quotes.ts",
      "./cargo-publication.js":
        "../../packages/domain/src/cargo-publication.ts",
    },
  },
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
};

export default nextConfig;
