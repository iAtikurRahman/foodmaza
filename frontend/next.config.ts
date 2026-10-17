import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Emit .next/standalone for the Docker runtime image (no full node_modules needed)
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
