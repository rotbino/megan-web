'use client';

import { CarryFilters } from '@/components/shared/carry-filters';
import { CategoryFilter } from '@/components/products/category-filter';
import { useFilterState } from '@/components/products/filter-state';
import { findCategoryPath } from '@/lib/categories';
import type { Category } from '@/lib/types';

/**
 * سایدبار درخت دسته‌ها برای layout صفحهٔ دسته (خواستهٔ مالک ۱۸-۱۱ دور ۲).
 *
 * چرا این پوستهٔ کلاینت: با سوییچ کلاینت‌ساید دسته (navigateCategory — بدون
 * ناوبری سرور) دیگر layout دوباره رندر نمی‌شود، پس هایلایت «دستهٔ فعال»
 * سایدبار باید سمت کلاینت بازمحاسبه شود. درخت را به‌عنوان prop سرور می‌گیرد
 * (بدون فetch اضافه) و تا وقتی دستهٔ کلاینت فعال نباشد عین نتیجهٔ
 * findCategoryPath سرور رندر می‌کند — HTML اولیه/سئو همان قبلی است.
 *
 * clientNav → لینک‌های دسته data-slug/data-name می‌گیرند تا CarryFilters
 * کلیکشان را به سوییچ کلاینت‌ساید (pushState + کش React Query) ببرد؛ hover
 * هم صفحهٔ ۱ مقصد را پیش‌واکشی می‌کند. لینک‌های غیردسته («همه دسته‌ها»)
 * مثل قبل ناوبری سرور می‌شوند.
 */
export function CategoryNav({ tree, ssrPath }: { tree: Category[]; ssrPath?: Category[] }) {
  const ctx = useFilterState();
  const clientCat = ctx?.category ?? null;
  // دستهٔ کلاینت فعال است → مسیر را از همان درخت سرور بازمحاسبه کن (هایلایت دقیق)
  const path = clientCat ? (findCategoryPath(tree, clientCat.slug) ?? ssrPath) : ssrPath;
  return (
    <CarryFilters>
      <CategoryFilter tree={tree} path={path} clientNav />
    </CarryFilters>
  );
}
