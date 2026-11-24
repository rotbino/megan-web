'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ChevronDown, Loader2, Shapes } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/products/product-card';
import { useInfiniteRelatedProducts } from '@/lib/mock/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { toFa } from '@/lib/format';
import type { Paged } from '@/lib/mock/api';
import type { Product } from '@/lib/types';

/**
 * «محصولات مشابه» — اسکرول بی‌پایان عین صفحهٔ لیست محصولات (خواستهٔ مالک ۱۶-۱۱):
 * صفحهٔ ۱ از SSR داخل HTML اولیه می‌نشیند؛ صفحه‌های بعد با رسیدن اسکرول به
 * انتهای گرید به‌هم می‌چسبند. در پایان هر صفحهٔ لودشده (به‌جز آخرین) دکمهٔ
 * «نمایش آگهی‌های مشابه بیشتر» هست — یک <a href> واقعی به ?sp=N تا گوگل، که
 * اسکرول نمی‌کند، بتواند صفحات بعدی را دنبال و ناوبری کند؛ برای کاربرِ
 * جاوااسکریپت‌دار کلیک = لود درجا (preventDefault) — عین product-listing.
 */
const PAGE_SIZE = 20;

/** سقف بارگیری خودکار هنگام ورود مستقیم با ?sp=N (مثلاً از گوگل) — جلوگیری از
 *  fetch بی‌شمار با لینک دست‌ساز؛ فراتر از آن فقط دکمهٔ سادهٔ کلیکی هست */
const AUTO_LOAD_CAP = 50;

/** پارامتر ?sp=N (صفحهٔ مشابه‌ها) — خواندن از window در افکت، نه useSearchParams:
 *  صفحهٔ آگهیت ISR/کش می‌ماند و به رندر داینامیک سقوط نمی‌کند */
function readSimilarPageParam(): number {
  if (typeof window === 'undefined') return 1;
  const raw = new URLSearchParams(window.location.search).get('sp');
  const n = Number.parseInt(raw ?? '', 10);
  return Number.isFinite(n) && n > 1 ? n : 1;
}

export function SimilarProducts({
  product,
  basePath,
  initialData,
}: {
  product: Product;
  /** آدرس تمیز همین آگهی — پایهٔ ساخت لینک ?sp=N برای گوگل */
  basePath: string;
  initialData?: Paged<Product> | null;
}) {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteRelatedProducts(product, PAGE_SIZE, initialData ?? undefined);

  // مسطح‌سازی + ضدتکرار (تغییر داده بین fetchهای صفحه‌ای نباید کارت تکراری بیاورد)
  const items = useMemo(() => {
    const seen = new Set<number>();
    const out: Product[] = [];
    for (const pg of data?.pages ?? []) {
      for (const p of pg.items) {
        if (!seen.has(p.id)) {
          seen.add(p.id);
          out.push(p);
        }
      }
    }
    return out;
  }, [data]);

  const loadedCount = data?.pages.length ?? 0;
  const total = data?.pages.at(-1)?.total ?? 0;

  /** ورود مستقیم با ?sp=N (از گوگل/لینک اشتراکی): صفحات تا N به‌ترتیب لود می‌شوند
   *  و بعد URL بی‌سروصدا به آدرس تمیز برمی‌گردد (هم‌راستا با canonical) */
  const spRef = useRef(0);
  useEffect(() => {
    const target = Math.min(readSimilarPageParam(), AUTO_LOAD_CAP);
    if (target <= 1 || spRef.current === target) return;
    spRef.current = target;
    let alive = true;
    (async () => {
      for (let i = 1; i < target; i++) {
        const r = await fetchNextPage().catch(() => null);
        if (!alive || !r || !r.hasNextPage) break;
      }
      if (alive) window.history.replaceState(null, '', window.location.pathname);
    })();
    return () => {
      alive = false;
    };
    // فقط یک‌بار روی mount — fetchNextPage شناسهٔ پایداری دارد و key کوئری عوض نمی‌شود
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** نگهبان انتهای گرید — ۱۲۰۰px قبل از رسیدن کاربر به انتها صفحهٔ بعد را می‌خواهد */
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting) && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: '1200px 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-7xl px-4 lg:px-6" aria-busy>
        <Skeleton className="mb-4 h-6 w-40" />
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-md" />
          ))}
        </div>
      </section>
    );
  }
  // بخش خالی رندر نمی‌شود (قانون حالت خالی — RULES.md §۱)؛ ملاک خودِ آیتم‌هاست
  // (total=0 → هیچ مشابه‌ای نیست)
  if (items.length === 0) return null;

  /** اولین صفحهٔ لودنشده — مقصد لینک «نمایش بیشتر» (عین product-listing) */
  const firstUnloaded = loadedCount + 1;
  const crawlable = firstUnloaded <= AUTO_LOAD_CAP;

  return (
    <section aria-labelledby="similar" className="mx-auto max-w-7xl px-4 lg:px-6">
      <h2 id="similar" className="mb-4 flex items-center gap-1.5 text-base font-extrabold lg:text-lg">
        <Shapes size={17} className="text-primary" />
        محصولات مشابه {product.subCategoryName}
        {total ? (
          <span className="text-xs font-normal text-muted-foreground">({toFa(total)} آگهی)</span>
        ) : null}
      </h2>

      <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {/* ─── اسکرول بی‌پایان: لینک «نمایش بیشتر» سئو (خواستهٔ مالک ۱۶-۱۱) ───
          موتور جستجو نمی‌تواند اسکرول کند — این <a href> واقعی به ?sp=صفحهٔ بعدی
          می‌رود و زنجیرهٔ کشف گوگل را زنده نگه می‌دارد؛ برای کاربرِ جاوااسکریپت‌دار
          کلیک = لود درجا (preventDefault)؛ صفحهٔ آخر → دکمه حذف می‌شود */}
      {hasNextPage && (
        <div className="flex flex-col items-center gap-2 pt-6">
          {crawlable ? (
            <Button asChild variant="outline" className="gap-1.5 rounded-md px-6 font-bold">
              <a
                href={`${basePath}?sp=${firstUnloaded}`}
                onClick={(e) => {
                  e.preventDefault();
                  if (!isFetchingNextPage) void fetchNextPage();
                }}
              >
                {isFetchingNextPage ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <ChevronDown size={15} />
                )}
                نمایش آگهی‌های مشابه بیشتر
              </a>
            </Button>
          ) : (
            /* فراتر از سقف بارگیری خودکار — URL مهاجر ندارد؛ دکمهٔ سادهٔ کلیکی */
            <Button
              variant="outline"
              className="gap-1.5 rounded-md px-6 font-bold"
              disabled={isFetchingNextPage}
              onClick={() => void fetchNextPage()}
            >
              {isFetchingNextPage ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <ChevronDown size={15} />
              )}
              نمایش آگهی‌های مشابه بیشتر
            </Button>
          )}
        </div>
      )}

      {/* پایان لیست — همهٔ آگهی‌ها دیده شد */}
      {!isLoading && items.length > 0 && !hasNextPage && loadedCount > 1 && (
        <p className="pt-3 text-center text-xs text-muted-foreground">
          همهٔ {toFa(total)} آگهی این لیست نمایش داده شد
        </p>
      )}

      {/* نگهبان اسکرول — ۱۲۰۰px قبل از رسیدن به انتها صفحهٔ بعد را می‌خواهد */}
      <div ref={sentinelRef} aria-hidden className="h-px" />
    </section>
  );
}
