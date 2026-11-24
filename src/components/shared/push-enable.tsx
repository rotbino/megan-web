'use client';

/**
 * بنر فعال‌سازی وب‌پوش (B10) — روی پیام‌های پنل نمایش داده می‌شود:
 * «با فعال‌سازی اعلان‌ها، پیام‌های جدید حتی وقتی ایمچ باز نیست به شما می‌رسد.»
 *
 * فقط وقتی می‌آید که (۱) مرورگر پشتیبانی می‌کند (۲) اجازه هنوز گرفته نشده
 * یا default است. پس از موفقیت مخفی می‌شود (state محلی).
 * حالت denied: راهنمای کوتاه بازکردن اجازه از تنظیمات مرورگر.
 */

import { useState } from 'react';
import { Bell, BellRing, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { enablePushNotifications, pushSupport } from '@/lib/push';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function PushEnableBanner({ className }: { className?: string }) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const support = typeof window === 'undefined' ? 'unsupported' : pushSupport();

  // مرورگر پشتیبانی نمی‌کند / رد شده / کاربر بست → هیچی نشان نده
  if (dismissed || support !== 'available') return null;
  // اگر اجازه قبلاً granted است، سابسکرایب بی‌صدا بعد از ورود انجام می‌شود — بنر لازم نیست
  if (typeof Notification !== 'undefined' && Notification.permission === 'granted') return null;

  const enable = async () => {
    setBusy(true);
    const message = await enablePushNotifications();
    setBusy(false);
    if (message) toast({ description: message });
    if (message?.includes('فعال شد')) setDismissed(true);
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50 p-3',
        className,
      )}
      role="region"
      aria-label="فعال‌سازی اعلان‌ها"
    >
      <div className="flex items-center gap-2.5 text-xs leading-5 text-sky-900">
        <BellRing size={17} className="shrink-0 text-sky-600" />
        <p>
          با فعال‌سازی اعلان‌ها، <b>پیام‌های جدید</b> حتی وقتی ایمچ باز نیست به شما می‌رسد.
        </p>
      </div>
      <div className="flex items-center gap-1.5">
        <Button size="sm" className="rounded-md text-xs" onClick={() => void enable()} disabled={busy}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Bell size={14} />}
          {busy ? 'در حال فعال‌سازی…' : 'فعال‌سازی اعلان‌ها'}
        </Button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="بستن"
          className="grid size-7 place-items-center rounded-md text-sky-700 transition-colors hover:bg-sky-100"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
