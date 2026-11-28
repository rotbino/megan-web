'use client';

/**
 * شرایط معاملهٔ عمده — بخش فرم ویرایش/ثبت آگهی (خواستهٔ مالک ۲۸-۱۱ دور ۵).
 *
 * همان چیزی که صفحهٔ «فیلتر پیشرفتهٔ عمده» فیلتر می‌کند، فروشنده اینجا اعلام
 * می‌کند؛ مینیمال و ساده:
 *  • نوع فروشنده — چیپ تک‌انتخابی (کشاورز/تولیدکننده/…)؛
 *  • نوع پرداخت — چیپ چندانتخابی (نقد/چک سررسید/اعتباری)؛
 *  • سوییچ «بار دارای گواهی/آنالیز کیفیت» و سوییچ «ارسال با باربری».
 *
 * state = خودِ فرمت (draft): sellerType / paymentTypes / hasAnalysis / shipping.
 */

import { Handshake, Store } from 'lucide-react';
import { PAYMENT_OPTIONS, SELLER_TYPE_OPTIONS } from '@/lib/catalog-v2';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface TradeTermsValue {
  sellerType?: string | null;
  paymentTypes?: string[];
  hasAnalysis?: boolean;
  shipping?: boolean;
}

export function TradeTermsCard({
  value,
  onChange,
}: {
  value: TradeTermsValue;
  onChange: (v: TradeTermsValue) => void;
}) {
  const sellerType = value.sellerType ?? null;
  const paymentTypes = value.paymentTypes ?? [];

  const pickSellerType = (label: string) => {
    onChange({ ...value, sellerType: sellerType === label ? null : label });
  };
  const togglePayment = (label: string) => {
    const next = paymentTypes.includes(label)
      ? paymentTypes.filter((p) => p !== label)
      : [...paymentTypes, label];
    onChange({ ...value, paymentTypes: next });
  };

  return (
    <div className="space-y-4">
      <h2 className="flex items-center gap-2 text-sm font-extrabold">
        <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
          <Handshake size={14} />
        </span>
        شرایط معامله
        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
          اختیاری
        </span>
      </h2>
      <p className="text-[11px] leading-5 text-muted-foreground">
        خریدارهای عمده با همین فیلترها جستجو می‌کنند (نوع فروشنده، نحوهٔ پرداخت،
        گواهی بار، ارسال باربری) — پرکردنش آگهی شما را در نتایج دقیق‌تر نشان می‌دهد.
      </p>

      {/* نوع فروشنده — تک‌انتخابی؛ کلیک دوباره = حذف */}
      <div className="space-y-1.5">
        <p className="text-[12.5px] font-bold">
          شما کدام هستید؟
          {sellerType && (
            <span className="ms-1.5 text-[10px] font-normal text-muted-foreground">
              (برای حذف، دوباره انتخابش کن)
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {SELLER_TYPE_OPTIONS.map((label) => {
            const on = sellerType === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => pickSellerType(label)}
                aria-pressed={on}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors',
                  on
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'bg-background text-foreground/75 hover:bg-secondary/60',
                )}
              >
                {label === 'کشاورز' && <Store size={11} className="shrink-0" />}
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* نوع پرداخت — چندانتخابی */}
      <div className="space-y-1.5">
        <p className="text-[12.5px] font-bold">کدام نحوه‌های پرداخت را می‌پذیرید؟</p>
        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_OPTIONS.map((label) => {
            const on = paymentTypes.includes(label);
            return (
              <button
                key={label}
                type="button"
                onClick={() => togglePayment(label)}
                aria-pressed={on}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[11.5px] font-bold transition-colors',
                  on
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'bg-background text-foreground/75 hover:bg-secondary/60',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* سوییچ‌ها */}
      <div className="divide-y rounded-xl border">
        <label className="flex items-center gap-2.5 px-3 py-3">
          <Switch
            checked={value.hasAnalysis === true}
            onCheckedChange={(v) => onChange({ ...value, hasAnalysis: v })}
            aria-label="بار دارای گواهی یا آنالیز کیفیت است"
          />
          <span className="min-w-0 flex-1 text-[12px] font-bold leading-5">
            بار دارای گواهی / آنالیز کیفیت است
            <span className="block text-[10px] font-normal text-muted-foreground">
              آزمون کیفیت یا به‌سایت استاندارد همراه بار ارائه می‌شود.
            </span>
          </span>
        </label>
        <label className="flex items-center gap-2.5 px-3 py-3">
          <Switch
            checked={value.shipping === true}
            onCheckedChange={(v) => onChange({ ...value, shipping: v })}
            aria-label="ارسال با باربری"
          />
          <span className="min-w-0 flex-1 text-[12px] font-bold leading-5">
            ارسال با باربری انجام می‌شود
            <span className="block text-[10px] font-normal text-muted-foreground">
            بار را به شهر خریدار می‌فرستم (باربری).
            </span>
          </span>
        </label>
      </div>
    </div>
  );
}
