'use client';

/**
 * پوسته پنل (کلاینت) — دسکتاپ: سایدبار ثابت سمت راست (max 250px، قابل
 * جمع‌شدن) + ناحیه محتوا. موبایل: هدر چسبان سبک (خواسته مالک ۲-۱۱ دور ۱۶):
 * بدون برگر و بدون دراور — فقط نشان ایمچ + «عنوان صفحه» (آیمچ من / ویرایش
 * پروفایل / محصولات من و…)؛ ناوبری موبایل از منوی درون‌صفحهٔ آیمچ من و
 * نوار پایین اپ انجام می‌شود.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Crown, Home, LogIn, Loader2 } from 'lucide-react';
import { PanelSidebar, BUYER_NAV, SELLER_NAV } from '@/components/panel/panel-sidebar';
import { PasswordBanner, PasswordLock } from '@/components/panel/password-banner';
import { usePanelProfile, useMyPackage, useChatSocketEvents } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function LoginGate({ onOpen, buyersLock }: { onOpen: () => void; buyersLock?: boolean }) {
  return (
    <div className="grid min-h-[70vh] place-items-center p-6">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <LogIn size={26} />
        </span>
        <h1 className="mt-4 text-lg font-extrabold">ورود به پنل ایمچ</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {buyersLock
            ? 'برای دیدن خریداران و درخواست‌های خرید فوری و دوره‌ای، با شماره موبایل خود وارد شوید یا ثبت‌نام کنید.'
            : 'برای مدیریت فروشگاه، ثبت محصول و پیگیری خریداران، با شماره موبایل خود وارد شوید.'}
        </p>
        <Button className="mt-5 w-full rounded-md" onClick={onOpen}>
          ورود / ثبت نام
        </Button>
      </div>
    </div>
  );
}

/** عنوان صفحهٔ پنل برای هدر (خواسته مالک دور ۱۶ + ۷-۱۱ دور هفدهم: «هر
 *  لینکی که در پنل انتخاب می‌شود عنوانش چه در موبایل و چه در دسکتاپ روی
 *  هدر می‌افتد») — آیتم‌های هر دو منو + زیرمسیرهای عمیق + لینک‌های حساب با
 *  طولانی‌ترین مسیرِ منطبق پیدا می‌شوند */
const PAGE_TITLES: Array<{ href: string; label: string; exact?: boolean }> = [
  ...SELLER_NAV,
  ...BUYER_NAV,
  { href: '/panel/profile', label: 'پروفایل' },
  { href: '/panel/profile/edit', label: 'ویرایش پروفایل' },
  { href: '/panel/wallet', label: 'کیف پول' },
  { href: '/panel/secure-deals', label: 'معاملات پرداخت امن' },
  { href: '/panel/secure-deals/guide', label: 'راهنمای پرداخت امن' },
  { href: '/panel/support', label: 'پشتیبانی' },
  { href: '/panel/survey', label: 'نظرسنجی و نیازها' },
  { href: '/panel/received-offers', label: 'پیشنهادهای تامین' },
  { href: '/panel/buy-requests', label: 'درخواست های خرید' },
  { href: '/panel/buy-requests/new', label: 'ثبت درخواست خرید' },
  { href: '/panel/products/new', label: 'ثبت محصول' },
  { href: '/panel/products/edit', label: 'ویرایش محصول' },
  { href: '/panel/products/bulk-price', label: 'تغییر قیمت گروهی' },
  { href: '/panel/products/stats', label: 'آمار محصول' },
  { href: '/panel/products/buyers', label: 'خریداران کالا' },
];

