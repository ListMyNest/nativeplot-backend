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

const nextConfig = {
  // Fix Windows/OneDrive EPERM on `.next/trace` by disabling file tracing.
  outputFileTracing: false,
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
    ];
  },
};

module.exports = nextConfig;
