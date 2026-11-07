import Link from 'next/link';
import { ArrowRight, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';
import type { Category } from '@/lib/types';

/**
 * ناوبری دسته‌ها — Server Component (F5):
 * لینک‌های سایدبار لیست محصولات دیگر وارد مرز کلاینت نمی‌شوند؛
 * هیدریشن سبک‌تر (TBT کمتر) + لینک‌های سئویی در HTML از همان Server Component.
 * دیتای درخت را صفحه (سرور) از getCategoryTreeSSR می‌گیرد.
 *
 * رفتار (خواسته مالک):
 * - صفحه اصلی لیست (بدون path) → فقط سطح اول گروه‌بندی (۱۰ دسته ریشه)؛
 *   درخت کامل نمایش داده نمی‌شود — ورود به هر دسته از صفحه خودش است.
 * - صفحه دسته (path) → ساختار درختی (خواسته مالک ۴-۱۱): لینک «همه دسته ها»
 *   با فلش بازگشت و رنگ برندِ بولد؛ سرشاخه با فونت بولد و غلیظ هم‌اندازهٔ
 *   زیردسته‌ها؛ زیردسته‌ها غیربولد و یک تَب جلوتر (تورفتگی) تا درخت دیده شود.
 */

/** سطح اول گروه‌بندی — «همه دسته‌ها» + ۱۰ دسته ریشه (خواسته مالک: بدون درخت کامل) */
function RootList({ tree, activeSlug }: { tree: Category[]; activeSlug?: string }) {
  return (
    <nav className="space-y-0.5 text-sm">
      <Link
        href="/product-list"
        className={cn('block rounded-md px-2.5 py-1.5', !activeSlug ? 'font-bold text-primary' : 'text-muted-foreground hover:bg-secondary')}
      >
        همه دسته‌ها
      </Link>
      {tree.map((root) => {
        const active = activeSlug === root.slug;
        return (
          <Link
            key={root.id}
            href={`/product-list/category/${root.slug}`}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5',
              active ? 'font-bold text-primary' : 'font-medium hover:bg-secondary',
            )}
          >
            <span className="line-clamp-1">{root.categoryName}</span>
            {!!root.children?.length && (
              <ChevronLeft size={14} className="shrink-0 opacity-50" aria-hidden />
            )}
          </Link>
        );
      })}
    </nav>
  );
}

export function CategoryFilter({ tree, path }: { tree: Category[]; path?: Category[] }) {
  // لیست اصلی — بدون دسته فعال: فقط سطح اول گروه‌بندی
  if (!path || path.length === 0) return <RootList tree={tree} />;

  const current = path[path.length - 1];
  const parent = path.length > 1 ? path[path.length - 2] : undefined;

  // تمرکز: فرزندان دسته فعلی؛ اگر برگ بود → هم‌ترازهای خودش (فرزندان والد)
  const focus = current.children?.length ? current : parent;

  // ریشه‌ی بدون زیردسته → سطح اول با هایلایت دسته فعال (fallback امن)
  if (!focus) return <RootList tree={tree} activeSlug={current.slug} />;

  // مقصد دکمه بازگشت: والدِ سطحِ درحال‌نمایش (یا لیست اصلی اگر ریشه است)
  const focusIndex = path.indexOf(focus);
  const backTarget = focusIndex > 0 ? path[focusIndex - 1] : undefined;
  const backHref = backTarget
    ? `/product-list/category/${encodeURIComponent(backTarget.slug)}`
    : '/product-list';

  return (
    <nav aria-label="زیردسته‌ها">


      {/* سرشاخه — بولد و غلیظ، هم‌اندازهٔ زیردسته‌ها (خواسته مالک ۴-۱۱) */}
        <Link
            href={backHref}
            className="mb-2 flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm font-bold text-primary transition-colors hover:bg-primary/5"
        >
            <ArrowRight size={16} strokeWidth={2.5} aria-hidden />
            {focus.categoryName}
        </Link>


      {/* زیردسته‌ها — غیربولد با اندازهٔ فعلی، یک تَب جلوتر از سرشاخه (درخت) */}
      <ul className="max-h-96 space-y-0.5 overflow-y-auto pe-1 pr-4">
        {(focus.children ?? []).map((c) => {
          const active = c.slug === current.slug;
          return (
            <li key={c.id}>
              <Link
                href={`/product-list/category/${encodeURIComponent(c.slug)}`}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center justify-between gap-2 rounded-md ps-7 pe-2.5 py-1.5 text-sm',
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
