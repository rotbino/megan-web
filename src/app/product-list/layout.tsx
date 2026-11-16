import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';

/**
 * هدر/فوتر پایدار خانوادهٔ لیست محصولات (خواستهٔ مالک ۱۷-۱۱):
 * قبلاً هدر و فوتر داخل هر صفحه رندر می‌شدند؛ در ناوبری App Router محتوای
 * صفحه با loading.tsx عوض می‌شود، پس کل صفحه — از جمله هدر — غیب می‌شد و
 * «حس رفرش کامل» می‌داد. حالا مال این layout‌اند و در هیچ ناوبری داخل
 * /product-list (دسته، جستجو، صفحه‌بندی) ریمونت نمی‌شوند؛ فقط محتوای لیست
 * عوض می‌شود.
 */
export default function ProductListLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
