'use client';

/**
 * ایمچ من — خلوت عین «باسکول من» (خواسته مالک ۲-۱۱ دور چهاردهم):
 * فقط باکس لینک پروفایل + باکس اشتراک، و بلافاصله بعدش آیتم‌های منو.
 * آمارها/کارت‌های ارتقا/تکمیل پروفایل حذف شدند — «هر عنصر دلیلی برای بودن
 * باید داشته باشد» (RULES §۱-ب مینیمالیسم).
 * موبایل: منوی نقش + کیف پول + سوییچ حساب داخل خود صفحه می‌آیند (الگوی
 * menu-list باسکول — منوی جداگانه منسوخ است)؛ سوییچ عمداً بالاتر از منو
 * است تا سوییچ سریع بین دو پنل ممکن باشد (خواسته مالک).
 */

import Link from 'next/link';
import {
  BadgeCheck,
  BookOpenText,
  Bookmark,
  ChevronLeft,
  Crown,
  FileText,
  Inbox,
  Medal,
  MessageSquare,
  Package,
  PlusSquare,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { useMyPackage, usePanelProfile } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { PanelCard } from '@/components/panel/panel-parts';
import { AccountLinks } from '@/components/panel/account-links';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

/** ردیف منوی درون‌صفحه — الگوی list-item باسکول: آیکون + متن + پیکان، جداشده با خط ظریف */
function MenuRow({
  href,
  label,
  icon: Icon,
  tone = 'default',
}: {
  href: string;
  label: string;
  icon: React.ElementType;
  tone?: 'default' | 'gold';
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <Icon size={18} className={cn('shrink-0', tone === 'gold' ? 'text-amber-500' : 'text-muted-foreground/70')} />
      <span className="flex-1">{label}</span>
      <ChevronLeft size={15} className="shrink-0 text-muted-foreground/40" />
    </Link>
  );
}

export default function PanelDashboard() {
  const { data: profile } = usePanelProfile();
  const { data: myPackage } = useMyPackage();
  const { user, setRole } = useAuth();

  const isBuyer = user?.role === 'buyer';
  const role = isBuyer ? 'buyer' : 'seller';

  if (!profile) {
    return (
      <div className="grid h-64 place-items-center text-sm text-muted-foreground">در حال بارگذاری…</div>
    );
  }

  const { userInfo: u } = profile;
  const fullName = `${u.firstName} ${u.lastName}`;
  const planTitle =
    myPackage?.planTitle ?? (myPackage?.pakageType === 1 ? 'دو ماهه' : myPackage?.pakageType === 2 ? 'شش ماهه' : 'یک‌ساله');

  /** منوی نقش داخل صفحه — فقط موبایل (دسکتاپ: همین آیتم‌ها در سایدبارند،
   *  الگوی hidden-in-desktop باسکول). «ایمچ من» خودش حذف می‌شود — همین‌جاییم */
  const roleMenu = isBuyer
    ? [
        { href: '/panel/buyer-book', label: 'دفتر خرید من', icon: BookOpenText },
        { href: '/panel/buy-requests/new', label: 'ثبت درخواست خرید', icon: ShoppingCart },
        { href: '/panel/messages', label: 'پیام ها', icon: MessageSquare },
        { href: '/panel/suggested-sellers', label: 'فروشندگان پیشنهادی', icon: Sparkles },
        { href: '/panel/my-requests', label: 'درخواست های من', icon: FileText },
        { href: '/panel/verification', label: 'احراز هویت', icon: ShieldCheck },
        { href: '/panel/saved', label: 'نشان شده ها', icon: Bookmark },
      ]
    : [
        { href: '/panel/products/new', label: 'ثبت محصول', icon: PlusSquare },
        { href: '/panel/messages', label: 'پیام ها', icon: MessageSquare },
        { href: '/panel/buyers', label: 'خریداران', icon: Users },
        { href: '/panel/suggested-buyers', label: 'خریداران پیشنهادی', icon: BadgeCheck },
        { href: '/panel/products', label: 'محصولات من', icon: Package },
        { href: '/panel/verification', label: 'احراز هویت', icon: ShieldCheck },
        { href: '/panel/pricing', label: 'ارتقا عضویت', icon: Medal },
        { href: '/panel/saved', label: 'نشان شده ها', icon: Bookmark },
      ];

  return (
    <div className="mx-auto max-w-2xl">
      {/* باکس لینک پروفایل — مینیمال عین سکشن profile باسکول: تصویر + نام + نقش + پیکان */}
      <PanelCard className="p-0">
        <Link
          href="/panel/profile"
          className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/50"
          aria-label="مشاهده صفحه پروفایل"
        >
          {u.avatarUrl ? (
            <img src={u.avatarUrl} alt="" className="size-12 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-base font-extrabold text-primary">
              {u.firstName.charAt(0)}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-extrabold">{fullName}</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {isBuyer ? 'خریدار' : 'فروشنده'}
              {u.isVerified && <> — <span className="text-verified">هویت احراز شده</span></>}
            </span>
          </span>
          <ChevronLeft size={18} className="shrink-0 text-muted-foreground/50" />
        </Link>
      </PanelCard>

      {/* باکس اشتراک — مینیمال (خواسته مالک دور ۱۴): بدون جملهٔ شمارش روز و
          بدون دکمهٔ تمدید/رزرو؛ کل ردیف به ارتقا عضویت می‌رود */}
      <PanelCard className="mt-3 p-0">
        <Link
          href="/panel/pricing"
          className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/50"
          aria-label="ارتقا عضویت"
        >
          <span
            className={cn(
              'grid size-10 shrink-0 place-items-center rounded-md',
              myPackage?.isActive
                ? 'bg-amber-400 text-amber-950 ring-1 ring-amber-500/50'
                : 'border border-dashed border-border text-muted-foreground',
            )}
          >
            <Crown size={19} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2 text-sm font-extrabold">
              {myPackage?.isActive ? <>اشتراک ویژه {planTitle}</> : 'ارتقا به اشتراک ویژه'}
              {myPackage?.isActive && (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-amber-950">
                  کاربر ویژه
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              {myPackage?.isActive ? 'نشان فروشنده ویژه و مزایای اشتراک فعال است' : 'ثبت نامحدود محصول، دسترسی به همه خریداران'}
            </span>
          </span>
          <ChevronLeft size={18} className="shrink-0 text-muted-foreground/50" />
        </Link>
      </PanelCard>

      {/* کیف پول — فقط موبایلِ فروشنده (الگوی ردیف موجودی باسکول؛ خریدار در
          «تاریخچه تراکنش‌ها» به کیف پول می‌رسد) */}
      {!isBuyer && (
        <PanelCard className="mt-3 p-0 lg:hidden">
          <Link
            href="/panel/wallet"
            className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/50"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
              <Wallet size={18} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted-foreground">موجودی کیف پول</span>
              <span className="block font-extrabold font-num">
                {toFa(u.walletBalance)} <span className="text-xs font-normal text-muted-foreground">تومان</span>
              </span>
            </span>
            <ChevronLeft size={18} className="shrink-0 text-muted-foreground/50" />
          </Link>
        </PanelCard>
      )}

      {/* سوییچ فروشنده/خریدار — فقط موبایل؛ عمداً بالاتر از منو (خواستهٔ
          مالک: «بهتره بره بالاتر تا کاربر راحت‌تر و سریع‌تر بین دو پنل سوییچ کند») */}
      <PanelCard className="mt-3 p-0 lg:hidden">
        <p className="px-4 pb-1.5 pt-3 text-xs text-muted-foreground">
          نوع حساب کاربری شما{' '}
          <span className="font-bold text-foreground">{isBuyer ? 'خریدار' : 'فروشنده'}</span> است
        </p>
        <div className="flex gap-2 px-4 pb-4 pt-1" role="radiogroup" aria-label="نوع حساب کاربری">
          {(
            [
              { key: 'seller', label: 'فروشنده' },
              { key: 'buyer', label: 'خریدار' },
            ] as const
          ).map(({ key, label }) => {
            const active = role === key;
            return (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setRole(key)}
                className={cn(
                  'h-11 flex-1 rounded-md text-sm font-extrabold transition-all',
                  active
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'border border-border text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </PanelCard>

      {/* منوی نقش — فقط موبایل (دسکتاپ: سایدبار) */}
      <PanelCard className="mt-3 p-0 lg:hidden">
        <p className="px-4 pb-1 pt-3 text-xs font-bold text-muted-foreground">
          {isBuyer ? 'منوی خریدار' : 'منوی فروشنده'}
        </p>
        <nav className="divide-y divide-border/70 px-4 pb-2" aria-label="منوی پنل">
          {roleMenu.map(({ href, label, icon }) => (
            <MenuRow key={href} href={href} label={label} icon={icon} />
          ))}
        </nav>
      </PanelCard>

      {/* لینک‌های نقشیِ خارج از سایدبار خریدار — همهٔ بریک‌پوینت‌ها (الگوی
          باسکول: آیتم‌هایی که سایدبار ندارند در باسکول من می‌مانند) */}
      {isBuyer && (
        <PanelCard className="mt-3 p-0">
          <nav className="divide-y divide-border/70 px-4 py-2" aria-label="خرید">
            <MenuRow href="/panel/received-offers" label="پیشنهادهای تامین" icon={Inbox} />
            <MenuRow href="/panel/pricing" label="ارتقا عضویت" icon={Medal} tone="gold" />
          </nav>
        </PanelCard>
      )}

      {/* لینک‌های حساب کاربری — عین menu-list باسکول (همهٔ بریک‌پوینت‌ها) */}
      <AccountLinks className="mt-3" />
    </div>
  );
}
