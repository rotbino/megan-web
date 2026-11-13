'use client';

/**
 * صفحه‌بندی سئو-فرندلی (خواستهٔ مالک ۱۴-۱۱) — هر صفحهٔ لیست یک URL واقعی و
 * ایندکس‌پذیر دارد (مثل /product-list/2 یا /buyAd-requests/3) تا گوگل بتواند
 * تک‌تک پیج‌ها را جدا ایندکس کند؛ دکمه‌های شماره لینک واقعی‌اند.
 *
 * دو حالت:
 *  · لینکی (سئو): وقتی page1Href و pageHrefPattern داده شود، شماره‌ها و
 *    فلش‌ها <a> واقعی به URL همان صفحه‌اند — کرال‌پذیر + prefetch خودکار.
 *    فقط در «حالت پیش‌فرض» (بدون فیلتر کلاینت‌ساید فعال) از بیرون فعال
 *    می‌شود؛ با فیلتر فعال (که URL خودش را ندارد) به حالت دکمه‌ای برمی‌گردد.
 *  · دکمه‌ای (رفتار قبلی): onPageChange صفحه را عوض می‌کند — بدون تغییر URL.
 */
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toFa } from '@/lib/format';

export interface SeoPaginationProps {
  page: number;
  pageCount: number;
  /** حالت لینکی — آدرس تمیز صفحهٔ ۱ (بدون /1 تکراری) */
  page1Href?: string;
  /** حالت لینکی — الگوی آدرس صفحه‌های ۲ به بعد با جای‌نگهدار {p} */
  pageHrefPattern?: string;
  /** حالت دکمه‌ای */
  onPageChange?: (n: number) => void;
  /** numbers: همهٔ شماره‌ها (لیست محصولات) · windowed: ۱، آخر، ±۱ با «…» (درخواست‌های خرید) · compact: قبلی/بعدی + شمارنده (خریداران) */
  variant?: 'numbers' | 'windowed' | 'compact';
}

/** آدرس صفحهٔ n — صفحهٔ ۱ همیشه آدرس تمیز پایه است (کنونیکال واحد) */
export function pageHrefOf(page1Href: string, pattern: string, n: number): string {
  return n <= 1 ? page1Href : pattern.replace('{p}', String(n));
}

/** دکمهٔ شمارهٔ صفحه — لینک واقعی (سئو) یا دکمهٔ کلاینت */
function PageNumber({
  n,
  page,
  href,
  onChange,
  small,
}: {
  n: number;
  page: number;
  href?: string;
  onChange?: (n: number) => void;
  small?: boolean;
}) {
  const active = n === page;
  const cls = small ? 'min-w-8 rounded-md' : undefined;
  if (href) {
    return (
      <Button asChild variant={active ? 'default' : 'outline'} size={small ? 'sm' : 'icon-sm'} className={cls} aria-current={active ? 'page' : undefined}>
        <Link href={href} aria-label={`صفحهٔ ${n}`}>{toFa(n)}</Link>
      </Button>
    );
  }
  return (
    <Button
      variant={active ? 'default' : 'outline'}
      size={small ? 'sm' : 'icon-sm'}
      className={cls}
      onClick={() => onChange?.(n)}
      aria-current={active ? 'page' : undefined}
    >
      {toFa(n)}
    </Button>
  );
}

