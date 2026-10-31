'use client';

/**
 * ویرایش کالای دفتر خرید — فقط حداقل خرید و دوره قابل ویرایش است؛
 * خود کالا و واحدش از دسته‌بندی می‌آید و تغییر نمی‌کند.
 */

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toFa } from '@/lib/format';
import { RootCategoryIcon } from '@/lib/category-icons';
import type { BuyerBookItem, PurchasePeriod } from '@/lib/types';
import { AmountInput, PeriodPicker } from './form-parts';

export function EditItemDialog({
  item,
  onClose,
  onSave,
  saving,
}: {
  item: BuyerBookItem | null;
  onClose: () => void;
  onSave: (patch: { minAmount: number; period: PurchasePeriod }) => void;
  saving?: boolean;
}) {
  const [amount, setAmount] = useState('');
  const [period, setPeriod] = useState<PurchasePeriod>('monthly');
  const [seededId, setSeededId] = useState<number | null>(null);

  // با هر کالای جدید، مقادیر فعلی در فرم می‌نشیند (الگوی تنظیم state هنگام رندر — بدون افکت)
  if (item && seededId !== item.categoryId) {
    setSeededId(item.categoryId);
    setAmount(String(item.minAmount));
    setPeriod(item.period);
  }

  const valid = Number(amount) > 0;

  return (
    <Dialog open={!!item} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-lg sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-start">ویرایش «{item?.name}»</DialogTitle>
        </DialogHeader>

        {item && (
          <div className="flex items-center gap-3 rounded-md bg-secondary/60 p-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-card text-primary">
              <RootCategoryIcon rootName={item.rootName} size={18} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold">{item.name}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {[item.rootName, item.parentName].filter(Boolean).join(" / ")} — واحد: {item.unit}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">حداقل خرید</label>
            {item && (
              <AmountInput
                value={amount}
                onChange={setAmount}
                unit={item.unit}
                placeholder={`مثلاً ${toFa(item.minAmount)}`}
              />
            )}
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-muted-foreground">دوره خرید</label>
            <PeriodPicker value={period} onChange={setPeriod} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="rounded-md" onClick={onClose}>
            انصراف
          </Button>
          <Button className="rounded-md" disabled={!valid || saving} onClick={() => valid && onSave({ minAmount: Number(amount), period })}>
            {saving && <Loader2 size={15} className="animate-spin" />}
            ذخیره
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
