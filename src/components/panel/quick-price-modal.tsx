'use client';

import { useState } from 'react';
import { Loader2, RefreshCw, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PriceValidityPicker } from '@/components/panel/product-form/price-validity-picker';
import { UnitInput } from '@/components/shared/unit-input';
import { useUpdateProductPrice } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { timeAgoFa, parseServerDate, toFa } from '@/lib/format';

const num = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0;

/** نمایش گویای اعتبار فعلی — آگهی‌های ایمپورتی ۱۰ ساله (۳۶۵۰ روز) «۱۰ سال»
 *  نشان داده می‌شوند نه عدد خام (رفع باگ ۱۹-۱۱: پیش‌پر/ارسال ۳۶۵۰ به سرور) */
const validityLabelFa = (days?: number): string => {
  const d = days ?? 3;
  return d > 365 ? `${toFa(Math.round(d / 365))} سال` : `${toFa(d)} روز`;
};

/**
 * مودال سریع «آپدیت قیمت» (خواسته مالک ۷-۱۱ دور هفدهم) — از دکمهٔ ظریف زیر
 * کارت آگهی و از روی بج «قیمت منقضی شده» باز می‌شود؛ فقط قیمت + اعتبار،
 * بدون تایید مجدد. مهر زمانی قیمت در بک‌اند «همیشه» تازه می‌شود و انقضا
 * صفر می‌شود — حتی ذخیرهٔ همان قیمت یا دکمهٔ «آپدیت با همین قیمت» که فقط
 * تازگی آگهی را بین مشابه‌ها برمی‌گرداند (خواسته مالک ۱۹-۱۱ عصر).
 */
