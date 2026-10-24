'use client';

import Link from 'next/link';
import { useCategoryTree } from '@/lib/mock/hooks';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * «دسته بندی های اصلی» — عین باسکول: کارت‌های تصویری گرد (موبایل ۹۰px، سه ستون)
 * برچسب ۱۲px/۲۰px موبایل و ۱۶px دسکتاپ با وزن معمولی.
 */
export function CategoryCards() {
  const { data: tree, isLoading } = useCategoryTree();
  const cats = tree ?? [];

  return (
    <section aria-labelledby="main-cats" className="mx-auto max-w-7xl px-4 py-6 nav-desktop:py-8 lg:px-6">
      <h2 id="main-cats" className="mb-4 text-center text-base font-medium leading-7 nav-desktop:mb-6 nav-desktop:text-xl nav-desktop:leading-[34px]">
        دسته بندی های اصلی
      </h2>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-2 nav-desktop:grid-cols-5">
          {Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="mx-auto size-[90px] rounded-full nav-desktop:size-[120px]" />)}
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2 nav-desktop:gap-x-4 nav-desktop:gap-y-6 nav-desktop:grid-cols-5">
          {cats.map((c) => (
            <Link
              key={c.id}
              href={`/product-list/category/${c.slug}`}
              className="group flex flex-col items-center"
              aria-label={c.categoryName}
            >
              <span className="block overflow-hidden rounded-full border border-border bg-secondary p-1 transition-shadow group-hover:shadow-md">
                {c.image ? (
                  <img
                    src={c.image}
                    alt={c.categoryName}
                    loading="lazy"
                    width={120}
                    height={120}
                    className="size-[90px] rounded-full object-cover transition-transform duration-300 group-hover:scale-105 nav-desktop:size-[120px]"
                  />
                ) : null}
              </span>
              <p className="mt-2 px-1 text-center text-xs font-normal leading-5 text-foreground nav-desktop:mt-3 nav-desktop:text-base nav-desktop:leading-7">
                {c.categoryName}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
