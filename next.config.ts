import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  poweredByHeader: false,
  images: {
    // Uploads get a new random name and never change, so resized copies can be kept for 31 days.
    minimumCacheTTL: 2678400,
    // News covers uploaded to Vercel Blob (lib/services/images.ts).
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
      // Dev-only placeholders from `npm run db:photos`; picsum redirects to fastly.picsum.photos.
      ...(process.env.NODE_ENV === "development"
        ? [
            { protocol: "https" as const, hostname: "picsum.photos" },
            { protocol: "https" as const, hostname: "fastly.picsum.photos" },
          ]
        : []),
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  cacheComponents: true,
  partialPrefetching: true,
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
