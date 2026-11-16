import { CategoryFilter } from '@/components/products/category-filter';
import { FilterStateProvider, LocationFilterCard } from '@/components/products/filter-state';
import { CarryFilters } from '@/components/shared/carry-filters';
import { getCategoryTreeSSR } from '@/lib/mock/api';
import { findCategoryPath } from '@/lib/categories';

/**
 * پوستهٔ پایدار صفحهٔ دسته (خواستهٔ مالک ۱۷-۱۱): سایدبار فیلترها (درخت
 * دسته + موقعیت جغرافیایی) اینجا رندر می‌شود، نه داخل صفحه. ناوبری بین
 * دسته‌های هم‌سطح (سیب → هلو) پارامتر همین سگمنت را عوض می‌کند؛ layout
 * ریمونت نمی‌شود و فقط «ستون لیست کالاها» با loading.tsx اسکلت می‌گیرد —
 * هدر و فیلتر بار سر جایشان می‌مانند (رفع «کل صفحه غیب می‌شود»).
 *
 * state فیلتر مکان در FilterStateProvider زندگی می‌کند تا انتخاب کاربر
 * هنگام جابه‌جایی بین دسته‌ها حفظ شود و کارت سایدبار با کوئری لیست هم‌نوا
 * بماند (صفحه از همان Context می‌خواند).
 *
 * لینک‌های درخت همچنان سرور-رندر می‌شوند (سئو/کراول عین قبل) و fetch درخت
 * با revalidate کش مشترک صفحه — در یک رندر با صفحه dedupe می‌شود.
 */
export const revalidate = 300;

interface Props {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export default async function CategoryLayout({ children, params }: Props) {
  const { slug } = await params;
  const decoded = decodeURIComponent(slug);
  const tree = (await getCategoryTreeSSR(3600)) ?? [];
  const path = findCategoryPath(tree, decoded);

  return (
    <FilterStateProvider>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[260px_1fr] lg:px-6 lg:py-6">
        {/* سایدبار فیلتر — دسکتاپ؛ چسبان (همان استایل قبلی داخل صفحه) */}
        <aside
          className="hidden space-y-5 lg:block lg:self-start lg:sticky lg:top-[125px] lg:max-h-[calc(100vh-141px)] lg:overflow-y-auto lg:pb-1"
          aria-label="فیلترها"
        >
          <div className="rounded-md border bg-card p-4">
            {/* لینک‌های درخت سرور-رندر — کلیک با فیلترهای فعال URL همراه می‌شود (خواستهٔ مالک ۱۷-۱۱ دور ۲) */}
            <CarryFilters>
              <CategoryFilter tree={tree} path={path ?? undefined} />
            </CarryFilters>
          </div>
          <LocationFilterCard />
        </aside>
        {/* ستون لیست — صفحه (و اسکلت لودینگ) فقط همین‌جا تعویض می‌شود */}
        <div className="min-w-0 space-y-4">{children}</div>
      </div>
    </FilterStateProvider>
  );
}
