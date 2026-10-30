'use client';

/**
 * لینک‌های پایین صفحه «ایمچ من» — عین menu-list صفحه my-buskool باسکول،
 * در دو حالت خریدار/فروشنده (خواسته کاربر: این لینک‌ها مخصوصاً در موبایل کاربردی‌اند).
 * خریدار: پروفایل / نشان شده ها / درخواست های من / پیشنهادی / معاملات پرداخت امن /
 *          پیام ها / ویرایش پروفایل / احراز هویت / راهنما / پشتیبانی / نظرسنجی / خروج
 * فروشنده: پروفایل / نشان شده ها / خریداران / خریداران پیشنهادی / پیام ها /
 *          ویرایش پروفایل / احراز هویت / راهنما / پشتیبانی / نظرسنجی / خروج
 */

import Link from 'next/link';
import {
  BadgeCheck,
  Bookmark,
  ChevronLeft,
  ClipboardList,
  FileText,
  Handshake,
  Headphones,
  HelpCircle,
  LifeBuoy,
  LogOut,
  MessageSquare,
  Pencil,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
} from 'lucide-react';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';
import { PanelCard } from '@/components/panel/panel-parts';

interface LinkItem {
  href?: string;
  label: string;
  icon: React.ElementType;
}

export function AccountLinks() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const isBuyer = user?.role === 'buyer';

  const items: LinkItem[] = isBuyer
    ? [
        { href: '/panel/profile', label: 'پروفایل', icon: UserRound },
        { href: '/panel/saved', label: 'نشان شده ها', icon: Bookmark },
        { href: '/panel/my-requests', label: 'درخواست های من', icon: FileText },
        { href: '/panel/suggested-sellers', label: 'پیشنهادی', icon: Sparkles },
        { href: '/panel/secure-deals', label: 'معاملات پرداخت امن', icon: Handshake },
        { href: '/panel/messages', label: 'پیام ها', icon: MessageSquare },
        { href: '/panel/profile/edit', label: 'ویرایش پروفایل', icon: Pencil },
        { href: '/panel/verification', label: 'احراز هویت', icon: ShieldCheck },
        { href: '/help', label: 'راهنما', icon: HelpCircle },
        { href: '/panel/support', label: 'پشتیبانی', icon: LifeBuoy },
        { href: '/panel/survey', label: 'نظرسنجی', icon: ClipboardList },
        { label: 'خروج از حساب کاربری', icon: LogOut },
      ]
    : [
        { href: '/panel/profile', label: 'پروفایل', icon: UserRound },
        { href: '/panel/saved', label: 'نشان شده ها', icon: Bookmark },
        { href: '/panel/buyers', label: 'خریداران', icon: Users },
        { href: '/panel/suggested-buyers', label: 'خریداران پیشنهادی', icon: BadgeCheck },
        { href: '/panel/messages', label: 'پیام ها', icon: MessageSquare },
        { href: '/panel/profile/edit', label: 'ویرایش پروفایل', icon: Pencil },
        { href: '/panel/verification', label: 'احراز هویت', icon: ShieldCheck },
        { href: '/help', label: 'راهنما', icon: HelpCircle },
        { href: '/panel/support', label: 'پشتیبانی', icon: LifeBuoy },
        { href: '/panel/survey', label: 'نظرسنجی', icon: ClipboardList },
        { label: 'خروج از حساب کاربری', icon: LogOut },
      ];

  return (
    <PanelCard>
      <p className="mb-2 text-sm font-bold">حساب کاربری</p>
      <nav className="divide-y divide-border/70" aria-label="لینک‌های حساب کاربری">
        {items.map(({ href, label, icon: Icon }) =>
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
