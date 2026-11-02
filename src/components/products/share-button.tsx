'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/**
 * آیکون اشتراک‌گذاری کنار آیکون نشان کردن (خواسته مالک ۲-۱۱ دور یازدهم —
 * از رو‌به‌روی عنوان به کنار نشان آمد و بزرگ/واضح شد: ۴۴px هدف لمسی + آیکون ۲۲).
 * موبایل: Web Share بومی (تلگرام/واتس‌اپ/… خود گوشی)؛ دسکتاپ: کپی لینک.
 */
export function ShareButton({ url, title }: { url: string; title: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const full = url.startsWith('http') ? url : `${window.location.origin}${url}`;
    // وب‌شیر بومی اگر بود — تجربهٔ بهتر موبایل
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url: full });
        return;
      } catch {
        /* کاربر خودش بست — کپی نمی‌کنیم */
        return;
      }
    }
    try {
      await navigator.clipboard.writeText(full);
      setCopied(true);
      toast({ description: 'لینک آگهی کپی شد.' });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ description: 'کپی لینک ممکن نشد.', variant: 'destructive' });
    }
  };

  return (
    <button
      type="button"
      onClick={share}
      aria-label="اشتراک‌گذاری آگهی"
      title="اشتراک‌گذاری آگهی"
      className={cn(
        'inline-flex size-11 shrink-0 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary',
        copied && 'border-primary/45 text-primary',
      )}
    >
      {copied ? <Check size={22} strokeWidth={2.2} /> : <Share2 size={22} strokeWidth={2.2} />}
    </button>
  );
}
