import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root — other lockfiles exist higher up the tree.
  turbopack: {
    root: path.join(__dirname),
  },
};

export default nextConfig;