export function SeoPagination({
  page,
  pageCount,
  page1Href,
  pageHrefPattern,
  onPageChange,
  variant = 'numbers',
}: SeoPaginationProps) {
  if (pageCount <= 1) return null;

  const linkMode = Boolean(page1Href && pageHrefPattern);
  const href = (n: number) => (linkMode ? pageHrefOf(page1Href!, pageHrefPattern!, n) : undefined);

  const arrowCls = variant === 'compact' ? 'rounded-md' : undefined;

  // ── قبلی / بعدی ──
  const prev =
    page > 1 ? (
      href(page - 1) ? (
        <Button asChild variant="outline" size={variant === 'compact' ? 'sm' : 'icon-sm'} className={arrowCls} aria-label="صفحه قبل">
          <Link href={href(page - 1)!}>
            {variant === 'compact' ? (
              <>
                <ChevronRight size={15} /> قبلی
              </>
            ) : (
              <ChevronRight size={16} />
            )}
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size={variant === 'compact' ? 'sm' : 'icon-sm'} className={arrowCls} onClick={() => onPageChange?.(page - 1)} aria-label="صفحه قبل">
          {variant === 'compact' ? (
            <>
              <ChevronRight size={15} /> قبلی
            </>
          ) : (
            <ChevronRight size={16} />
          )}
        </Button>
      )
    ) : (
      <Button variant="outline" size={variant === 'compact' ? 'sm' : 'icon-sm'} className={arrowCls} disabled aria-label="صفحه قبل">
        {variant === 'compact' ? (
          <>
            <ChevronRight size={15} /> قبلی
          </>
        ) : (
          <ChevronRight size={16} />
        )}
      </Button>
    );

  const next =
    page < pageCount ? (
      href(page + 1) ? (
        <Button asChild variant="outline" size={variant === 'compact' ? 'sm' : 'icon-sm'} className={arrowCls} aria-label="صفحه بعد">
          <Link href={href(page + 1)!}>
            {variant === 'compact' ? (
              <>
                بعدی <ChevronLeft size={15} />
              </>
            ) : (
              <ChevronLeft size={16} />
            )}
          </Link>
        </Button>
      ) : (
        <Button variant="outline" size={variant === 'compact' ? 'sm' : 'icon-sm'} className={arrowCls} onClick={() => onPageChange?.(page + 1)} aria-label="صفحه بعد">
          {variant === 'compact' ? (
            <>
              بعدی <ChevronLeft size={15} />
            </>
          ) : (
            <ChevronLeft size={16} />
          )}
        </Button>
      )
    ) : (
      <Button variant="outline" size={variant === 'compact' ? 'sm' : 'icon-sm'} className={arrowCls} disabled aria-label="صفحه بعد">
        {variant === 'compact' ? (
          <>
            بعدی <ChevronLeft size={15} />
          </>
        ) : (
          <ChevronLeft size={16} />
        )}
      </Button>
    );

  // ── خلاصهٔ خریداران: قبلی + «صفحهٔ n از m» + بعدی ──
  if (variant === 'compact') {
    return (
      <nav className="flex items-center justify-center gap-3 pt-1" aria-label="صفحه‌بندی">
        {prev}
        <span className="text-xs text-muted-foreground">
          صفحهٔ {toFa(page)} از {toFa(pageCount)}
        </span>
        {next}
      </nav>
    );
  }

  // ── شماره‌ها: همه (numbers) یا پنجره‌ای با «…» (windowed) ──
  let numbers: { n: number; gapBefore?: boolean }[];
  if (variant === 'windowed') {
    const visible = Array.from({ length: pageCount }, (_, i) => i + 1).filter(
      (n) => n === 1 || n === pageCount || Math.abs(n - page) <= 1,
    );
    numbers = visible.map((n, idx) => ({ n, gapBefore: idx > 0 && n - visible[idx - 1] > 1 }));
  } else {
    numbers = Array.from({ length: pageCount }, (_, i) => ({ n: i + 1 }));
  }

  return (
    <nav
      className={variant === 'windowed' ? 'flex items-center justify-center gap-1 py-2' : 'flex items-center justify-center gap-1 pt-2'}
      aria-label="صفحه‌بندی"
    >
      {prev}
      {numbers.map(({ n, gapBefore }) => (
        <span key={n} className="flex items-center gap-1">
          {gapBefore && <span className="px-1 text-xs text-muted-foreground">…</span>}
          <PageNumber n={n} page={page} href={href(n)} onChange={onPageChange} small={variant === 'windowed'} />
        </span>
      ))}
      {next}
    </nav>
  );
}
