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
    <section
      aria-labelledby="latest-products"
      className="mx-auto max-w-7xl px-4 py-6 lg:px-6 nav-desktop:mt-6 nav-desktop:rounded-lg nav-desktop:border nav-desktop:border-border/70 nav-desktop:bg-card nav-desktop:shadow-sm"
    >
      <div className="mb-3 flex h-10 items-center justify-between nav-desktop:mb-4">
        <h2 id="latest-products" className="text-base font-medium leading-7 nav-desktop:text-xl">جدیدترین محصولات</h2>
        <Link
          href="/product-list"
          className="inline-flex h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-primary transition-colors hover:bg-secondary"
        >
          مشاهده همه
          <ChevronLeft size={24} />
        </Link>
      </div>

      {isLoading ? (
        <div className="flex gap-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 w-36 shrink-0 rounded-md sm:w-44" />)}
        </div>
      ) : (
        <div className="scroll-row">
          {items.map((p, i) => (
            <Link
              key={p.id}
              href={`/product-view/${p.slug}/${p.categoryName}/${p.id}`}
              className="w-[124px] shrink-0 overflow-hidden rounded-lg border bg-card transition-shadow hover:shadow-md nav-desktop:w-44"
            >
              <div className="relative aspect-square">
                <ProductImage photos={p.photos} thumbs={p.photoThumbs} alt={p.productName} className="object-cover" iconSize={32} priority={i === 0} />
              </div>
              <div className="p-2">
                <h3 className="line-clamp-1 text-xs font-bold leading-5 nav-desktop:text-[13px]">{p.productName}</h3>
                <h4 className="mt-0.5 line-clamp-1 text-[11px] font-normal text-muted-foreground">{stockFa(p.stock, p.unit)}</h4>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
