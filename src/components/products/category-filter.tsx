import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';
import type { Category } from '@/lib/types';

/**
 * ناوبری درخت دسته‌ها — Server Component (F5):
 * ~۹۰ لینک سایدبار لیست محصولات که دیگر وارد مرز کلاینت نمی‌شوند؛
 * هیدریشن سبک‌تر (TBT کمتر) + لینک‌های سئویی در HTML از همان Server Component.
 * دیتای درخت را صفحه (سرور) از getCategoryTreeSSR می‌گیرد.
 *
 * رفتار (عین الگوی current-sub-category سایت قدیم):
 * - صفحه اصلی لیست (بدون path) → درخت کامل.
 * - صفحه دسته (path) → فقط زیردسته‌های همان دسته + دکمه «بازگشت» به سطح بالا؛
 *   اگر دسته فعلی برگ باشد، هم‌ترازهای خودش (فرزندان والد) نشان داده می‌شوند.
 */

/** درخت کامل سه‌سطحی — فقط لیست اصلی (بدون دسته فعال) */
function FullTree({ tree, activeSlug }: { tree: Category[]; activeSlug?: string }) {
  return (
    <nav className="max-h-96 space-y-0.5 overflow-y-auto pe-1 text-sm">
      <Link
        href="/product-list"
        className={cn('block rounded-lg px-2.5 py-1.5', !activeSlug ? 'font-bold text-primary' : 'text-muted-foreground hover:bg-secondary')}
      >
        همه دسته‌ها
      </Link>
      {tree.map((root) => (
        <div key={root.id}>
          <Link
            href={`/product-list/category/${root.slug}`}
            className={cn('block rounded-lg px-2.5 py-1.5', activeSlug === root.slug ? 'font-bold text-primary' : 'font-medium hover:bg-secondary')}
          >
            {root.categoryName}
          </Link>
          {(root.children ?? []).map((l2) => (
            <div key={l2.id}>
              <Link
                href={`/product-list/category/${l2.slug}`}
                className={cn('block rounded-lg ps-5 pe-2.5 py-1.5 text-[13px]', activeSlug === l2.slug ? 'font-bold text-primary' : 'text-muted-foreground hover:bg-secondary')}
              >
                {l2.categoryName}
              </Link>
              {(l2.children ?? []).map((l3) => (
                <Link
                  key={l3.id}
                  href={`/product-list/category/${l3.slug}`}
                  className={cn('block rounded-lg ps-8 pe-2.5 py-1.5 text-xs', activeSlug === l3.slug ? 'font-bold text-primary' : 'text-muted-foreground/80 hover:bg-secondary')}
                >
                  {l3.categoryName}
                </Link>
              ))}
            </div>
          ))}
        </div>
      ))}
    </nav>
  );
}

export function CategoryFilter({ tree, path }: { tree: Category[]; path?: Category[] }) {
  // لیست اصلی — بدون دسته فعال: درخت کامل
  if (!path || path.length === 0) return <FullTree tree={tree} />;

  const current = path[path.length - 1];
  const parent = path.length > 1 ? path[path.length - 2] : undefined;

  // تمرکز: فرزندان دسته فعلی؛ اگر برگ بود → هم‌ترازهای خودش (فرزندان والد)
  const focus = current.children?.length ? current : parent;

  // ریشه‌ی بدون زیردسته → درخت کامل با هایلایت دسته فعال (fallback امن)
  if (!focus) return <FullTree tree={tree} activeSlug={current.slug} />;

  // مقصد دکمه بازگشت: والدِ سطحِ درحال‌نمایش (یا لیست اصلی اگر ریشه است)
  const focusIndex = path.indexOf(focus);
  const backTarget = focusIndex > 0 ? path[focusIndex - 1] : undefined;
  const backHref = backTarget
    ? `/product-list/category/${encodeURIComponent(backTarget.slug)}`
    : '/product-list';

  return (
    <nav aria-label="زیردسته‌ها">
      {/* بازگشت به دسته بالاتر — عین الگوی سایت قدیم */}
      <Link
        href={backHref}
        className="mb-2 flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <ChevronRight size={14} aria-hidden />
        بازگشت به {backTarget?.categoryName ?? 'همه دسته‌ها'}
      </Link>

      {/* عنوان سطح فعلی + تعداد زیردسته */}
      <p className="mb-1.5 px-2.5 text-xs font-bold text-foreground/80">
        {focus.categoryName}
        <span className="ms-1 font-normal text-muted-foreground">
          ({toFa(focus.children?.length ?? 0)} زیردسته)
        </span>
      </p>

      <ul className="max-h-96 space-y-0.5 overflow-y-auto pe-1">
        {(focus.children ?? []).map((c) => {
          const active = c.slug === current.slug;
          return (
            <li key={c.id}>
              <Link
                href={`/product-list/category/${encodeURIComponent(c.slug)}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5',
                  active
                    ? 'font-bold text-primary'
                    : 'text-muted-foreground hover:bg-secondary',
                )}
              >
                <span className="line-clamp-1">{c.categoryName}</span>
                {!!c.children?.length && (
                  <ChevronLeft size={14} className="shrink-0 opacity-50" aria-hidden />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
