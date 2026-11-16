'use client';

import { useRouter } from 'next/navigation';
import { productListHref } from '@/lib/list-nav';

/**
 * همراه‌برندهٔ فیلترها برای لینک‌های سایدبار/مگامنو (خواستهٔ مالک ۱۷-۱۱):
 * درخت دسته‌ها Server Component است و هنگام رندر، فیلترهای فعالِ سمت
 * کلاینت را نمی‌بیند (layout به searchParams دسترسی ندارد). این پوستهٔ
 * کلاینت با «رویداد واگذارشده» کلیک روی هر لینک /product-list داخل خودش
 * را می‌گیرد و همان لینک را با کوئریِ فعلی URL به مقصد می‌بَرد — HTML سرور و
 * سئو عین قبل می‌ماند، کلیک چپ معمولی فیلترها را نگه می‌دارد و کلیک با
 * Ctrl/⌘/وسط (تب جدید) دست‌نخورده به مرورگر سپرده می‌شود.
 *
 * display: contents → خودش هیچ جعبه‌ای در چیدمان نمی‌سازد.
 */
export function CarryFilters({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div
      style={{ display: 'contents' }}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = (e.target as HTMLElement).closest?.('a');
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href || !href.startsWith('/product-list')) return;
        e.preventDefault();
        router.push(productListHref(href));
      }}
    >
      {children}
    </div>
  );
}
