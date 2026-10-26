import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // ── پروکسی API — بدون CORS، هم‌مبدأ ─────────────────────────────────────
  // درخواست‌های /api/** فرانت به بک‌اند مگان (NestJS :4000/api/v1) می‌روند.
  // در استقرار پروداکشن فقط BACKEND_ORIGIN در .env عوض می‌شود.
  async rewrites() {
    const backend = process.env.BACKEND_ORIGIN ?? "http://localhost:4000";
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/v1/:path*`,
      },
    ];
  },
  // ── تصاویر remote — ArvanCloud ما + CDN باسکول (دیتای seed) ──────────────
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "daymatfilles.s3.ir-thr-at1.arvanstorage.ir" },
      { protocol: "https", hostname: "product-thumbnails.s3.ir-thr-at1.arvanstorage.ir" },
    ],
  },
};

export default nextConfig;
