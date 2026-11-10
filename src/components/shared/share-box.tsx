'use client';

/**
 * جعبه «اشتراک گذاری» — عین کاتالوگ عمومی باسکول:
 * «ارسال برای دوستان» با دکمه‌های تلگرام / واتس‌اپ / ایمیل + کپی لینک کاتالوگ.
 */

import { Copy, Mail, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { SendToContactsButton } from '@/components/shared/send-to-contacts';
import { useOrigin } from '@/lib/use-origin';

export function ShareBox({ path, url, hint }: { path?: string; url?: string; hint?: string }) {
  const { toast } = useToast();
  // لینک کامل از location صفحهٔ فعلی ساخته می‌شود (خواستهٔ مالک ۱۰-۱۱ دور ۴)
  // — path نسبی مثل /c/{id}؛ url مطلق (سازگاری با مصرف‌کننده‌های قدیمی)
  const origin = useOrigin();
  const fullUrl = url ?? (path ? `${origin}${path}` : '');

  const btn = 'h-8 flex-1 rounded-md text-[11px]';

  return (
    <div className="rounded-md border bg-card p-4">
      <p className="flex items-center gap-1.5 text-sm font-bold">
        <Share2 size={15} className="text-primary" />
        اشتراک گذاری
      </p>
      <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
        {hint ?? 'برای ارتباط با من روی دکمه ی ارسال پیام بزنید. خوشحال می شوم کاتالوگ من را با همکارانتان به اشتراک بگذارید.'}
      </p>
      {/* ارسال به مخاطبین (خواسته مالک ۴-۱۱) — اولین دکمه؛ فقط موبایل */}
      <SendToContactsButton className="mt-3" />
      <div className="mt-2 flex items-center gap-2">
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
            navigator.clipboard.writeText(fullUrl).catch(() => {});
          }
          toast({ description: 'کپی شد.' });
        }}
        dir="ltr"
        className="mt-2.5 flex w-full items-center justify-center gap-1.5 overflow-hidden rounded-md border border-dashed py-2 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
      >
        <Copy size={12} className="shrink-0" />
        <span className="truncate">{fullUrl || '…'}</span>
      </button>
    </div>
  );
}
