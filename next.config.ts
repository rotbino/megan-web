import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createConnection } from "node:net";

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
  // ── dev سندباکس/پیش‌نمایش: درخواست‌های cross-origin به منابع dev نکست
  // (HMR و غیره) به‌طور پیش‌فرض مسدود می‌شوند؛ بدون این لیست، اتصال HMR
  // مرورگرِ پیش‌نمایش رد می‌شود و کلاینت (هیدریشن/تعامل‌ها) از کار می‌افتد.
  // فقط در dev خوانده می‌شود؛ در پروداکشن بی‌اثر است.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  devIndicators: false,
  // ── آپلود فایل‌های بزرگ (رفع باگ ۱۰-۱۱: MULTIPART_TRUNCATED) ─────────────
  // پراکسی داخلی dev نکست ۱۵.۵+ بدنهٔ درخواست‌های پروکسی‌شده را با سقف
  // پیش‌فرض ۱۰MB بافر می‌کند و مازاد آن را «بی‌صدا» می‌بُرد — مدارک احراز
  // هویت تا ۴ فایل × ۵MB = ۲۰MB است؛ استریم ناقص به بک‌اند می‌رسد و
  // busboy خطای MULTIPART_TRUNCATED می‌دهد. سقف را تا ۳۰MB بالا می‌بریم
  // (فرانت علاوه بر آن، تصاویر مدارک را سمت کلاینت فشرده می‌کند).
  experimental: {
    proxyClientMaxBodySize: "30mb",
  },
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
  // ── ریدایرکت مسیر قدیمی کاتالوگ — پوشهٔ مسیر از /catalog به /c تغییر
  // نام یافت (خواستهٔ مالک ۱۰-۱۱ دور ۴؛ مختصرشدهٔ کاتالوگ)؛ لینک‌های
  // قبلی و ایندکس‌های موتور جستجو به آدرس تازه هدایت می‌شوند.
  async redirects() {
    return [
      {
        source: "/catalog/:path*",
        destination: "/c/:path*",
        permanent: true,
      },
    ];
  },
  images: {
    remotePatterns: imageRemotePatterns(),
  },
};

// ── سندباکس پیش‌نمایش: بک‌اند استاب (:4000) ──────────────────────────────
// محیط پیش‌نمایش بین پیام‌ها ری‌استارت می‌شود و فقط خودِ dev دوباره بالا
// می‌آید؛ بدون بک‌اند رزولور شهر/دسته خالی می‌شود → باکس «بازار عمده
// شهرها» مخفی و صفحه‌های /city/* و دسته‌ها 404 (باگ ۹-۱۱). پس در هر بوتِ
// dev، اگر نشانگر ".sandbox-preview" در ریشه باشد (gitignore — روی ماشین
// مالک وجود ندارد) و پورت ۴000 خالی باشد (بک‌اند واقعی مگان زنده است)،
// استاب با همین nodeِ پروسه detached بالا می‌آید. در بیلد/پروداکشن و
// ماشین مالک کاملاً بی‌اثر است.
// استاب endpoints شهر/دسته/لیست + صفحهٔ کالا + چت (بازبینی بصری) را پاسخ
// می‌دهد — scripts/stub-backend.mjs را ببینید.
function sandboxStubBackend(): void {
  if (process.env.NODE_ENV !== "development") return;
  if (!existsSync("./.sandbox-preview") || !existsSync("./scripts/stub-backend.mjs")) return;
  const portOpen = (port: number): Promise<boolean> =>
    new Promise((resolve) => {
      const sock = createConnection({ port, host: "127.0.0.1" });
      const done = (ok: boolean) => {
        sock.destroy();
        resolve(ok);
      };
      sock.setTimeout(800, () => done(false));
      sock.on("connect", () => done(true));
      sock.on("error", () => done(false));
    });
  void (async () => {
    try {
      if (await portOpen(4000)) return; // بک‌اند/استاب قبلی زنده است
      const child = spawn(process.execPath, ["scripts/stub-backend.mjs"], {
        detached: true,
        stdio: "ignore",
        cwd: process.cwd(),
      });
      child.unref();
      console.log("[sandbox] بک‌اند استاب پیش‌نمایش روی :4000 بالا آمد");
    } catch {
      /* بالابر ناموفق — پیش‌نمایش بدون دیتا ادامه می‌دهد */
    }
  })();
}
sandboxStubBackend();

export default nextConfig;

