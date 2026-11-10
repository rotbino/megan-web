'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Shapes } from 'lucide-react';
import { ProductCard } from '@/components/products/product-card';
import { useRelatedProducts } from '@/lib/mock/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Product } from '@/lib/types';

/**
 * «محصولات مشابه» — گرید صفحه‌بندی‌شده (خواسته مالک ۱-۱۱ دور هفتم):
 * ~۲۰ آگهی در هر صفحه + صفحه‌بندی عددی؛ سورت از سرور = قانون طبیعی
 * (نردبان ← فروشندهٔ ویژه ← تازه‌ترین آپدیت) روی دسته/نوع مشابه.
 */
const PAGE_SIZE = 20;

export function SimilarProducts({ product }: { product: Product }) {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useRelatedProducts(product, page, PAGE_SIZE);

  const items = data?.items ?? [];
  const pageCount = data?.pageCount ?? 0;

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
  // بخش خالی رندر نمی‌شود (قانون حالت خالی — RULES.md §۱)
  if (items.length === 0 && pageCount === 0) return null;

  const pages = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
    (p) => p === 1 || p === pageCount || Math.abs(p - page) <= 2,
  );

  return (
    <section aria-labelledby="similar" className="mx-auto max-w-7xl px-4 lg:px-6">
      <h2 id="similar" className="mb-4 flex items-center gap-1.5 text-base font-extrabold lg:text-lg">
        <Shapes size={17} className="text-primary" />
        محصولات مشابه {product.subCategoryName}
        {data?.total ? (
          <span className="text-xs font-normal text-muted-foreground">({toFa(data.total)} آگهی)</span>
        ) : null}
      </h2>

      <div className={cn('grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4', isFetching && 'opacity-70')}>
        {items.map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      {/* صفحه‌بندی عددی — دکمه‌ها هم‌قد (قانون تناسب) */}
      {pageCount > 1 && (
        <nav aria-label="صفحه‌بندی محصولات مشابه" className="mt-6 flex items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            aria-label="صفحهٔ قبل"
            className="grid size-10 place-items-center rounded-md border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
          >
            <ChevronRight size={16} />
          </button>
          {pages.map((p, i) => (
            <span key={p} className="flex items-center gap-1.5">
              {i > 0 && p - pages[i - 1] > 1 && <span className="px-1 text-xs text-muted-foreground">…</span>}
              <button
                type="button"
                onClick={() => setPage(p)}
                aria-current={p === page ? 'page' : undefined}
                className={cn(
                  'grid size-10 place-items-center rounded-md border text-sm font-bold transition-colors',
                  p === page
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-primary',
                )}
              >
                {toFa(p)}
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={page >= pageCount}
            aria-label="صفحهٔ بعد"
            className="grid size-10 place-items-center rounded-md border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:opacity-40"
          >
            <ChevronLeft size={16} />
          </button>
        </nav>
      )}
    </section>
  );
}
