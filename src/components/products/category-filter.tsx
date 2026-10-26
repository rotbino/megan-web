import Link from 'next/link';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

/**
 * ناوبری درخت دسته‌ها — Server Component (F5):
 * ~۹۰ لینک سایدبار لیست محصولات که دیگر وارد مرز کلاینت نمی‌شوند؛
 * هیدریشن سبک‌تر (TBT کمتر) + لینک‌های سئویی در HTML از همان Server Component.
 * دیتای درخت را صفحه (سرور) از getCategoryTreeSSR می‌گیرد.
 */
export function CategoryFilter({ tree, activeSlug }: { tree: Category[]; activeSlug?: string }) {
  return (
    <nav className="max-h-96 space-y-0.5 overflow-y-auto pe-1 text-sm">
      <Link
        href="/product-list"
        className={cn('block rounded-lg px-2.5 py-1.5', !activeSlug ? 'bg-accent font-bold text-accent-foreground' : 'text-muted-foreground hover:bg-secondary')}
      >
        همه دسته‌ها
      </Link>
      {tree.map((root) => (
        <div key={root.id}>
          <Link
            href={`/product-list/category/${root.slug}`}
            className={cn('block rounded-lg px-2.5 py-1.5', activeSlug === root.slug ? 'bg-accent font-bold text-accent-foreground' : 'font-medium hover:bg-secondary')}
          >
            {root.categoryName}
          </Link>
          {(root.children ?? []).map((l2) => (
            <div key={l2.id}>
              <Link
                href={`/product-list/category/${l2.slug}`}
                className={cn('block rounded-lg ps-5 pe-2.5 py-1.5 text-[13px]', activeSlug === l2.slug ? 'bg-accent font-bold text-accent-foreground' : 'text-muted-foreground hover:bg-secondary')}
              >
                {l2.categoryName}
              </Link>
              {(l2.children ?? []).map((l3) => (
                <Link
                  key={l3.id}
                  href={`/product-list/category/${l3.slug}`}
                  className={cn('block rounded-lg ps-8 pe-2.5 py-1.5 text-xs', activeSlug === l3.slug ? 'bg-accent font-bold text-accent-foreground' : 'text-muted-foreground/80 hover:bg-secondary')}
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
