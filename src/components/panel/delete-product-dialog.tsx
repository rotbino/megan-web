'use client';

/**
 * دیالوگ تأیید حذف آگهی (خواسته مالک ۳-۱۱) — حذف بدون تأیید ممنوع.
 * حذف نرم است: آگهی به تب «حذف شده» می‌رود و سوابق قیمت/موجودی/حداقل فروش
 * نزد ایمچ می‌ماند — همین جمله در دیالوگ هم گفته می‌شود تا فروشنده بداند
 * پاک‌کردن آگهی، تاریخ را از بین نمی‌برد (ضد حقه‌بازی پس از فروش).
 */

import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function DeleteProductDialog({
  product,
  deleting,
  onClose,
  onConfirm,
}: {
  /** آگهی هدف — null یعنی بسته */
  product: { id: number; productName: string } | null;
  deleting?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={Boolean(product)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="rounded-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-start">حذف آگهی</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
            <AlertTriangle size={20} className="mt-0.5 shrink-0 text-destructive" />
            <div>
              <p className="font-extrabold">آگهی «{product?.productName}» حذف شود؟</p>
              <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
                آگهی به فهرست «حذف شده» منتقل و از نتایج بازار کنار می‌رود؛ سوابق قیمت، موجودی و
                حداقل فروش آن برای رجوع در موارد اختلاف نزد ایمچ محفوظ می‌ماند.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="rounded-md" onClick={onClose} disabled={deleting}>
              انصراف
            </Button>
            <Button
              variant="destructive"
              className="rounded-md"
              onClick={onConfirm}
              disabled={deleting}
            >
              {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              {deleting ? 'در حال حذف…' : 'حذف آگهی'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