export function QuickPriceModal({
  product,
  onClose,
}: {
  product: {
    id: number;
    productName: string;
    unit: string;
    minSalePrice: number | null;
    priceValidityDays?: number;
    priceUpdatedAt?: string;
    priceExpired?: boolean;
  } | null;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const save = useUpdateProductPrice();

  // پیش‌پر شدن فرم با هر بار باز شدن — الگوی «state حین رندر» (بدون effect)؛
  // اعتبار: سقف ۳۰ روز = حداکثر یک ماه (خواسته مالک ۱۹-۱۱ عصر) — رکورد بالای
  // ۳۰ (ایمپورتی‌های ۱۰ ساله = ۳۶۵۰) با ۳۰ پیش‌پر می‌شود و ثبت‌نشده = ۳ روز؛
  // همیشه عددی ۱..۳۰ است و با ذخیره به سرور می‌رود (ولیدیشن Max 30)
  const [wasOpen, setWasOpen] = useState(Boolean(product));
  const [price, setPrice] = useState('');
  const [validity, setValidity] = useState<number | null>(null);
  if (Boolean(product) !== wasOpen) {
    setWasOpen(Boolean(product));
    if (product) {
      setPrice(product.minSalePrice ? product.minSalePrice.toLocaleString('en-US') : '');
      const stored =
        product.priceValidityDays && product.priceValidityDays >= 1 ? product.priceValidityDays : 3;
      setValidity(Math.min(stored, 30));
    }
  }

  const priceNum = num(price);
  const badPrice = Boolean(price) && priceNum < 1000;

  // کدام اکشن در حال اجراست — هر دو دکمه یک mutation دارند؛ برای اسپاینر روی دکمهٔ درست
  const [mode, setMode] = useState<'save' | 'renew'>('save');

  const submit = (renew: boolean) => {
    if (!product || (!renew && badPrice)) return;
    setMode(renew ? 'renew' : 'save');
    save.mutate(
      // اعتبار همیشه عددی ۱..۳۰ است و ارسال می‌شود؛ «آپدیت با همین قیمت»
      // (خواسته مالک ۱۹-۱۱ عصر) قیمت فعلی آگهی را دست‌نخورده می‌فرستد تا فقط
      // مهر زمانی قیمت تازه شود → انقضا صفر و بالا آمدن بین مشابه‌ها
      renew
        ? { id: product.id, minSalePrice: product.minSalePrice ?? 0, priceValidityDays: validity ?? undefined }
        : { id: product.id, minSalePrice: priceNum, priceValidityDays: validity ?? undefined },
      {
        onSuccess: () => {
          toast({
            description: renew
              ? `«${product.productName}» با همان قیمت به‌روزرسانی شد — انقضای قیمت صفر شد.`
              : `قیمت «${product.productName}» به‌روزرسانی شد.`,
          });
          onClose();
        },
        onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
      },
    );
  };

  return (
    <Dialog
      open={Boolean(product)}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="rounded-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-start">آپدیت قیمت</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          {/* نام آگهی + وضعیت انقضای فعلی */}
          <div className="rounded-md bg-secondary/60 px-3 py-2.5">
            <p className="truncate text-[13px] font-extrabold">{product?.productName}</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              {product?.priceExpired ? (
                <span className="font-bold text-amber-600">
                  قیمت این آگهی منقضی شده است — با ذخیره (حتی با همان قیمت) بلافاصله معتبر می‌شود.
                </span>
              ) : product?.priceUpdatedAt ? (
                <>
                  آخرین تغییر قیمت: {timeAgoFa(parseServerDate(product.priceUpdatedAt))} · اعتبار فعلی{' '}
                  {validityLabelFa(product.priceValidityDays)}
                </>
              ) : (
                <>اعتبار فعلی {validityLabelFa(product?.priceValidityDays)}</>
              )}
            </p>
          </div>

          {/* قیمت جدید */}
          <div className="space-y-2">
            <label htmlFor="quick-price" className="text-xs font-bold">
              قیمت جدید <span className="text-muted-foreground">(تومان — خالی بگذارید یعنی «تماس بگیرید»)</span>
            </label>
            <UnitInput
              id="quick-price"
              kind="price"
              value={price}
              onValueChange={(v) => setPrice(v)}
              unit="تومان"
              invalid={badPrice}
              ariaLabel={`قیمت جدید ${product?.productName ?? ''}`}
            />
            {badPrice && <p className="text-[11px] text-red-500">قیمت باید حداقل ۱۰۰۰ تومان باشد (یا خالی = تماس بگیرید).</p>}
          </div>

          {/* اعتبار قیمت — پیش‌فرض ۳ روز */}
          <div className="space-y-2">
            <p className="text-xs font-bold">
              اعتبار قیمت <span className="text-muted-foreground">(حداکثر ۳۰ روز — بعد از این مهلت، قیمت «منقضی شده» نشان داده می‌شود)</span>
            </p>
            <PriceValidityPicker value={validity} onChange={setValidity} ariaLabel="اعتبار قیمت به روز" />
          </div>

          <div className="flex items-center gap-2">
            {/* «آپدیت با همین قیمت» (خواسته مالک ۱۹-۱۱ عصر) — بدون تغییر قیمت،
                فقط مهر زمانی قیمت تازه می‌شود تا انقضا صفر شود و آگهی بین
                مشابه‌ها بالاتر بیاید؛ بدون بکگراند (ghost) کنار دکمهٔ اصلی */}
            <Button
              type="button"
              variant="ghost"
              className="flex-1 rounded-md"
              disabled={save.isPending}
              onClick={() => submit(true)}
            >
              {save.isPending && mode === 'renew' ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> در حال به‌روزرسانی…
                </>
              ) : (
                <>
                  <RefreshCw size={15} /> آپدیت با همین قیمت
                </>
              )}
            </Button>
            <Button
              type="button"
              className="flex-1 rounded-md"
              disabled={save.isPending || badPrice}
              onClick={() => submit(false)}
            >
              {save.isPending && mode === 'save' ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> در حال ذخیره…
                </>
              ) : (
                <>
                  <Save size={15} /> ذخیره قیمت
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
