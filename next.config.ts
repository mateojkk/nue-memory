import type { NextConfig } from "next";

// Content-Security-Policy shaped to what the app actually talks to:
// first-party app, Magic email auth (iframe + API), Supabase, Livepeer Agent
// + media CDNs, Walrus relayer, and inline scripts/styles that Next.js and
// Tailwind require to hydrate. Tighten further only after watching console
// violations in production - an over-strict CSP breaks auth silently.
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://auth.magic.link",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://auth.magic.link https://*.magic.link https://*.supabase.co https://agent.livepeer.org https://*.livepeer.org https://*.livepeer.cloud https://storage.googleapis.com https://*.fal.media https://v3b.fal.media https://relayer.memory.walrus.xyz wss://*.magic.link",
  "frame-src https://auth.magic.link",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');

const nextConfig: NextConfig = {
  serverExternalPackages: ["@mysten-incubation/memwal", "@noble/ed25519", "@noble/hashes"],
  outputFileTracingRoot: __dirname,
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'Content-Security-Policy', value: contentSecurityPolicy },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      ],
    },
  ],
  rewrites: async () => {
    return [
      {
        source: "/api/py/:path*",
        destination:
          process.env.NODE_ENV === "development"
            ? "http://127.0.0.1:8000/api/py/:path*"
            : "/api/index.py",
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
};

export default nextConfig;
