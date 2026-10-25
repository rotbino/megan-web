'use client';

/**
 * ایمچ من — داشبورد پنل فروشنده (الگوی «باسکول من»):
 * خوش‌آمد + سنجه تکمیل پروفایل + مودال «درباره شما» (حداقل ۳ تا ۵ خط) +
 * میان‌برهای آماری + کارت‌های ارتقا + منوی حساب کاربری (موبایل) + خروج.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Bookmark,
  Coins,
  History,
  LogOut,
  MessageSquare,
  Package,
  Pencil,
  Settings,
  ShieldCheck,
  Smartphone,
  Star,
} from 'lucide-react';
import { usePanelProfile, useSavedLists, useMyProducts } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { PanelCard, QuickStat } from '@/components/panel/panel-parts';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { PanelProfile } from '@/lib/types';

/** محاسبه سنجه تکمیل پروفایل — مثل باسکول: ضعیف/متوسط/عالی */
function completionOf(pf: PanelProfile['profile'], isVerified: boolean) {
  const checks = [
    Boolean(pf.description && pf.description.length >= 100),
    Boolean(pf.profilePhoto),
    Boolean(pf.publicPhone),
    Boolean(pf.address),
    isVerified,
    pf.isCompany,
  ];
  const pct = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  const label = pct >= 85 ? 'عالی' : pct >= 55 ? 'متوسط' : 'ضعیف';
  return { pct, label };
}

const ACCOUNT_MENU = [
  { href: '/panel', label: 'داشبورد', icon: Settings },
  { href: '/panel/wallet', label: 'تاریخچه تراکنش‌ها', icon: History },
  { href: '/panel/messages', label: 'پیام ها', icon: MessageSquare },
  { href: '/panel/verification', label: 'احراز هویت', icon: ShieldCheck },
  { href: '/panel/pricing', label: 'ارتقا عضویت', icon: Star },
  { href: '/panel/products', label: 'محصولات من', icon: Package },
  { href: '/panel/saved', label: 'نشان شده ها', icon: Bookmark },
] as const;

