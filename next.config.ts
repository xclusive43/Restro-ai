import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Firebase Storage images are served via Google's CDN already.
    // Next.js image optimization adds a redundant fetch that times out.
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "firebasestorage.googleapis.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
