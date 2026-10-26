import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import { MobileBottomNav } from "@/components/layout/mobile-bottom-nav";
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
  themeColor: "#33415c",
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

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>
          <div className="flex min-h-screen flex-col">{children}</div>
          <MobileBottomNav />
          <Toaster />
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
