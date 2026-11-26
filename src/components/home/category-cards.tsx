'use client';

import Link from 'next/link';
import { useCategoryTree } from '@/lib/mock/hooks';
import { TaxonomyIcon } from '@/lib/category-icons';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * «دسته بندی های اصلی» — (۲۶-۱۱): درخت عمومی سایت = تاکسونومی اختصاصی
 * ایمچ (۱۵ ریشهٔ v2)؛ به‌جای عکس‌های عمومیِ پاسکال‌گونه، کاشی آیکون خطی
 * برند (متمایز از باسکول — خواستهٔ مالک: ظاهر دسته‌ها کپی باسکول نباشد).
 * موبایل: کارت‌های گرد ۹۰px سه‌ستونه؛ دسکتاپ: ۱۲۰px پنج‌ستونه.
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
              <span
                className={cn(
                  'flex items-center justify-center overflow-hidden rounded-full border border-border bg-secondary p-1 transition-shadow group-hover:shadow-md',
                )}
              >
                <span className="flex size-[84px] items-center justify-center rounded-full bg-card transition-transform duration-300 group-hover:scale-105 nav-desktop:size-[112px]">
                  <TaxonomyIcon icon={c.icon} size={38} className="text-primary" />
                </span>
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
