import type { NextConfig } from "next";
import { existsSync } from "node:fs";

/**
 * ── آدرس بک‌اند — یک کلید برای همه ────────────────────────────────────────
 * BACKEND_URL جایگزین اصلی است (هم برای rewrites این‌جا، هم برای fetchهای SSR
 * در client.ts). BACKEND_ORIGIN برای سازگاری با .envهای قبلی پشتیبانی می‌شود.
 * در پروفایل لوکال نیازی به تغییر نیست — پیش‌فرض 127.0.0.1:4000 همان است.
 * برای استقرار ابری فقط همین یک متغیر را در .env عوض کنید.
 */
const BACKEND_URL =
  process.env.BACKEND_URL ?? process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:4000";

/**
 * ── تصاویر remote ────────────────────────────────────────────────────────────
 * سه منبع:
 *  1. ArvanCloud ما + CDN باسکول (دیتای seed و پروداکشن ابری)
 *  2. بک‌اند لوکال (APP_PROFILE=local بک‌اند → تصاویر از
 *     http://localhost:4000/uploads/... سرو می‌شوند) — پورت آزاد تا با تغییر
 *     PORT بک‌اند هم کار کند
 *  3. میزبان‌های اضافه از .env با کلید NEXT_IMAGE_HOSTS (با کاما جدا کنید؛
 *     فقط hostname نوشته شود، مثل: img.example.com,cdn.example.net)
 */
/** تایپ رسمی الگوی تصویر remote نکست — protocol فقط «http» | «https» است */
type RemotePattern = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>[number];

function imageRemotePatterns(): RemotePattern[] {
  const patterns: RemotePattern[] = [
    { protocol: "https", hostname: "daymatfilles.s3.ir-thr-at1.arvanstorage.ir" },
    { protocol: "https", hostname: "product-thumbnails.s3.ir-thr-at1.arvanstorage.ir" },
    // بک‌اند لوکال — پروفایل local (پورت آزاد تا با تغییر PORT بک‌اند هم کار کند)
    { protocol: "http", hostname: "localhost" },
    { protocol: "http", hostname: "127.0.0.1" },
  ];
  const extra = (process.env.NEXT_IMAGE_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  for (const hostname of extra) {
    patterns.push({ hostname });
  }
  return patterns;
}

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // ÙØ´Ø§ÙÚ¯Ø± dev ÙÚ©Ø³Øª Ø¯Ø± Ù¾Ø±Ø¯Ù Ø­Ø§ÙØª ØªÙØ³Ø¹Ù Ø¨Ø±Ø§Û Ø³Ø§ÛØª ØªØ³Øª Ø±Ø§Û ÙØ§ÙÚ© Ø®Ø§ÙÙØ´ Ø§Ø³Øª
  devIndicators: false,
  // ── dev سندباکس: اگر بک‌اند مگان کنار پروژه کلون شده باشد (megan-back/)،
  // توربوپک نباید آن را watch کند — سقف inotify پر می‌شود و کل سرور می‌میرد.
  // فقط وقتی پوشه وجود دارد فعال می‌شود (در استقرار واقعی بی‌اثر است).
  ...(existsSync("./megan-back")
    ? ({
        // watchOptions در تایپ رسمی TurbopackOptions نسخهٔ ۱۶.۴ نیست؛ رفتار
        // درست است و توربوپک اجرایی می‌شناسدش — فقط cast موضعی برای تایپ
        turbopack: { watchOptions: { ignored: ["**/megan-back/**", "megan-back/**"] } },
      } as NextConfig)
    : {}),
  // ── پروکسی API — بدون CORS، هم‌مبدأ ─────────────────────────────────────
  // درخواست‌های /api/** فرانت به بک‌اند مگان (NestJS :4000/api/v1) می‌روند.
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${BACKEND_URL}/api/v1/:path*`,
      },
    ];
  },
  images: {
    remotePatterns: imageRemotePatterns(),
  },
};

export default nextConfig;
