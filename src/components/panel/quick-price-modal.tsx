'use client';

import { useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PriceValidityPicker } from '@/components/panel/product-form/price-validity-picker';
import { UnitInput } from '@/components/shared/unit-input';
import { useUpdateProductPrice } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { timeAgoFa, parseServerDate, toFa } from '@/lib/format';

const num = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0;

/**
 * مودال سریع «آپدیت قیمت» (خواسته مالک ۷-۱۱ دور هفدهم) — از دکمهٔ ظریف زیر
 * کارت آگهی و از روی بج «قیمت منقضی شده» باز می‌شود؛ فقط قیمت + اعتبار،
 * بدون تایید مجدد. مهر زمانی قیمت در بک‌اند تازه می‌شود و انقضا صفر می‌شود.
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

  // پیش‌پر شدن فرم با هر بار باز شدن — الگوی «state حین رندر» (بدون effect)
  const [wasOpen, setWasOpen] = useState(Boolean(product));
  const [price, setPrice] = useState('');
  const [validity, setValidity] = useState(3);
  if (Boolean(product) !== wasOpen) {
    setWasOpen(Boolean(product));
    if (product) {
      setPrice(product.minSalePrice ? product.minSalePrice.toLocaleString('en-US') : '');
      setValidity(product.priceValidityDays ?? 3);
    }
  }

  const priceNum = num(price);
  const badPrice = Boolean(price) && priceNum < 1000;

  const submit = () => {
    if (!product || badPrice) return;
    save.mutate(
      { id: product.id, minSalePrice: priceNum, priceValidityDays: validity },
      {
        onSuccess: () => {
          toast({ description: `قیمت «${product.productName}» به‌روزرسانی شد.` });
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
                  قیمت این آگهی منقضی شده است — با ذخیرهٔ قیمت جدید، بلافاصله معتبر می‌شود.
                </span>
              ) : product?.priceUpdatedAt ? (
                <>
                  آخرین تغییر قیمت: {timeAgoFa(parseServerDate(product.priceUpdatedAt))} · اعتبار فعلی{' '}
                  {toFa(product.priceValidityDays ?? 3)} روز
                </>
              ) : (
                <>اعتبار فعلی {toFa(product?.priceValidityDays ?? 3)} روز</>
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
              اعتبار قیمت <span className="text-muted-foreground">(پیش‌فرض ۳ روز — بعد از این مهلت، قیمت «منقضی شده» نشان داده می‌شود)</span>
            </p>
            <PriceValidityPicker value={validity} onChange={setValidity} ariaLabel="اعتبار قیمت به روز" />
          </div>

          <Button
            className="w-full rounded-md"
            disabled={save.isPending || badPrice}
            onClick={submit}
          >
            {save.isPending ? (
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
      </DialogContent>
    </Dialog>
  );
}
