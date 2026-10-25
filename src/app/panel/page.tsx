'use client';

/**
 * ایمچ من — داشبورد پنل (الگوی «باسکول من»):
 * فروشنده: میان‌برهای آماری فروش + کارت‌های ارتقا.
 * خریدار: درخواست‌های خرید + فروشندگان پیشنهادی + متن‌های مخصوص خریدار
 * (عین MHTML حالت خریدار: «برای فروشندگان، خریدار مطمئن تری باشید»).
 * خوش‌آمد + سنجه تکمیل پروفایل + مودال «درباره شما» + منوی حساب کاربری (موبایل) + خروج.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  BarChart3,
  Bookmark,
  Coins,
  FileText,
  History,
  LogOut,
  MessageSquare,
  Package,
  Pencil,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Sparkles,
  Star,
} from 'lucide-react';
import { usePanelProfile, useSavedLists, useMyProducts, useMyBuyRequests } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { PanelCard, QuickStat } from '@/components/panel/panel-parts';
import { AccountLinks } from '@/components/panel/account-links';
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

const SELLER_ACCOUNT_MENU = [
  { href: '/panel', label: 'داشبورد', icon: Settings },
  { href: '/panel/wallet', label: 'تاریخچه تراکنش‌ها', icon: History },
  { href: '/panel/messages', label: 'پیام ها', icon: MessageSquare },
  { href: '/panel/verification', label: 'احراز هویت', icon: ShieldCheck },
  { href: '/panel/pricing', label: 'ارتقا عضویت', icon: Star },
  { href: '/panel/products', label: 'محصولات من', icon: Package },
  { href: '/panel/saved', label: 'نشان شده ها', icon: Bookmark },
] as const;

const BUYER_ACCOUNT_MENU = [
  { href: '/panel', label: 'داشبورد', icon: Settings },
  { href: '/panel/wallet', label: 'تاریخچه تراکنش‌ها', icon: History },
  { href: '/panel/messages', label: 'پیام ها', icon: MessageSquare },
  { href: '/panel/verification', label: 'احراز هویت', icon: ShieldCheck },
  { href: '/panel/my-requests', label: 'درخواست های من', icon: FileText },
  { href: '/panel/buy-requests/new', label: 'ثبت درخواست خرید', icon: ShoppingCart },
  { href: '/panel/saved', label: 'نشان شده ها', icon: Bookmark },
] as const;

export default function PanelDashboard() {
  const { data: profile } = usePanelProfile();
  const { data: saved } = useSavedLists();
  const { data: mine } = useMyProducts();
  const { data: myRequests } = useMyBuyRequests();
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [aboutOpen, setAboutOpen] = useState(false);
  const [aboutText, setAboutText] = useState('');

  const isBuyer = user?.role === 'buyer';

  if (!profile) {
    return (
      <div className="grid h-64 place-items-center text-sm text-muted-foreground">در حال بارگذاری…</div>
    );
  }

  const { userInfo: u, profile: pf } = profile;
  const completion = completionOf(pf, u.isVerified);
  const confirmedCount = mine?.counts.confirmed ?? 0;
  const savedCount = saved?.reduce((a, l) => a + l.cnt, 0) ?? 0;
  const confirmedRequests = myRequests?.counts.confirmed ?? 0;
  const ACCOUNT_MENU = isBuyer ? BUYER_ACCOUNT_MENU : SELLER_ACCOUNT_MENU;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* خوش‌آمد + تکمیل پروفایل */}
        {/* خوش‌آمد + تکمیل پروفایل — نام و آواتار به صفحه پروفایل */}
      <PanelCard>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/panel/profile"
            className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-extrabold text-primary transition-colors hover:bg-primary/20"
            aria-label="مشاهده صفحه پروفایل"
          >
            {u.firstName.charAt(0)}
          </Link>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-base font-extrabold">
              <Link href="/panel/profile" className="transition-colors hover:text-primary">
                {u.firstName} {u.lastName}
              </Link>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-600">
                {isBuyer ? 'خریدار' : 'فروشنده'}
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
            هویت حساب کاربری خود را احراز کنید. با تایید هویت خود، برای{' '}
            {isBuyer ? 'فروشندگان، خریدار مطمئن‌تری' : 'خریداران، فروشنده مطمئن‌تری'} باشید.
          </p>
        </div>
      </PanelCard>

      {/* میان‌برهای آماری */}
      {isBuyer ? (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <QuickStat icon={Bookmark} label="نشان شده ها" value={toFa(savedCount)} href="/panel/saved" />
          <QuickStat icon={FileText} label="درخواست های من" value={toFa(confirmedRequests)} href="/panel/my-requests" />
          <QuickStat icon={Sparkles} label="پیشنهادی" value={toFa(2)} href="/panel/suggested-sellers" />
          <QuickStat icon={Coins} label="موجودی" value={`${toFa(u.walletBalance)} تومان`} href="/panel/wallet" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <QuickStat icon={Bookmark} label="نشان شده ها" value={toFa(savedCount)} href="/panel/saved" />
          <QuickStat icon={Package} label="محصولات من" value={toFa(confirmedCount)} href="/panel/products" />
          <QuickStat icon={BarChart3} label="خریداران" value={toFa(12)} href="/panel/buyers" />
          <QuickStat icon={Coins} label="موجودی" value={`${toFa(u.walletBalance)} تومان`} href="/panel/wallet" />
        </div>
      )}

      {/* دعوت به اقدام خریدار — ثبت درخواست خرید */}
      {isBuyer && (
        <PanelCard className="flex flex-wrap items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-md border border-primary/20 bg-primary/5 text-primary">
            <ShoppingCart size={19} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold leading-6">به دنبال خرید عمده چه محصولی هستید؟</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              با ثبت یک درخواست خرید، از چندین فروشنده قیمت عمده دریافت کنید.
            </p>
          </div>
          <Button asChild size="sm" className="rounded-md">
            <Link href="/panel/buy-requests/new">ثبت درخواست خرید</Link>
          </Button>
        </PanelCard>
      )}

      {/* کارت‌های ارتقا — احراز هویت و نصب برنامه */}
      <div className="grid gap-3 sm:grid-cols-2">
        <PanelCard className="flex flex-col items-start">
          <span className="grid size-10 place-items-center rounded-md border border-sky-200 bg-sky-50 text-sky-600">
            <ShieldCheck size={19} />
          </span>
          <p className="mt-3 text-sm font-bold leading-6">گام بعدی تا یک پروفایل حرفه‌ای مطمئن، احراز هویت است.</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            برای جلب اعتماد بیشتر {isBuyer ? 'فروشندگان' : 'خریداران'} در معاملات، همین حالا احراز هویت کنید.
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
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {isBuyer
              ? 'اطلاع از قیمت لحظه‌ای محصولات — با اپلیکیشن، پاسخ فروشندگان را زودتر ببینید.'
              : 'شکار لحظه‌ای خریداران — با اپلیکیشن، خریداران جدید را زودتر از همه ببینید.'}
          </p>
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

      {/* لینک‌های حساب کاربری — عین menu-list باسکول (موبایل‌پسند، همه‌جا نمایش) */}
      <AccountLinks />

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
              {aboutText.trim().length >= 100 ? 'کافی' : 'کمی طولانی‌تر بنویسید تا اعتماد طرف مقابل جلب شود'}
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
