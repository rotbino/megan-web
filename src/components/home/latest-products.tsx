'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ProductImage } from '@/components/shared/product-image';
import { useProducts } from '@/lib/mock/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { stockFa } from '@/lib/format';

/** «جدیدترین محصولات» — ردیف افقی مثل باسکول: عکس + نام + موجودی */
export function LatestProducts() {
  const { data, isLoading } = useProducts({ sort: 'newest' });
  const items = data?.items ?? [];

  return (
    <section aria-labelledby="latest-products" className="mx-auto max-w-7xl px-4 py-6 lg:px-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 id="latest-products" className="text-base font-bold sm:text-lg">جدیدترین محصولات</h2>
        <Link href="/product-list" className="inline-flex items-center gap-0.5 text-sm font-semibold text-primary hover:underline">
          مشاهده همه
          <ChevronLeft size={16} />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 w-36 shrink-0 rounded-md sm:w-44" />)}
        </div>
      ) : (
        <div className="scroll-row">
          {items.map((p) => (
            <Link
              key={p.id}
              href={`/product-view/${p.slug}/${p.categoryName}/${p.id}`}
              className="w-36 shrink-0 overflow-hidden rounded-md border bg-card transition-shadow hover:shadow-md sm:w-44"
            >
              <ProductImage photos={p.photos} alt={p.productName} className="aspect-square w-full" iconSize={32} />
              <div className="p-2">
                <h3 className="line-clamp-1 text-xs font-bold leading-5 sm:text-[13px]">{p.productName}</h3>
                <h4 className="mt-0.5 text-[11px] font-normal text-muted-foreground">{stockFa(p.stock, p.unit)}</h4>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
