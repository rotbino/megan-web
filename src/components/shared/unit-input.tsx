'use client';

/**
 * ورودی عددی هوشمند — الگوی باسکول:
 * ۱) ارقام وسط‌چین (وسطِ واقعی جعبه — پدینگ متقارن؛ واحد در گوشهٔ چپ می‌ماند
 *    و با عدد قاطی نمی‌شود — خواستهٔ مالک: «عددی‌ها وسط‌چین باشند»)
 * ۲) بادکنک بالای گوشه چپ: تبدیل لحظه‌ای به واحد عمده‌فروشی —
 *    ۱٬۰۰۰ کیلوگرم ← «≈ ۱ تن» / ۳٬۵۰۰٬۰۰۰ تومان ← «≈ ۳٫۵ میلیون تومان».
 *    (بادکنک بالای فیلد شناور است؛ نوکش به لبهٔ بالای تکست‌باکس می‌خورد
 *    و با خود فیلد قاطی نمی‌شود — خواسته مالک.)
 * ۳) واحد (کیلوگرم/تومان/…) ثابت در گوشه چپ داخل فیلد — درشت و بولد.
 * ۴) فونت IRANSansNum (FaNum) — ارقام همیشه فارسی نمایش داده می‌شوند.
 */

import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export type UnitKind = 'weight' | 'price' | 'plain';

/** عدد → فارسی با حداکثر ۲ رقم اعشار و حذف صفرهای انتهایی */
function faSmart(n: number): string {
    const rounded = Number(n.toFixed(2));
    return rounded.toLocaleString('fa-IR', { maximumFractionDigits: 2 });
}

/** متن بادکنک — فقط وقتی تبدیل معنادار است */
export function unitBadgeText(digits: number, kind: UnitKind, unit?: string): string | null {
    if (!digits || digits < 1) return null;
    if (kind === 'weight' && (unit ?? 'کیلوگرم').includes('کیلو') && digits >= 1000) {
        return `${faSmart(digits / 1000)} تن`;
    }
    if (kind === 'price') {
        if (digits >= 1_000_000) return `${faSmart(digits / 1_000_000)} میلیون تومان`;
        if (digits >= 1000) return `${faSmart(digits / 1000)} هزار تومان`;
    }
    return null;
}

export function UnitInput({
                              value,
                              onValueChange,
                              unit,
                              kind = 'plain',
                              placeholder,
                              id,
                              invalid,
                              ariaLabel,
                              maxLength = 12,
                              className,
                              inputClassName,
                          }: {
    /** رشته ارقام با جداکننده هزارگان (فونت FaNum ارقام را فارسی نشان می‌دهد) */
    value: string;
    onValueChange: (v: string) => void;
    /** واحد چسبیده به فیلد — مثل «کیلوگرم» یا «هر کیلوگرم» */
    unit?: string;
    /** weight: بادکنک تبدیل به تن / price: تبدیل به هزار و میلیون تومان */
    kind?: UnitKind;
    placeholder?: string;
    id?: string;
    invalid?: boolean;
    ariaLabel?: string;
    maxLength?: number;
    className?: string;
    /** کلاس اضافهٔ خودِ Input — مثلاً هم‌قدسازی ارتفاع با بقیهٔ فیلدهای فرم */
    inputClassName?: string;
}) {
    const digits = Number(value.replace(/[^\d]/g, '')) || 0;
    const badge = unitBadgeText(digits, kind, unit);

    return (
        <div className={cn('relative', className)}>
            <Input
                id={id}
                dir="ltr"
                inputMode="numeric"
                autoComplete="off"
                aria-label={ariaLabel}
                className={cn(
                    // وسط‌چین واقعی عدد: پدینگ متقارن — قبلاً ps-3/pe-20 ناهمگون بود و
                    // مرکز متن را روی واحدِ گوشهٔ چپ می‌انداخت (تداخل موبایل — خواسته مالک)
                    'font-num h-13 text-center text-base font-bold tabular-nums md:h-14 md:text-lg',
                    unit && 'px-4',
                    invalid && 'border-red-400 focus-visible:ring-red-300',
                    inputClassName,
                )}
                value={value}
                placeholder={placeholder}
                onChange={(e) => {
                    const d = e.target.value.replace(/[^\d]/g, '').slice(0, maxLength);
                    onValueChange(d ? Number(d).toLocaleString('en-US') : '');
                }}
            />
            {unit && (
                <span className="font-num pointer-events-none absolute inset-y-0 left-3 flex items-center text-[13px] font-bold text-muted-foreground md:text-sm">
          {unit}
        </span>
            )}
            {badge && (
                <span
                    className="font-num animate-badge-in pointer-events-none absolute -top-9 left-0 z-10
    inline-flex items-center rounded-md bg-popover px-3 py-2 text-xs font-bold leading-none
    text-popover-foreground shadow-[0_8px_24px_rgba(0,0,0,0.28),0_2px_6px_rgba(0,0,0,0.15)] ring-1 ring-border"
                >
    ≈ {badge}
                    {/* دُم بادکنک — بدون ring و با پوشاندن نیمهٔ بالایی که داخل حباب است */}
                    <span
                        aria-hidden
                        className="absolute -bottom-1 left-2.5 size-2.5 rotate-45 rounded-[2px] bg-popover"
                        style={{ clipPath: 'polygon(0 0, 100% 0, 100% 100%, 0 100%)' }}
                    />
  </span>
            )}
        </div>
    );
}
