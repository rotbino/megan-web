'use client';

/**
 * لینک‌های «حساب کاربری» در صفحه ایمچ من — عین menu-list صفحه my-buskool
 * باسکول (خواسته مالک ۲-۱۱ دور سیزدهم): این‌ها از سایدبار بیرون آمده‌اند و
 * فقط اینجا زندگی می‌کنند — تاریخچه تراکنش‌ها، ویرایش پروفایل،
 * معاملات پرداخت امن، راهنما، پشتیبانی، نظرسنجی، خروج.
 * («داشبورد» حذف شد — خود ایمچ من همان داشبورد است؛ لینک به خود صفحه = تکرار)
 */

import Link from 'next/link';
import {
  ChevronLeft,
  ClipboardList,
  Handshake,
  HelpCircle,
  History,
  LifeBuoy,
  LogOut,
  Pencil,
} from 'lucide-react';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';
import { useUnreadMessagesCount } from '@/lib/mock/hooks';
import { UnreadBadge } from '@/components/shared/unread-badge';
import { PanelCard } from '@/components/panel/panel-parts';

interface LinkItem {
  href?: string;
  label: string;
  icon: React.ElementType;
}

const ACCOUNT_LINKS: LinkItem[] = [
  { href: '/panel/wallet', label: 'تاریخچه تراکنش‌ها', icon: History },
  { href: '/panel/profile/edit', label: 'ویرایش پروفایل', icon: Pencil },
  { href: '/panel/secure-deals', label: 'معاملات پرداخت امن', icon: Handshake },
  { href: '/help', label: 'راهنما', icon: HelpCircle },
  { href: '/panel/support', label: 'پشتیبانی', icon: LifeBuoy },
  { href: '/panel/survey', label: 'نظرسنجی', icon: ClipboardList },
  { label: 'خروج از حساب کاربری', icon: LogOut },
];

export function AccountLinks({ className }: { className?: string }) {
  const { logout, user } = useAuth();
  const { toast } = useToast();

  // بج قرمز «پشتیبانی» — پاسخ‌های خوانده‌نشدهٔ گفتگوی پشتیبانی (خواسته مالک ۸-۱۱):
  // polling ۳۰s + push WS؛ با باز کردن صفحهٔ پشتیبانی صفر می‌شود.
  const { data: unread } = useUnreadMessagesCount(Boolean(user));
  const supportUnread = unread?.ticket ?? 0;

  return (
    <PanelCard className={className}>
      <p className="mb-2 text-sm font-bold">حساب کاربری</p>
      <nav className="divide-y divide-border/70" aria-label="لینک‌های حساب کاربری">
        {ACCOUNT_LINKS.map(({ href, label, icon: Icon }) =>
          href ? (
            <Link
              key={label}
              href={href}
              className="flex items-center gap-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Icon size={17} className="shrink-0 text-muted-foreground/70" />
              <span className="flex-1">{label}</span>
              {label === 'پشتیبانی' && (
                <UnreadBadge
                  count={supportUnread}
                  className="static ms-1 h-5 min-w-5 border-0 text-[11px]"
                />
              )}
              <ChevronLeft size={15} className="shrink-0 text-muted-foreground/40" />
            </Link>
          ) : (
            <button
              key={label}
              type="button"
              onClick={() => {
                logout();
                toast({ description: 'از حساب کاربری خود خارج شدید.' });
              }}
              // خروج هم‌رنگ بقیهٔ ردیف‌هاست (خواسته مالک دور ۱۵) — نباید جلب توجه کند
              className="flex w-full items-center gap-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <Icon size={17} className="shrink-0 text-muted-foreground/70" />
              <span className="flex-1 text-start">{label}</span>
            </button>
          ),
        )}
      </nav>
    </PanelCard>
  );
}
