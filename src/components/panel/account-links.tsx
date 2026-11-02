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
  const { logout } = useAuth();
  const { toast } = useToast();

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
              className="flex w-full items-center gap-3 py-2.5 text-sm text-red-500 transition-colors hover:text-red-600"
            >
              <Icon size={17} className="shrink-0" />
              <span className="flex-1 text-start">{label}</span>
            </button>
          ),
        )}
      </nav>
    </PanelCard>
  );
}
