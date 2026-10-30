/**
 * آدرس عمومی سایت — برای metadataBase و URLهای مطلق JSON-LD.
 * در پروداکشن: NEXT_PUBLIC_SITE_URL=https://imach.ir
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://imach.example.com'
).replace(/\/+$/, '');
