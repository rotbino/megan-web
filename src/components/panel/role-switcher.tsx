'use client';

/**
 * سوییچر پنل — فروش/خرید (خواسته مالک ۲-۱۱ دور شانزدهم):
 *  • برچسب‌ها «پنل فروش» / «پنل خرید» — نه «فروشنده/خریدار»؛ دکمه خودش می‌گوید
 *    کدام پنل را می‌بینی و جملهٔ «نوع حساب شما … است» دیگر لازم نیست (حذف شد).
 *  • دایرهٔ رادیو روی هر دکمه — حس انتخاب/سوییچ القا می‌شود (خواستهٔ صریح مالک).
 *  • متن فعال سفید است (قانون متن‌سفید روی پس‌زمینهٔ رنگی — RULES §۱-ب).
 *  سوییچ = سوییچ پنل: setRole داخل auth اگر جای دیگری باشیم به آیمچ من
 *  برمی‌گرداند و دراور موبایل هم بسته می‌شود (onNavigate).
 */

import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/mock/auth';

export const ROLE_SWITCH_OPTIONS = [
  { key: 'seller', label: 'پنل فروش' },
  { key: 'buyer', label: 'پنل خرید' },
] as const;

export function RoleSwitcher({
  className,
  onNavigate,
  size = 'md',
}: {
  className?: string;
  /** بستن دراور/بت‌شیت پس از سوییچ */
  onNavigate?: () => void;
  size?: 'md' | 'sm';
}) {
  const { user, setRole } = useAuth();
  const role = user?.role ?? 'seller';

  return (
    <div
      className={cn('flex rounded-lg border border-border bg-secondary p-1.5', className)}
      role="radiogroup"
      aria-label="انتخاب پنل"
    >
      {ROLE_SWITCH_OPTIONS.map(({ key, label }) => {
        const active = role === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              setRole(key);
              onNavigate?.();
            }}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-md font-extrabold transition-all',
              size === 'md' ? 'h-10 text-[13px]' : 'h-9 text-xs',
              active
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-card hover:text-foreground',
            )}
          >
            {/* دایرهٔ رادیو — انتخاب‌شده: نقطهٔ پر؛ نه: حلقهٔ خالی */}
            <span
              aria-hidden
              className={cn(
                'grid size-4 shrink-0 place-items-center rounded-full border-2',
                active ? 'border-primary-foreground/90' : 'border-muted-foreground/50',
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full bg-primary-foreground transition-opacity',
                  active ? 'opacity-100' : 'opacity-0',
                )}
              />
            </span>
            {label}
          </button>
        );
      })}
    </div>
  );
}
