'use client';

/**
 * جعبه «اشتراک گذاری» — عین پروفایل عمومی باسکول:
 * «ارسال برای دوستان» با دکمه‌های تلگرام / واتس‌اپ / ایمیل + کپی لینک پروفایل.
 */

import { Copy, Mail, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

export function ShareBox({ url, hint }: { url: string; hint?: string }) {
  const { toast } = useToast();

  const btn = 'h-8 flex-1 rounded-md text-[11px]';

  return (
    <div className="rounded-md border bg-card p-4">
      <p className="flex items-center gap-1.5 text-sm font-bold">
        <Share2 size={15} className="text-primary" />
        اشتراک گذاری
      </p>
      <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
        {hint ?? 'برای ارتباط با من روی دکمه ی ارسال پیام بزنید. خوشحال می شوم پروفایل من را با همکارانتان به اشتراک بگذارید.'}
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" variant="outline" className={btn} onClick={() => toast({ description: 'به‌زودی: اشتراک‌گذاری در تلگرام' })}>
          تلگرام
        </Button>
        <Button size="sm" variant="outline" className={btn} onClick={() => toast({ description: 'به‌زودی: اشتراک‌گذاری در واتس آپ' })}>
          واتس آپ
        </Button>
        <Button size="sm" variant="outline" className={btn} onClick={() => toast({ description: 'به‌زودی: اشتراک‌گذاری با ایمیل' })}>
          <Mail size={13} /> ایمیل
        </Button>
      </div>
      <button
        type="button"
        onClick={() => {
          if (typeof navigator !== 'undefined' && navigator.clipboard) {
            navigator.clipboard.writeText(url).catch(() => {});
          }
          toast({ description: 'کپی شد.' });
        }}
        dir="ltr"
        className="mt-2.5 flex w-full items-center justify-center gap-1.5 overflow-hidden rounded-md border border-dashed py-2 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        <Copy size={12} className="shrink-0" />
        <span className="truncate">{url}</span>
      </button>
    </div>
  );
}
