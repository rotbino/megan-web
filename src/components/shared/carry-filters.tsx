'use client';

import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useFilterState } from '@/components/products/filter-state';
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
 * (خواستهٔ مالک ۱۸-۱۱ دور ۲) روی صفحهٔ دسته، لینک‌های دسته (با data-slug/
 * data-name از CategoryFilterِ clientNav — <a> ساده) دیگر ناوبری سرور
 * نمی‌شوند: با navigateCategory فقط URL با pushState عوض می‌شود و کوئری
 * لیست از کش/فچ کلاینت جواب می‌گیرد — نوار فیلتر و دکمه‌های سورت هیچ‌گاه
 * اسکلت نمی‌گیرند و برگشت به دستهٔ قبلی فوری است. hover هم صفحهٔ ۱ مقصد را
 * پیش‌واکشی می‌کند تا خود کلیک هم فوری باشد.
 *
 * هندلر در فاز capture است تا برای لینک‌های next/link (مگامنو/لیست اصلی)
 * قبل از onClick خودِ Link اجرا شود — preventDefault ما آن را از ناوبری
 * بی‌فیلتر منصرف می‌کند و تنها ناوبریِ «همراه با فیلترها» انجام می‌شود.
 *
 * display: contents → خودش هیچ جعبه‌ای در چیدمان نمی‌سازد.
 */
export function CarryFilters({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const ctx = useFilterState();

  /** لینک دسته‌ای که سوییچ کلاینت‌ساید می‌شود — فقط داخل provider صفحهٔ دسته */
  const categoryLink = (a: HTMLAnchorElement): { slug: string; name: string } | null => {
    const href = a.getAttribute('href') ?? '';
    if (!ctx || !href.startsWith('/product-list/category/')) return null;
    const slug = a.dataset.slug;
    const name = a.dataset.name;
    return slug && name ? { slug, name } : null;
  };

  return (
    <div
      style={{ display: 'contents' }}
      onClickCapture={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const a = (e.target as HTMLElement).closest?.('a');
        if (!a) return;
        const href = a.getAttribute('href');
        if (!href || !href.startsWith('/product-list')) return;
        e.preventDefault();
        const cat = categoryLink(a);
        if (cat) {
          ctx!.navigateCategory(cat.slug, cat.name);
          return;
        }
        router.push(productListHref(href));
      }}
      onMouseOver={(e) => {
        // پیش‌واکشی hover — فقط لینک دستهٔ سوییچ‌شونده؛ اگر کش تازه باشد هیچ درخواستی نمی‌رود
        const a = (e.target as HTMLElement).closest?.('a');
        if (!a) return;
        const cat = categoryLink(a);
        if (cat) ctx!.prefetchCategory(cat.slug, queryClient);
      }}
    >
      {children}
    </div>
  );
}
