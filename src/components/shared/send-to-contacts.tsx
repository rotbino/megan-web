'use client';

/**
 * ارسال به مخاطبین (خواسته مالک ۴-۱۱) — کامپوننت مشترک و قابل‌استفاده مجدد:
 *  • دکمهٔ «ارسال به مخاطبین» — فقط موبایل (دسکتاپ مخفی)؛ اولین دکمهٔ جعبهٔ
 *    «ارسال برای دوستان» است و کارش لود یک‌بارهٔ مخاطبین گوشی در ایمچ است.
 *  • بات‌شیت مخاطبین: اعضای ایمچ متمایز دیده می‌شوند و بقیه دکمهٔ
 *    «دعوت به آیمچ» دارند که پیامک دعوت (sms:) را برای همان مخاطب باز می‌کند.
 *  • خواندن مخاطبین گوشی با Contact Picker مرورگر (Android Chrome) انجام
 *    می‌شود و در جدول Contact بک‌اند ذخیره می‌ماند — از آن پس همیشه در
 *    دسترس است (حتی در مرورگرهای بدون پشتیبانی).
 *
 * استفاده در هر جعبهٔ اشتراک: <SendToContactsButton /> (لاگین لازم است).
 */

import { useMemo, useState } from 'react';
import { CheckCircle2, RefreshCw, Search, Send, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { useAuth } from '@/lib/mock/auth';
import { useImportPhoneContacts, useMyPhoneContacts } from '@/lib/mock/hooks';
import type { PhoneContact } from '@/lib/mock/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

/** لینک دعوت — هم‌شکل SHARE_LINK جعبه‌های اشتراک */
const INVITE_URL = 'https://imach.ir';
const INVITE_TEXT = `سلام، شما را به ایمچ دعوت می‌کنم — بازار خرید و فروش عمده. عضو شوید: ${INVITE_URL}`;

/** شکل خروجی Contact Picker مرورگر */
interface PickedContact {
  name?: string[];
  tel?: string[];
}

/** پشتیبانی Contact Picker (Android Chrome) — بقیه فقط لیست ذخیره‌شده را می‌بینند */
function pickerSupported(): boolean {
  return typeof navigator !== 'undefined' && typeof (navigator as { contacts?: { select?: unknown } }).contacts?.select === 'function';
}

/** انتخاب مخاطبین توسط خود کاربر — null یعنی لغو/خطا */
async function pickPhoneContacts(): Promise<{ name?: string; phone: string }[] | null> {
  try {
    const contacts = (navigator as unknown as {
      contacts: { select: (p: string[], o: { multiple: boolean }) => Promise<PickedContact[]> };
    }).contacts;
    const selected = await contacts.select(['name', 'tel'], { multiple: true });
    return selected
      .map((c) => ({ name: c.name?.[0]?.trim() || undefined, phone: (c.tel?.[0] ?? '').trim() }))
      .filter((c) => c.phone);
  } catch {
    return null; // کاربر بست/رد کرد
  }
}

/** لینک پیامک دعوت — iOS جداکنندهٔ & می‌خواهد، بقیهٔ موبایل‌ها ? */
function smsInviteHref(phone: string): string {
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const body = encodeURIComponent(INVITE_TEXT);
  return isIOS ? `sms:${phone}&body=${body}` : `sms:${phone}?body=${body}`;
}

/** نمایش یک مخاطب — عضو: بج سبز؛ غیرعضو: دکمهٔ «دعوت به آیمچ» (پیامک) */
function ContactRow({ c }: { c: PhoneContact }) {
  const title = c.name?.trim() || c.phone;
  return (
    <li className="flex items-center gap-2.5 px-3 py-2.5">
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-sm font-extrabold text-primary">
        {c.memberAvatarUrl ? (
          <img src={c.memberAvatarUrl} alt="" className="size-full object-cover" loading="lazy" />
        ) : (
          title.trim().charAt(0)
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-bold">{title}</span>
        <span dir="ltr" className="block truncate text-[11px] text-muted-foreground">
          {c.phone}
        </span>
      </span>
      {c.isMember ? (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-600">
          <CheckCircle2 size={13} />
          عضو ایمچ
        </span>
      ) : (
        <a
          href={smsInviteHref(c.phone)}
          className="flex shrink-0 items-center gap-1 rounded-md border border-input bg-card px-2.5 py-1.5 text-[11px] font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        >
          <Send size={12} />
          دعوت به آیمچ
        </a>
      )}
    </li>
  );
}

/** بات‌شیت مخاطبین — لیست + جستجو + همگام‌سازی مجدد از گوشی */
function ContactsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const { data, isLoading } = useMyPhoneContacts();
  const importContacts = useImportPhoneContacts();
  const [q, setQ] = useState('');

  const items = data?.items ?? [];
  const visible = useMemo(() => {
    const t = q.trim();
    if (!t) return items;
    return items.filter((c) => (c.name ?? '').includes(t) || c.phone.includes(t));
  }, [items, q]);

  /** همگام‌سازی از گوشی — خود کاربر مخاطبین را در پیکر انتخاب می‌کند */
  const syncFromPhone = async () => {
    const picked = await pickPhoneContacts();
    if (!picked || picked.length === 0) return;
    try {
      const r = await importContacts.mutateAsync(picked);
      toast({ description: r.imported > 0 ? `${r.imported.toLocaleString('fa-IR')} مخاطب جدید اضافه شد.` : 'مخاطبین شما به‌روز است.' });
    } catch (err) {
      toast({ description: err instanceof Error ? err.message : 'درون‌ریزی مخاطبین ناموفق بود.', variant: 'destructive' });
    }
  };

  return (
    <BottomSheet open={open} onClose={onClose} title="ارسال به مخاطبین">
      {/* جستجو + همگام‌سازی */}
      <div className="flex shrink-0 items-center gap-2 border-b border-border/70 px-3 py-2.5">
        <div className="relative min-w-0 flex-1">
          <Search size={14} className="absolute end-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="جستجوی مخاطب…"
            className="h-9 rounded-md pe-8 text-xs"
          />
        </div>
        {pickerSupported() && (
          <Button
            size="icon"
            variant="outline"
            className="size-9 shrink-0 rounded-md"
            aria-label="همگام‌سازی از مخاطبین گوشی"
            title="همگام‌سازی از مخاطبین گوشی"
            disabled={importContacts.isPending}
            onClick={() => void syncFromPhone()}
          >
            <RefreshCw size={14} className={cn(importContacts.isPending && 'animate-spin')} />
          </Button>
        )}
      </div>

      {/* لیست */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-md bg-secondary/60" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="p-6 text-center">
            <Users size={28} className="mx-auto text-muted-foreground/50" />
            {pickerSupported() ? (
              <>
                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  مخاطبین گوشی‌تان را یک‌بار در ایمچ لود کنید.
                </p>
                <Button size="sm" className="mt-3 rounded-md" disabled={importContacts.isPending} onClick={() => void syncFromPhone()}>
                  {importContacts.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Users size={14} />}
                  افزودن از مخاطبین گوشی
                </Button>
              </>
            ) : (
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                این مرورگر از خواندن مخاطبین گوشی پشتیبانی نمی‌کند — با کروم اندروید باز کنید.
              </p>
            )}
          </div>
        ) : visible.length === 0 ? (
          <p className="p-6 text-center text-xs text-muted-foreground">مخاطبی با این نام پیدا نشد.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {visible.map((c) => (
              <ContactRow key={c.id} c={c} />
            ))}
          </ul>
        )}
      </div>

      {/* تعداد — تنها متن پانویس */}
      {items.length > 0 && (
        <p className="shrink-0 border-t border-border/70 px-3 py-2 text-center text-[11px] text-muted-foreground">
          {visible.length.toLocaleString('fa-IR')} مخاطب
        </p>
      )}
    </BottomSheet>
  );
}

/**
 * دکمهٔ «ارسال به مخاطبین» — فقط موبایل؛ اولین دکمهٔ جعبهٔ اشتراک.
 * کلیک: لیست خالی است → مستقیم پیکر مخاطبین گوشی باز می‌شود (لود یک‌باره)؛
 * در غیر این صورت بات‌شیت مخاطبین باز می‌شود.
 */
export function SendToContactsButton({ className }: { className?: string }) {
  const { user } = useAuth();
  const { data } = useMyPhoneContacts();
  const [open, setOpen] = useState(false);
  const hasContacts = (data?.items?.length ?? 0) > 0;

  const onClick = async () => {
    if (!user) return; // فقط کاربر واردشده — رندر هم گیت شده
    if (hasContacts || !pickerSupported()) {
      setOpen(true);
      return;
    }
    // لود یک‌باره: اول پیکر مخاطبین، بعد بات‌شیت
    const picked = await pickPhoneContacts();
    if (picked && picked.length > 0) {
      const { importPhoneContacts } = await import('@/lib/mock/api');
      try {
        await importPhoneContacts(picked);
      } catch {
        /* خطا را در بات‌شیت/توست بعدی نشان می‌دهیم — لیست به‌هرحال باز می‌شود */
      }
    }
    setOpen(true);
  };

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => void onClick()}
        className={cn(
          'hidden h-8 w-full items-center justify-center gap-1.5 rounded-md border border-input bg-card px-3 text-[11px] font-bold text-foreground/80 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary nav-mobile:flex',
          className,
        )}
      >
        <Users size={14} />
        ارسال به مخاطبین
      </button>
      {open && <ContactsSheet open={open} onClose={() => setOpen(false)} />}
    </>
  );
}

/** صادرات داخل‌ماژول برای استفادهٔ آینده در جاهای دیگر (بدون رندر مجدد) */
export { ContactsSheet, ContactRow };
