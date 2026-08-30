import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Geolocation allowed for operator satellite-link status strip
    value: "camera=(), microphone=(), geolocation=(self)",
  },
  {
    // Clerk bot protection uses Cloudflare Turnstile; without these
    // origins the captcha iframe/script fails to load.
    // https://developers.cloudflare.com/turnstile/reference/content-security-policy/
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      [
        "script-src",
        "'self'",
        "'unsafe-inline'",
        "'unsafe-eval'",
        "https://*.clerk.accounts.dev",
        "https://clerk.com",
        "https://*.clerk.com",
        "https://challenges.cloudflare.com",
      ].join(" "),
      "style-src 'self' 'unsafe-inline' https://challenges.cloudflare.com",
      [
        "img-src",
        "'self'",
        "data:",
        "blob:",
        "https://*.clerk.com",
        "https://img.clerk.com",
        "https://challenges.cloudflare.com",
        // Free map basemap tiles (no API keys)
        "https://*.basemaps.cartocdn.com",
        "https://*.cartocdn.com",
        "https://*.tile.openstreetmap.org",
        "https://server.arcgisonline.com",
        "https://services.arcgisonline.com",
        "https://*.arcgisonline.com",
      ].join(" "),
      "font-src 'self' data:",
      [
        "connect-src",
        "'self'",
        "https://*.convex.cloud",
        "wss://*.convex.cloud",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://clerk.com",
        "https://challenges.cloudflare.com",
        "https://*.basemaps.cartocdn.com",
        "https://*.cartocdn.com",
        "https://server.arcgisonline.com",
        "https://services.arcgisonline.com",
        "https://*.arcgisonline.com",
        // Operator IP / coarse geo for satellite-link status
        "https://api.ipify.org",
        "https://ipapi.co",
      ].join(" "),
      [
        "frame-src",
        "'self'",
        "https://*.clerk.accounts.dev",
        "https://*.clerk.com",
        "https://challenges.cloudflare.com",
      ].join(" "),
      "child-src 'self' blob: https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "base-uri 'self'",
      "form-action 'self' https://*.clerk.accounts.dev https://*.clerk.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["satellite.js"],
  turbopack: {
    root: process.cwd(),
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
