'use client';

/**
 * ایمچ من — خلوت عین «باسکول من» (خواسته مالک ۲-۱۱ دور ۱۴ تا ۱۶):
 * فقط باکس لینک پروفایل + باکس اشتراک، و بلافاصله بعدش سوییچر و آیتم‌های منو.
 *  • باکس اشتراک (دور ۱۵): تنها یک کادر بسته داریم — با بستهٔ فعال، نمودار
 *    دایره‌ای روزهای باقی‌مانده (کوچکتر از قبل) + عنوان؛ بی‌بسته، همان کادر
 *    تبدیل به کال‌تو‌اکشن خرید بسته می‌شود. بدون جملهٔ اضافه و بدون دکمهٔ تمدید.
 *  • سوییچر «پنل فروش/پنل خرید» (دور ۱۶): بالاتر از همهٔ لینک‌هاست (خواستهٔ
 *    صریح مالک)؛ جملهٔ «نوع حساب شما … است» حذف شد و برچسب «منوی خریدار/
 *    فروشنده» هم رفت — دکمهٔ فعال سوییچر خودش می‌گوید کجاییم.
 *  • موبایل خریدار (دور ۱۵): سه‌تای مهم (نشان شده ها، دفتر خرید، درخواستهای
 *    خرید) افقی بالای منوی عمودی — الگوی top-menu باسکول.
 *  • منوی عمودی موبایل (دور ۱۶): فاصلهٔ بیشتر بین آیتم‌ها + فونت کمی
 *    بزرگتر — واضح‌تر و راحت‌تر برای لمس.
 */

