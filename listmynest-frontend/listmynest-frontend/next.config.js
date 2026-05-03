/** @type {import('next').NextConfig} */

function apiOriginFromEnv() {
  const raw = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080/v1")
    .trim()
    .replace(/\/+$/, "");
  return raw.replace(/\/v1$/i, "") || "http://localhost:8080";
}

function imageRemotePatterns() {
  const patterns = [];
  const su = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").trim();
  try {
    if (su) {
      const u = new URL(su.startsWith("http") ? su : `https://${su}`);
      patterns.push({
        protocol: "https",
        hostname: u.hostname,
        pathname: "/storage/**",
      });
    }
  } catch {
    /* ignore */
  }
  return patterns;
}

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  // Fix Windows/OneDrive EPERM on `.next/trace` by disabling file tracing.
  outputFileTracing: false,
  /** Baseline security headers for production deployments (complement TLS at CDN/reverse proxy). */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    remotePatterns: imageRemotePatterns(),
  },
  async rewrites() {
    const origin = apiOriginFromEnv();
    return [
      {
        source: "/mock-upload/:path*",
        destination: `${origin}/mock-upload/:path*`,
      },
      // Same-origin `/v1/*` when NEXT_PUBLIC_API_BASE_URL is unset (see lib/api.ts) — hits Spring on `origin`.
      {
        source: "/v1/:path*",
        destination: `${origin}/v1/:path*`,
      },
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);
