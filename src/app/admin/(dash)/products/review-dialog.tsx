'use client';

/**
 * دیالوگ بازبینی آگهی (فاز A4) — تأیید یا رد با دلایل ساختاریافته.
 * دلایل = چک‌باکس‌های عین جعبه باسکول (REJECTION_REASONS پنل کاربر) +
 * دلیل دلخواه؛ رد بدون حداقل یک دلیل سمت سرور هم رد می‌شود (REASON_REQUIRED).
 */

import { useState } from 'react';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { REJECTION_REASONS } from '@/lib/mock/data';
import { reviewAdminProduct, type AdminProductRow } from '@/lib/admin/api';

/** حداقل شکل موردنیاز دیالوگ بازبینی — هم ردیف لیست و هم جزئیات را می‌پذیرد */
export type ReviewableProduct = Pick<
  AdminProductRow,
  'id' | 'product_name' | 'sub_category_name' | 'province_name'
> & { seller: { user_name: string } };

export function ReviewProductDialog({
  product,
  onClose,
  onDone,
}: {
  product: ReviewableProduct | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [custom, setCustom] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState<'approve' | 'reject' | null>(null);

  if (!product) return null;

  const reasons = [
    ...REJECTION_REASONS.filter((_, i) => selected.includes(i)),
    ...(custom.trim() ? [custom.trim()] : []),
  ];

  const submit = async (approve: boolean) => {
    setError('');
    if (!approve && reasons.length === 0) {
      setError('برای رد آگهی حداقل یک دلیل انتخاب یا بنویسید.');
      return;
    }
    setPending(approve ? 'approve' : 'reject');
    try {
      await reviewAdminProduct(product.id, approve, approve ? undefined : reasons);
      onDone();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'عملیات ناموفق بود — دوباره تلاش کنید.');
    } finally {
      setPending(null);
    }
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg rounded-xl">
        <DialogHeader className="text-right">
          <DialogTitle>بازبینی آگهی «{product.product_name}»</DialogTitle>
          <DialogDescription>
            فروشنده: {product.seller.user_name} — {product.sub_category_name} / {product.province_name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <p className="text-[12px] font-bold text-foreground">در صورت رد، دلیل (یا دلایل) را انتخاب کنید:</p>
          <div className="space-y-2">
            {REJECTION_REASONS.map((reason, i) => (
              <label
                key={reason}
                className="flex cursor-pointer items-start gap-2.5 rounded-md border border-input bg-card p-2.5 text-[12px] leading-6 transition-colors hover:bg-secondary/40"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(i)}
                  onChange={(e) =>
                    setSelected((prev) => (e.target.checked ? [...prev, i] : prev.filter((x) => x !== i)))
                  }
                  className="mt-1 size-4 shrink-0 accent-[var(--primary)]"
                />
                <span className="min-w-0">{reason}</span>
              </label>
            ))}
          </div>
          <Input
            value={custom}
            onChange={(e) => setCustom(e.target.value)}
            placeholder="دلیل دیگر (اختیاری)…"
            className="rounded-md text-[12px]"
            maxLength={200}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2 pt-1">
            <Button
              size="lg"
              className="flex-1 rounded-md"
              disabled={pending !== null}
              onClick={() => void submit(true)}
            >
              {pending === 'approve' ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
              تأیید آگهی
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="flex-1 rounded-md border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
              disabled={pending !== null}
              onClick={() => void submit(false)}
            >
              {pending === 'reject' ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              رد آگهی
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