import Link from 'next/link';
import {
  BookOpenText,
  Bookmark,
  ChevronLeft,
  Crown,
  FileText,
  Medal,
  MessageSquare,
  Package,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { useMyPackage, usePanelProfile } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { PanelCard } from '@/components/panel/panel-parts';
import { AccountLinks } from '@/components/panel/account-links';
import { RoleSwitcher } from '@/components/panel/role-switcher';
import { toFa } from '@/lib/format';

/**
 * نمودار دایره‌ای روزهای باقی‌ماندهٔ اعتبار ویژه (خواسته مالک ۳۱-۱۰؛ برگشت
 * دور ۱۵ «چرا دایره روزهای باقی مانده رو برداشتی؟» — این بار فشرده‌تر):
 * کل دایره = کل روزهای دورهٔ بسته؛ کمان قرمز = روزهای باقی‌مانده.
 */
function VipDonut({ daysLeft, totalDays, size = 76 }: { daysLeft: number; totalDays: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const ratio = totalDays > 0 ? Math.min(1, Math.max(0, daysLeft / totalDays)) : 0;
  const offset = c * (1 - ratio);
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label={`اعتبار ویژه: ${toFa(daysLeft)} روز از ${toFa(totalDays)} روز باقی مانده`}
      className="shrink-0"
    >
      {/* مسیر کم‌رنگ = کل دوره */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-red-100" />
      {/* کمان قرمز = روزهای باقی‌مانده */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={offset}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        className="text-red-600 transition-[stroke-dashoffset] duration-700"
      />
      {/* شمارندهٔ مرکز */}
      <text
        x="50%"
        y="47%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-foreground font-num"
        style={{ fontSize: size * 0.27, fontWeight: 800 }}
      >
        {toFa(daysLeft)}
      </text>
      <text
        x="50%"
        y="67%"
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-muted-foreground"
        style={{ fontSize: size * 0.13, fontWeight: 700 }}
      >
        روز مانده
      </text>
    </svg>
  );
}

/** ردیف منوی درون‌صفحه — الگوی list-item باسکول: آیکون + متن + پیکان، جداشده با
 *  خط ظریف. دور ۱۶: فاصلهٔ عمودی بیشتر (py-3.5) + فونت بزرگتر (15px) — خواستهٔ
 *  مالک: «فاصله آیتمها رو بیشتر کن بزار واضحتر باشه و کمی هم فونتشون رو بزرگتر کن» */
function MenuRow({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ElementType;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 py-3.5 text-[15px] text-muted-foreground transition-colors hover:text-foreground"
    >
      <Icon size={19} className="shrink-0 text-muted-foreground/70" />
      <span className="flex-1">{label}</span>
      <ChevronLeft size={16} className="shrink-0 text-muted-foreground/40" />
    </Link>
  );
}

/** آیتم منوی افقی — الگوی top-menu باسکول: دایرهٔ آیکون + برچسب زیرش */
function QuickTile({ href, label, icon: Icon }: { href: string; label: string; icon: React.ElementType }) {
  return (
    <Link
      href={href}
      className="group flex h-full flex-col items-center justify-center gap-2 rounded-md py-3 transition-colors hover:bg-secondary/50"
    >
      <span className="grid size-11 place-items-center rounded-full border border-border bg-card text-muted-foreground transition-colors group-hover:border-primary/40 group-hover:text-primary">
        <Icon size={20} />
      </span>
      <span className="text-xs">{label}</span>
    </Link>
  );
}

export default function PanelDashboard() {
  const { data: profile } = usePanelProfile();
  const { data: myPackage } = useMyPackage();
  const { user } = useAuth();

  const isBuyer = user?.role === 'buyer';

  if (!profile) {
    return (
      <div className="grid h-64 place-items-center text-sm text-muted-foreground">در حال بارگذاری…</div>
    );
  }

  const { userInfo: u } = profile;
  const fullName = `${u.firstName} ${u.lastName}`;
  const planTitle =
    myPackage?.planTitle ?? (myPackage?.pakageType === 1 ? 'دو ماهه' : myPackage?.pakageType === 2 ? 'شش ماهه' : 'یک‌ساله');
  const active = Boolean(myPackage?.isActive);
  // دایره فقط با دادهٔ کامل معنا دارد؛ فعالِ بی‌داده → تاج طلایی جای دایره می‌نشیند
  const daysLeft = myPackage?.daysLeft ?? null;
  const totalDays = myPackage?.totalDays ?? null;
  const hasDonut = active && daysLeft != null && daysLeft >= 0 && totalDays != null && totalDays > 0;

  /** سه‌تای مهم خریدار — افقی بالای منوی عمودی، فقط موبایل (خواسته مالک دور ۱۵) */
  const buyerQuick = [
    { href: '/panel/saved', label: 'نشان شده ها', icon: Bookmark },
    { href: '/panel/buyer-book', label: 'دفتر خرید', icon: BookOpenText },
    { href: '/panel/my-requests', label: 'درخواستهای خرید', icon: FileText },
  ];

  /** منوی نقش داخل صفحه — فقط موبایل (دسکتاپ: همین آیتم‌ها در سایدبارند).
   *  سه‌تای افقی + «ثبت درخواست خرید» و «پیشنهادهای تامین» داخلش نیستند (دور ۱۵).
   *  «آیمچ من» هم حذف می‌شود — همین‌جاییم. ارتقای فروشنده فقط بی‌بسته.
   *  دور ۱۶: برچسب «منوی خریدار/فروشنده» بالای منو حذف شد (خواستهٔ مالک). */
  const roleMenu = isBuyer
    ? [
        { href: '/panel/messages', label: 'پیام ها', icon: MessageSquare },
        { href: '/panel/suggested-sellers', label: 'فروشندگان پیشنهادی', icon: Sparkles },
        { href: '/panel/verification', label: 'احراز هویت', icon: ShieldCheck },
      ]
    : [
        { href: '/panel/products', label: 'محصولات من', icon: Package },
        { href: '/panel/messages', label: 'پیام ها', icon: MessageSquare },
        { href: '/panel/buyers', label: 'خریداران', icon: Users },
        // جای «خریداران پیشنهادی» (خواسته مالک ۴-۱۱) — تطبیق حالا داخل «خریداران» است
        { href: '/panel/supply-offers', label: 'پیشنهادات تامین', icon: Send },
        { href: '/panel/verification', label: 'احراز هویت', icon: ShieldCheck },
        ...(!active ? [{ href: '/panel/pricing', label: 'ارتقا عضویت', icon: Medal }] : []),
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

      {/* باکس اشتراک — تنها کادر بستهٔ ما (خواسته مالک دور ۱۵): فعال → دایرهٔ
          روزهای باقی‌مانده + عنوان (بدون جملهٔ «نشان فروشنده ویژه و مزایای
          اشتراک فعال است» — حذف شد)؛ بی‌بسته → کال‌تو‌اکشن خرید بسته. تکرار
          ممنوع: دکمهٔ تمدید/رزرو و لینک ارتقا جداگانه هم حذف شدند */}
      <PanelCard className="mt-3 p-0">
        <Link
          href="/panel/pricing"
          className="flex items-center gap-4 p-4 transition-colors hover:bg-secondary/50"
          aria-label={active ? 'جزئیات اشتراک' : 'خرید بسته اشتراک'}
        >
          {active ? (
            hasDonut ? (
              <VipDonut daysLeft={daysLeft as number} totalDays={totalDays as number} />
            ) : (
              <span className="grid size-11 shrink-0 place-items-center rounded-md bg-amber-400 text-white ring-1 ring-amber-500/50">
                <Crown size={20} />
              </span>
            )
          ) : (
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-amber-400 text-white ring-1 ring-amber-500/50">
              <Crown size={20} />
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2 text-sm font-extrabold">
              {active ? <>اشتراک ویژه {planTitle}</> : 'ارتقا به اشتراک ویژه'}
              {active && (
                <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-white ring-1 ring-amber-500/50">
                  کاربر ویژه
                </span>
              )}
            </span>
            {!active && (
              <span className="mt-0.5 block text-xs text-muted-foreground">ثبت نامحدود محصول، دسترسی به همه خریداران</span>
            )}
          </span>
          <ChevronLeft size={18} className="shrink-0 text-muted-foreground/50" />
        </Link>
      </PanelCard>

      {/* سوییچر «پنل فروش / پنل خرید» — فقط موبایل (دسکتاپ: سایدبار)؛
          بالاتر از همهٔ لینک‌هاست (خواستهٔ مالک دور ۱۶) — جملهٔ «نوع حساب
          شما … است» حذف شد؛ دکمهٔ فعال خودش گویاست */}
      <PanelCard className="mt-3 p-3 lg:hidden">
        <RoleSwitcher />
      </PanelCard>

      {/* منوی افقی سه‌تای مهم — فقط موبایل خریدار (خواسته مالک دور ۱۵: «مثل
          باسکول بصورت افقی بالای منوی عمودی بزار که جلوی چشم باشن») */}
      {isBuyer && (
        <PanelCard className="mt-3 p-0 lg:hidden">
          <div className="grid grid-cols-3">
            {buyerQuick.map(({ href, label, icon }) => (
              <QuickTile key={href} href={href} label={label} icon={icon} />
            ))}
          </div>
        </PanelCard>
      )}

      {/* کیف پول — فقط موبایل (دسکتاپ: سایدبار). دور ۱۶: هر دو نقش —
          آینهٔ سایدبار. کاشی ساده بی‌رنگ (دور ۱۵) */}
      <PanelCard className="mt-3 p-0 lg:hidden">
        <Link
          href="/panel/wallet"
          className="flex items-center gap-3 p-4 transition-colors hover:bg-secondary/50"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
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

      {/* منوی نقش — فقط موبایل (دسکتاپ: سایدبار)؛ بدون برچسب (دور ۱۶) */}
      <PanelCard className="mt-3 p-0 lg:hidden">
        <nav className="divide-y divide-border/70 px-4 pb-2 pt-1" aria-label="منوی پنل">
          {roleMenu.map(({ href, label, icon }) => (
            <MenuRow key={href} href={href} label={label} icon={icon} />
          ))}
        </nav>
      </PanelCard>

      {/* لینک‌های حساب کاربری — عین menu-list باسکول (همهٔ بریک‌پوینت‌ها) */}
      <AccountLinks className="mt-3" />
    </div>
  );
}
