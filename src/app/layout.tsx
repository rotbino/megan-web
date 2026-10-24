import type { Metadata, Viewport } from "next";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://imach.example.com"),
  manifest: "/manifest.webmanifest",
  title: {
    default: "ایمچ | بازار خرید و فروش عمده محصولات بدون واسطه",
    template: "%s | ایمچ",
  },
  description:
    "ایمچ بازار خرید و فروش عمده محصولات است؛ ارتباط مستقیم خریداران و فروشندگان عمده، مشاهده قیمت روز کالاها و ثبت درخواست خرید بدون واسطه.",
  keywords: [
    "خرید عمده",
    "فروش عمده",
    "قیمت روز",
    "بازار عمده",
    "خریدار عمده",
    "فروشنده عمده",
    "ایمچ",
  ],
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "ایمچ",
    title: "ایمچ | بازار خرید و فروش عمده محصولات بدون واسطه",
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

/** ثبت سرویس‌ورکر (اعلان‌ها و PWA) — فقط در پروداکشن */
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
  return null;
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <Providers>
          <div className="flex min-h-screen flex-col">{children}</div>
          <Toaster />
        </Providers>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
