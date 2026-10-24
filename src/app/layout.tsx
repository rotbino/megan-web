import type { Metadata, Viewport } from "next";
import { Vazirmatn } from "next/font/google";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster";
import "./globals.css";

const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazir",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://megan.example.com"),
  title: {
    default: "مِگان | بازار خرید و فروش عمده محصولات بدون واسطه",
    template: "%s | مِگان",
  },
  description:
    "مِگان بازارگاه آنلاین خرید و فروش عمده محصولات است؛ ارتباط مستقیم خریداران و فروشندگان عمده، مشاهده قیمت روز کالاها و ثبت درخواست خرید بدون واسطه.",
  keywords: [
    "خرید عمده",
    "فروش عمده",
    "قیمت روز",
    "بازارگاه B2B",
    "بازار عمده ایران",
    "باسکول",
    "خریدار عمده",
    "فروشنده عمده",
  ],
  openGraph: {
    type: "website",
    locale: "fa_IR",
    siteName: "مِگان",
    title: "مِگان | بازار خرید و فروش عمده محصولات بدون واسطه",
    description: "ارتباط مستقیم خریداران و فروشندگان عمده در سراسر ایران",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className={`${vazir.variable} font-sans antialiased bg-background text-foreground`}>
        <Providers>
          <div className="flex min-h-screen flex-col">
            {children}
          </div>
          <Toaster />
        </Providers>
      </body>
    </html>
  );
}
