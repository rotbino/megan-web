import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
import { BaseDataProvider } from "@/lib/base-data";
import { getCategoryTreeSSR, getProvincesSSR } from "@/lib/mock/api";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  manifest: "/manifest.webmanifest",
  title: {
    default: "ایمچ | بازار خرید و فروش عمده بدون واسطه",
    template: "%s | ایمچ",
  },
  description:
    "ایمچ بازار خرید و فروش عمده است؛ ارتباط مستقیم خریداران و فروشندگان عمده، مشاهده قیمت روز کالاها و ثبت درخواست خرید بدون واسطه.",
  applicationName: "ایمچ",
  keywords: [
    "خرید عمده",
    "فروش عمده",
    "قیمت روز",
    "بازار عمده",
    "خریدار عمده",
    "فروشنده عمده",
    "ایمچ",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "ایمچ",
    title: "ایمچ | بازار خرید و فروش عمده بدون واسطه",
    description: "ارتباط مستقیم خریداران و فروشندگان عمده در سراسر ایران",
  },
  twitter: {
    card: "summary_large_image",
    title: "ایمچ | بازار خرید و فروش عمده بدون واسطه",
    description: "ارتباط مستقیم خریداران و فروشندگان عمده در سراسر ایران",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png" }],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#A62626",
  width: "device-width",
  initialScale: 1,
};

/**
 * سرویس‌ورکر (اعلان‌ها و PWA) — فقط در پروداکشن ثبت می‌شود.
 * در dev: خودترمیمی — SWهای به‌جامانده از اجرای قبلیِ پروداکشن (next start)
 * و همه‌ی کش‌هایشان را پاک می‌کند؛ وگرنه SW قدیمی چیپ‌های کهنه سرو می‌کند و
 * خطای «module factory is not available» می‌گیرد.
 */
function ServiceWorkerRegister() {
  if (process.env.NODE_ENV === "production") {
    return (
      <script
        id="sw-register"
        dangerouslySetInnerHTML={{
          __html: `if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/sw.js').catch(function(){})})}`,
        }}
      />
    );
  }
  return (
    <script
      id="sw-unregister"
      dangerouslySetInnerHTML={{
        __html: `(function(){function clean(){try{if('serviceWorker' in navigator){navigator.serviceWorker.getRegistrations().then(function(rs){for(var i=0;i<rs.length;i++)rs[i].unregister()})}if(window.caches&&caches.keys){caches.keys().then(function(ks){for(var i=0;i<ks.length;i++)caches.delete(ks[i])})}}catch(e){}}if(document.readyState==='complete')clean();else window.addEventListener('load',clean)})()`,
      }}
    />
  );
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // داده‌های پایه (درخت دسته + استان‌ها) — یک fetch سرورِ کش‌شده برای کل اپ.
  // به کلاینت seed می‌شوند تا هیدریشن با HTML سرور یکسان باشد (رفع React #418
  // و CLS ۰.۴ ناشی از بازتولید کل درخت) و مگامنو/سایدبار از اول پُر رندر شوند.
  // در صفحات ایستا با revalidate صفحه در build پخته می‌شود؛ در خطا undefined → fetch کلاینت.
  const [tree, provinces] = await Promise.all([getCategoryTreeSSR(3600), getProvincesSSR(3600)]);

  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>
          <BaseDataProvider tree={tree ?? undefined} provinces={provinces ?? undefined}>
            <div className="flex min-h-screen flex-col">{children}</div>
            <MobileBottomNav />
            <Toaster />
          </BaseDataProvider>
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
