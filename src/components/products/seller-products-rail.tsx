'use client';

import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Store } from 'lucide-react';
import { ProductCard } from '@/components/products/product-card';
import { useSellerProducts } from '@/lib/mock/hooks';
import { RailSkeleton } from '@/components/shared/page-skeletons';
import type { Product } from '@/lib/types';

/**
 * «محصولات دیگر {فروشنده}» — ریل افقی صفحهٔ محصول (خواسته مالک ۱-۱۱ دور هفتم):
 * نوار اسکرول افقی که خودش هر ۱ ثانیه یک کارت جلو می‌رود (مکث ۱ ثانیه روی هر
 * محصول — عین خواستهٔ مالک)؛ با هاور/لمس/فوکوس می‌ایستد تا کاربر خودش بچرخد.
 * کارت‌ها سورت قانونی از سرور می‌آیند (نردبان ← ویژه ← آپدیت).
 * لیزی‌لود ۱۸-۱۱: این ریل داخل LazyOnView است — فچ فقط وقتی نزدیک ویوپورت
 * شود شروع می‌شود (این کامپوننت همان لحظه مونت می‌شود که کاربر نزدیک است).
 */
export function SellerProductsRail({
  sellerUserName,
  sellerName,
  excludeId,
}: {
  sellerUserName: string;
  sellerName: string;
  excludeId: number;
}) {
  const { data: products = [], isLoading } = useSellerProducts(sellerUserName, excludeId, 12);
  const railRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);

  // حرکت خودکار — هر ۱ ثانیه یک کارت، اسکرول نرم؛ با prefers-reduced-motion خاموش
  useEffect(() => {
    if (paused || products.length < 2) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    const timer = setInterval(() => {
      const el = railRef.current;
      if (!el) return;
      const card = el.querySelector<HTMLElement>('[data-rail-card]');
      const step = card ? card.offsetWidth + 10 : 240;
      // انتها که رسید برمی‌گردد اول (رفت و برگشت آرام برای پیوستگی)
      const atEnd = el.scrollLeft <= -(el.scrollWidth - el.clientWidth - 8);
      if (atEnd) el.scrollTo({ left: 0, behavior: 'smooth' });
      else el.scrollBy({ left: -step, behavior: 'smooth' });
    }, 1000);
    return () => clearInterval(timer);
  }, [paused, products.length]);

  const nudge = (dir: 1 | -1) => {
    const el = railRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('[data-rail-card]');
    const step = card ? card.offsetWidth + 10 : 240;
    el.scrollBy({ left: dir * -step, behavior: 'smooth' });
  };

  if (isLoading) {
    return <RailSkeleton />;
  }
  if (products.length === 0) return null;

  return (
    <section
      aria-labelledby="seller-rail"
      className="mx-auto max-w-7xl px-4 lg:px-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 id="seller-rail" className="flex items-center gap-1.5 text-base font-extrabold lg:text-lg">
          <Store size={17} className="text-primary" />
          محصولات دیگر {sellerName}
        </h2>
        {/* دکمه‌های چرخش دسکتاپ — هم‌قد (قانون تناسب) */}
        <div className="hidden gap-1.5 nav-desktop:flex">
          <button
            type="button"
            onClick={() => nudge(1)}
            aria-label="قبلی"
            className="grid size-8 place-items-center rounded-md border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <ChevronRight size={16} />
          </button>
          <button
            type="button"
            onClick={() => nudge(-1)}
            aria-label="بعدی"
            className="grid size-8 place-items-center rounded-md border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
          >
            <ChevronLeft size={16} />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        dir="rtl"
        className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1"
        role="list"
        aria-label={`محصولات دیگر ${sellerName}`}
      >
        {products.map((p) => (
          // هم‌قدی کارت‌ها (RULES.md §۱): wrapper کش می‌آید و article با flex-1
          // کل ارتفاعش را پر می‌کند — کارت با متن کوتاه/بلند هم‌قد می‌ماند
          <div key={p.id} data-rail-card role="listitem" className="flex w-56 shrink-0 flex-col md:w-60 [&>article]:flex-1">
            <ProductCard product={p} priority={false} />
          </div>
        ))}
      </div>
    </section>
  );
}
