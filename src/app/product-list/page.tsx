import type { Metadata } from 'next';
import {
  ProductListScreen,
  PRODUCT_LIST_TITLE,
  PRODUCT_LIST_DESC,
} from '@/components/products/product-list-screen';

// ISR (F5): صفحه بعد از اولین رندر کش می‌شود و در پس‌زمینه هر ۵ دقیقه
// بازتولید می‌شود — TTFB همیشه چند میلی‌ثانیه (به‌جای ~۶۰۰ms سردِ force-dynamic).
// useSearchParams داخل Suspense موجود است → با ISR سازگار؛ کوئری‌های فیلتر/جستجو
// مثل قبل فقط سمت کلاینت اجرا می‌شوند (SSR از اول فقط کوئری پیش‌فرض را می‌پخت).
export const revalidate = 300;

export const metadata: Metadata = {
  title: PRODUCT_LIST_TITLE,
  description: PRODUCT_LIST_DESC,
  alternates: { canonical: '/product-list' },
  openGraph: {
    title: `${PRODUCT_LIST_TITLE} | ایمچ`,
    description: 'آگهی‌های فروش عمده با قیمت روز؛ فیلتر دسته‌بندی، استان و شهر.',
    type: 'website',
  },
};

export default function ProductListPage() {
  // صفحهٔ ۱ — آدرس تمیز پایه (کنونیکال)؛ صفحه‌های بعدی از /product-list/[pageno]
  return <ProductListScreen page={1} />;
}
