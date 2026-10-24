'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { ProductCard } from '@/components/products/product-card';
import { useProducts } from '@/lib/mock/hooks';
import { Skeleton } from '@/components/ui/skeleton';
import { toFa } from '@/lib/format';

/** جدیدترین آگهی‌های عمده — با React Query (کش فرانت) */
export function LatestProducts() {
  const { data, isLoading } = useProducts({ sort: 'newest' });
  const items = data?.items ?? [];

  return (
    <section aria-labelledby="latest" className="mx-auto max-w-7xl px-4 py-10 lg:px-6">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h2 id="latest" className="text-xl font-extrabold sm:text-2xl">جدیدترین آگهی‌های عمده</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            {data ? `${toFa(data.total)} آگهی فعال در بازار` : 'در حال دریافت…'}
          </p>
        </div>
        <Link href="/product-list" className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
          مشاهده همه
          <ChevronLeft size={16} />
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {items.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </section>
  );
}