export default function PanelDashboard() {
  const { data: profile } = usePanelProfile();
  const { data: saved } = useSavedLists();
  const { data: mine } = useMyProducts();
  const { logout } = useAuth();
  const { toast } = useToast();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutText, setAboutText] = useState('');

  if (!profile) {
    return (
      <div className="grid h-64 place-items-center text-sm text-muted-foreground">در حال بارگذاری…</div>
    );
  }

  const { userInfo: u, profile: pf } = profile;
  const completion = completionOf(pf, u.isVerified);
  const confirmedCount = mine?.counts.confirmed ?? 0;
  const savedCount = saved?.reduce((a, l) => a + l.cnt, 0) ?? 0;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* خوش‌آمد + تکمیل پروفایل */}
      <PanelCard>
        <div className="flex flex-wrap items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-extrabold text-primary">
            {u.firstName.charAt(0)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-base font-extrabold">
              {u.firstName} {u.lastName}
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                فروشنده
              </span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{pf.address}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-md"
            onClick={() => {
              setAboutText(pf.description ?? '');
              setAboutOpen(true);
            }}
          >
            <Pencil size={14} /> درباره شما
          </Button>
        </div>

        {/* سنجه تکمیل پروفایل */}
        <div className="mt-4 rounded-md bg-secondary/70 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold">تکمیل پروفایل :</span>
            <span
              className={cn(
                'font-extrabold',
                completion.label === 'عالی' ? 'text-emerald-600' : completion.label === 'متوسط' ? 'text-amber-600' : 'text-red-500',
              )}
            >
              {completion.label}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                completion.label === 'عالی' ? 'bg-emerald-500' : completion.label === 'متوسط' ? 'bg-amber-500' : 'bg-red-400',
              )}
              style={{ width: `${Math.max(8, completion.pct)}%` }}
              aria-label={`تکمیل پروفایل ${toFa(completion.pct)} درصد`}
            />
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            هویت حساب کاربری خود را احراز کنید. با تایید هویت خود، برای خریداران، فروشنده مطمئن‌تری باشید.
          </p>
        </div>
      </PanelCard>

      {/* میان‌برهای آماری */}
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <QuickStat icon={Bookmark} label="نشان شده ها" value={toFa(savedCount)} href="/panel/saved" />
        <QuickStat icon={Package} label="محصولات من" value={toFa(confirmedCount)} href="/panel/products" />
        <QuickStat icon={BarChart3} label="خریداران" value={toFa(12)} href="/panel/buyers" />
        <QuickStat icon={Coins} label="موجودی" value={`${toFa(u.walletBalance)} تومان`} href="/panel/wallet" />
      </div>

      {/* کارت‌های ارتقا — احراز هویت و نصب برنامه */}
      <div className="grid gap-3 sm:grid-cols-2">
        <PanelCard className="flex flex-col items-start">
          <span className="grid size-10 place-items-center rounded-md border border-sky-200 bg-sky-50 text-sky-600">
            <ShieldCheck size={19} />
          </span>
          <p className="mt-3 text-sm font-bold leading-6">گام بعدی تا یک پروفایل حرفه‌ای مطمئن، احراز هویت است.</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            برای جلب اعتماد بیشتر خریداران در معاملات، همین حالا احراز هویت کنید.
          </p>
          <Button asChild size="sm" className="mt-4 rounded-md">
            <Link href="/panel/verification">احراز هویت</Link>
          </Button>
        </PanelCard>

        <PanelCard className="flex flex-col items-start">
          <span className="grid size-10 place-items-center rounded-md border border-amber-200 bg-amber-50 text-amber-600">
            <Smartphone size={19} />
          </span>
          <p className="mt-3 text-sm font-bold leading-6">نصب برنامه ایمچ</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">شکار لحظه‌ای خریداران — با اپلیکیشن، خریداران جدید را زودتر از همه ببینید.</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-4 rounded-md"
            onClick={() => toast({ description: 'اپلیکیشن ایمچ به‌زودی در دسترس قرار می‌گیرد.' })}
          >
            نصب برنامه
          </Button>
        </PanelCard>
      </div>

      {/* منوی حساب کاربری — موبایل (دسکتاپ: سایدبار) */}
      <PanelCard className="lg:hidden">
        <p className="mb-2 text-sm font-bold">حساب کاربری</p>
        <nav className="divide-y divide-border/70">
          {ACCOUNT_MENU.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className="flex items-center gap-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
              <Icon size={17} className="text-muted-foreground/70" />
              {label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => {
              logout();
              toast({ description: 'از حساب کاربری خود خارج شدید.' });
            }}
            className="flex w-full items-center gap-3 py-2.5 text-sm text-red-500"
          >
            <LogOut size={17} />
            خروج از حساب کاربری
          </button>
        </nav>
      </PanelCard>

      {/* مودال درباره شما */}
      <Dialog open={aboutOpen} onOpenChange={setAboutOpen}>
        <DialogContent className="rounded-lg sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-start">درباره شما</DialogTitle>
          </DialogHeader>
          <p className="text-start text-xs text-muted-foreground">درباره ی خودتان حداقل ۳ تا ۵ خط بنویسید.</p>
          <Textarea
            dir="rtl"
            value={aboutText}
            onChange={(e) => setAboutText(e.target.value)}
            rows={7}
            className="resize-none text-sm leading-7"
            placeholder="به عنوان مثال: سامی جابر هستم از شهر تهران، عرضه‌کننده عمده پسته و خشکبار…"
          />
          <div className="flex items-center justify-between">
            <span className={cn('text-[11px]', aboutText.trim().length >= 100 ? 'text-emerald-600' : 'text-muted-foreground')}>
              {aboutText.trim().length >= 100 ? 'کافی' : 'کمی طولانی‌تر بنویسید تا اعتماد خریداران جلب شود'}
            </span>
            <Button
              className="rounded-md"
              onClick={() => {
                setAboutOpen(false);
                toast({ description: 'متن «درباره شما» ذخیره شد.' });
              }}
            >
              ذخیره
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
