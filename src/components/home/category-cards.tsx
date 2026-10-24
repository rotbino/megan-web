'use client';

import Link from 'next/link';
import { useCategoryTree } from '@/lib/mock/hooks';
import { Skeleton } from '@/components/ui/skeleton';

/** «دسته بندی های اصلی» — ۱۰ کارت تصویری مثل باسکول (کشاورزی تا لوازم ورزشی) */
export function CategoryCards() {
  const { data: tree, isLoading } = useCategoryTree();
  const cats = tree ?? [];

  return (
    <section aria-labelledby="main-cats" className="mx-auto max-w-7xl px-4 py-8 lg:px-6">
      <h2 id="main-cats" className="mb-5 text-base font-bold sm:text-lg">دسته بندی های اصلی</h2>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-md" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {cats.map((c) => (
            <Link
              key={c.id}
              href={`/product-list/category/${c.slug}`}
              className="group overflow-hidden rounded-md border bg-card transition-shadow hover:shadow-md"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-secondary">
                {c.image ? (
                   
                  <img
                    src={c.image}
                    alt={c.categoryName}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : null}
              </div>
              <p className="px-2 py-2.5 text-center text-xs font-bold leading-5 sm:text-[13px]">
                {c.categoryName}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