function panelPageTitle(pathname: string): string {
  const matches = PAGE_TITLES.filter((t) =>
    t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`),
  );
  // طولانی‌ترین مسیرِ منطبق = دقیق‌ترین عنوان (ویرایش پروفایل ≠ پروفایل)
  const best = matches.sort((a, b) => b.href.length - a.href.length)[0];
  return best?.label ?? 'پنل کاربری';
}

/** صفحه‌هایی که خودشان نوار تب چسبانِ چسبیده به زیر هدر دارند (خواستهٔ مالک
 *  ۱۱-۱۱) — پدینگ بالای main برایشان حذف می‌شود تا نوار دقیقاً به هدر بچسبد؛
 *  صفحات بدون نوار همان فاصلهٔ همیشگی را می‌بینند. مسیرهای فرعی هم پوشیده‌اند. */
const GLUED_TOOLBAR_PAGES = ['/panel/buyers'];

export function PanelShell({ children }: { children: React.ReactNode }) {
  // ریل‌تایم سراسری پنل (خواسته مالک ۸-۱۱): رویدادهای WS چت/پشتیبانی
  // شمارنده‌ها و گفتگوها را همان لحظه تازه می‌کنند — بج «پشتیبانی» در
  // «ایمچ من» و بج «پیام ها» سایدبار بدون انتظار برای polling ۳۰s.
  useChatSocketEvents();
  const { user, requireAuth } = useAuth();
  const { data: profile } = usePanelProfile();
  const { data: myPackage } = useMyPackage();
  const pathname = usePathname() ?? '';
  /** این صفحه نوار تب چسبان دارد؟ — پدینگ بالای main برایش حذف می‌شود */
  const gluedToolbar = GLUED_TOOLBAR_PAGES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  /** مودال رمز — دست این پوسته است تا با ورود به هر صفحهٔ پنل بدون رمز،
   *  خودکار باز شود (خواسته مالک: «اگر لینک پنل را زد، به او بگوییم
   *  قبل از هر کاری رمز تعیین کند») و صفحهٔ قفل هم محتوا را جایگزین کند. */
  const [passwordOpen, setPasswordOpen] = useState(false);
  const needsPassword = Boolean(user && !user.hasPassword);

  useEffect(() => {
    // نشست پس از هیدریشن به‌صورت غیرهمگام می‌رسد (fetchAuthUser) — باز شدن
    // خودکار مودال رمز واکنش به دادهٔ بیرونی است، نه state مشتق‌پذیر
    // eslint-disable-next-line react-hooks/set-state-in-effect -- الگوی استاندارد واکنش به نشستِ غیرهمگام (همانند auth.tsx)
    if (needsPassword) setPasswordOpen(true);
  }, [needsPassword]);

  useEffect(() => {
    // نشست ورود پس از هیدریشن بازیابی می‌شود — تا آن لحظه اسکلت نشان می‌دهیم
    const t = setTimeout(() => setHydrated(true), 120);
    return () => clearTimeout(t);
  }, []);

  // گیت صفحهٔ «خریداران» (خواستهٔ مالک ۸-۱۱ دور ۲۸): مهمان که از سکشن‌های
  // «درخواست‌های خرید فوری/دوره‌ای» صفحهٔ اول به اینجا می‌رسد، فرم ورود
  // موبایل خودکار باز می‌شود تا مجبور به ثبت‌نام/ورود شود؛ اگر بستش کرد،
  // دروازهٔ ورود با دکمهٔ «ورود / ثبت نام» سرِ جایش است
  useEffect(() => {
    if (hydrated && !user && pathname === '/panel/buyers') requireAuth('login');
  }, [hydrated, user, pathname, requireAuth]);

  return (
    // پوسته اپ (خواسته مالک ۸-۱۱): در دسکتاپ هیچ‌چیز — نه هدر و نه سایدبار —
    // اسکرول نمی‌خورد؛ ریشه دقیقاً به اندازهٔ viewport است (h-dvh) و فقط
    // <main> خودش ظرف اسکرول است. در موبایل همان اسکرول body + هدر sticky
    // قبلی می‌ماند (body پدینگ ۵۹px نوار پایین دارد و نباید اسکرول دور داخلی شود).
    <div className="min-h-screen bg-background lg:flex lg:h-dvh lg:min-h-0 lg:flex-col">
      {/* سایدبار دسکتاپ — ستون ثابت راست */}
      <aside
        className={cn(
          'fixed inset-y-0 right-0 z-30 hidden transition-[width] duration-200 lg:block',
          collapsed ? 'w-[68px]' : 'w-[250px] max-w-[25vw]',
        )}
        aria-label="منوی پنل"
      >
        <PanelSidebar
          profile={profile ?? null}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
      </aside>

      {/* هدر موبایل پنل (دور ۱۶): نشان ایمچ + عنوان صفحهٔ جاری — بدون برگر.
          دور هفدهم (۷-۱۱): ارتفاع ۵۶px (h-14) تا عنوان و لوگو نفس بکشند و
          دقیقاً هم‌تراز عمودی دیده شوند + سایهٔ ظریف تا هدر از بدنه جدا به
          نظر برسد (عین هدر دسکتاپ) */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2.5 border-b border-border bg-background px-3 shadow-[0_1px_5px_rgba(0,0,0,0.06)] lg:hidden">
        <Link href="/panel" aria-label="آیمچ من" className="flex shrink-0 items-center">
          {/* نشان ایمچ (لوگوی کوتاه M با نقطه — ۷-۱۱ دور هفدهم: نسخهٔ ıM
              بازنشسته شد؛ محتوای logo-short.svg همان نشان M با نقطه است) */}
          <img src="/logo-short.svg" alt="ایمچ" width={28} height={29} className="h-[28px] w-auto" />
        </Link>
        <h1 className="truncate text-[15px] font-extrabold leading-none">{panelPageTitle(pathname)}</h1>
      </header>

      {/* بنر قرمز + مودال «رمز عبور تعیین کنید» — تا تعیین رمز در همه صفحات پنل می‌ماند */}
      <PasswordBanner open={passwordOpen} onOpenChange={setPasswordOpen} />

      {/* ناحیهٔ محتوا — آفست سایدبار روی همین پوشش است تا هدر دسکتاپ تمام‌عرض
          (بدون پدینگ دو طرف) بین سایدبار و لبهٔ چپ کشیده شود و خط جداکننده
          و سایه‌اش به دو طرف بچسبد (خواسته مالک ۷-۱۱ دور هفدهم)؛ بدون هیچ
          مکانیزم پهنایی که اسکرول افقی بیاندازد */}
      <div
        className={cn(
          'min-w-0 transition-[margin] duration-200',
          'lg:flex lg:min-h-0 lg:flex-1 lg:flex-col',
          collapsed ? 'lg:mr-[68px]' : 'lg:mr-[250px]',
        )}
      >
        {/* هدر بالای محتوا (دسکتاپ) — تمام‌عرض با سایه (خواسته مالک ۷-۱۱ دور
            هفدهم): خط زیرینش به دو لبه می‌چسبد و با سایهٔ ظریف از بدنه جدا
            دیده می‌شود. ارتفاع 59px = هم‌تراز هدر سایدبار.
            ۱۱-۱۱: mb-5 حذف شد تا لبهٔ بالای main دقیقاً به هدر بچسبد — صفحه‌هایی
            که نوار تب چسبان می‌خواهند (مثل خریداران) با lg:-mt-11 پدینگ بالای
            main را خنثی می‌کنند و نوارشان زیر هدر می‌نشیند؛ بقیهٔ صفحات با
            lg:pt-11 همان فاصلهٔ همیشگی (۴۴px) را می‌بینند.
            راست = عنوان صفحهٔ جاری + دکمهٔ طلایی «ارتقا به فروشنده ویژه»؛
            چپ = پروفایل کاربر و خانهٔ سایت (آیکون هوم چپ‌تر از تصویر پروفایل —
            خواسته مالک ۷-۱۱ دور هفدهم). دکمهٔ ارتقا وقتی بستهٔ فعال است حذف
            می‌شود (تکرار ممنوع — وضعیت در باکس اشتراک ایمچ من دیده می‌شود). */}
        {user && (
          <div className="hidden h-[59px] shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-6 shadow-[0_1px_5px_rgba(0,0,0,0.06)] lg:flex">
            <div className="flex min-w-0 items-center gap-3">
              <h1 className="truncate text-[15px] font-extrabold leading-none">{panelPageTitle(pathname)}</h1>
              {user.role !== 'buyer' && !myPackage?.isActive && (
                <Link
                  href="/panel/pricing"
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-3.5 text-xs font-bold text-white shadow-[0_1px_5px_rgba(254,239,154,0.45)] ring-1 ring-amber-500/50 transition-colors hover:bg-amber-300"
                >
                  <Crown size={13} />
                  ارتقا به فروشنده ویژه
                </Link>
              )}
            </div>
            {/* چپِ هدر = پروفایل + خانهٔ سایت؛ خانه چپ‌ترین می‌نشیند (خواسته
                مالک ۷-۱۱ دور هفدهم: «آیکون هوم طرف مقابل، سمت چپ تصویر لوگو
                پروفایل») */}
            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/panel/profile"
                className="flex min-w-0 items-center gap-2.5 rounded-full p-1 ps-3 text-sm font-bold transition-colors hover:bg-secondary"
                title="پروفایل"
              >
                <span className="max-w-[180px] truncate">{profile ? `${profile.userInfo.firstName} ${profile.userInfo.lastName}` : 'کاربر ایمچ'}</span>
                {profile?.userInfo.avatarUrl ? (
                  <img src={profile.userInfo.avatarUrl} alt="" className="size-8 shrink-0 rounded-full object-cover" />
                ) : (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                    {profile ? profile.userInfo.firstName.charAt(0) : '؟'}
                  </span>
                )}
              </Link>
              <Link
                href="/"
                aria-label="رفتن به سایت ایمچ"
                title="رفتن به سایت ایمچ"
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Home size={18} />
              </Link>
            </div>
          </div>
        )}
        {/* main — در دسکتاپ خودش ظرف اسکرول است (flex-1 + overflow) پس هدر
            بالای آن هرگز از صفحه بیرون نمی‌رود؛ در موبایل اسکرول body می‌ماند.
            lg:pt-11 = ۴۴px = پدینگ ۲۴px + مارجین ۲۰px قبلیِ هدر — فاصلهٔ بصری
            همهٔ صفحات عین قبل ماند؛ صفحه‌های نوار-تب-چسبان (GLUED_TOOLBAR_PAGES)
            پدینگ بالا نمی‌گیرند تا نوارشان دقیقاً زیر هدر بچسبد (خواستهٔ مالک
            ۱۱-۱۱ — بدون مارجین منفی؛ مارجین منفی + sticky در کروم به لبهٔ پدینگ
            برمی‌گردد و نوار جدا می‌افتاد) */}
        <main
          className={cn(
            'min-h-screen min-w-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-6 lg:pb-6',
            gluedToolbar
              ? 'px-3 pb-3 sm:px-4 sm:pb-4'
              : 'px-3 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-4 lg:pt-11',
          )}
        >{hydrated ? (
          user ? (
            // بدون رمز پنل = قفل محتوا (خواسته مالک — «قبل از هر کاری رمز تعیین کن»)
            needsPassword ? (
              <PasswordLock onOpen={() => setPasswordOpen(true)} />
            ) : (
              children
            )
          ) : (
            <LoginGate onOpen={() => requireAuth('login')} buyersLock={pathname === '/panel/buyers'} />
          )
        ) : (
          <div className="grid min-h-[60vh] place-items-center" aria-hidden>
            <Loader2 className="size-7 animate-spin text-muted-foreground/50" />
          </div>
        )}</main>
      </div>
    </div>
  );
}
