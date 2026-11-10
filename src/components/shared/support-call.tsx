'use client';

/**
 * دکمه «تماس با پشتیبانی» (خواسته مالک ۴-۱۱) — شماره در موبایل نمایش
 * داده نمی‌شود: روی دستگاه لمسی مستقیم شماره‌گیری می‌کند (tel:) و در
 * دسکتاپ شماره را داخل یک مدال کوچک نشان می‌دهد (با کپی).
 */

import { useState } from 'react';
import { useSyncExternalStore } from 'react';
import { Copy, Headset, Phone } from 'lucide-react';
import { AIMCH_SUPPORT_PHONE } from '@/lib/mock/data';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

/** tel: بین‌المللی — ۰۹۱۹… → +۹۸۹۱۹… */
const telHref = `tel:+98${AIMCH_SUPPORT_PHONE.replace(/^0/, '')}`;

/** دنبالهٔ کوئری لمسی — اگر pointer عوض شود (چرخش/دستگاه جدید) هم تازه می‌شود */
function subscribePointerCoarse(cb: () => void) {
  const mq = window.matchMedia('(pointer: coarse)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

/** آیا دستگاه لمسی/موبایل است؟ — اسنپ‌شات سرور false (دسکتاپ امن)، بعد از
 *  هیدریشن مقدار واقعی؛ الگوی رسمی useSyncExternalStore بدون effect */
function useIsTouch(): boolean {
  return useSyncExternalStore(
    subscribePointerCoarse,
    () => window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window,
    () => false,
  );
}

export function SupportCallButton({
  label = 'تماس با پشتیبانی',
  variant = 'default',
  className,
}: {
  label?: string;
  variant?: 'default' | 'outline';
  className?: string;
}) {
  const { toast } = useToast();
  const isTouch = useIsTouch();
  const [open, setOpen] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(AIMCH_SUPPORT_PHONE);
      toast({ description: 'شماره پشتیبانی کپی شد.' });
    } catch {
      toast({ description: `شماره پشتیبانی: ${AIMCH_SUPPORT_PHONE}` });
    }
  };

  return (
    <>
      {isTouch ? (
        /* موبایل — مستقیم تماس؛ شماره هرگز روی دکمه نیست (خواسته مالک) */
        <Button asChild variant={variant} className={cn('rounded-md text-xs', className)}>
          <a href={telHref}>
            <Phone size={14} /> {label}
          </a>
        </Button>
      ) : (
        /* دسکتاپ — شماره داخل مدال */
        <Button variant={variant} className={cn('rounded-md text-xs', className)} onClick={() => setOpen(true)}>
          <Phone size={14} /> {label}
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xs">
          <DialogHeader className="text-start sm:text-start">
            <DialogTitle className="flex items-center gap-2 text-sm">
              <Headset size={17} className="text-primary" /> تماس با پشتیبانی مالی
            </DialogTitle>
            <DialogDescription className="text-xs leading-6">
              در ساعات کاری پاسخگوی شما هستیم؛ اگر موضوع فیش شارژ است، ارسال فیش در همان صفحه کافی است.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 rounded-lg border bg-secondary/50 p-3">
            <span dir="ltr" className="flex-1 text-center font-num text-lg font-extrabold tracking-widest">
              {AIMCH_SUPPORT_PHONE.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])}
            </span>
            <Button size="sm" variant="outline" className="rounded-md" onClick={() => void copy()}>
              <Copy size={14} /> کپی
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
