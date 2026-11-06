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
import { usePanelProfile, useMyPackage } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function LoginGate({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="grid min-h-[70vh] place-items-center p-6">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-primary/10 text-primary">
          <LogIn size={26} />
        </span>
        <h1 className="mt-4 text-lg font-extrabold">ورود به پنل ایمچ</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          برای مدیریت فروشگاه، ثبت محصول و پیگیری خریداران، با شماره موبایل خود وارد شوید.
        </p>
        <Button className="mt-5 w-full rounded-md" onClick={onOpen}>
          ورود / ثبت نام
        </Button>
      </div>
    </div>
  );
}

/** عنوان صفحهٔ پنل برای هدر موبایل (خواسته مالک دور ۱۶: «وقتی توی آیمچ من
 *  هستی عنوان میشه آیمچ من، وقتی توی ویرایش پروفایل هستی میشه ویرایش پروفایل»)
 *  — آیتم‌های هر دو منو + لینک‌های حساب با طولانی‌ترین مسیرِ منطبق پیدا می‌شوند */
const PAGE_TITLES: Array<{ href: string; label: string; exact?: boolean }> = [
  ...SELLER_NAV,
  ...BUYER_NAV,
  { href: '/panel/profile', label: 'پروفایل' },
  { href: '/panel/profile/edit', label: 'ویرایش پروفایل' },
  { href: '/panel/wallet', label: 'کیف پول' },
  { href: '/panel/secure-deals', label: 'معاملات پرداخت امن' },
  { href: '/panel/support', label: 'پشتیبانی' },
  { href: '/panel/survey', label: 'نظرسنجی' },
  { href: '/panel/received-offers', label: 'پیشنهادهای تامین' },
  { href: '/panel/buy-requests', label: 'درخواست های خرید' },
];

function panelPageTitle(pathname: string): string {
  const matches = PAGE_TITLES.filter((t) =>
    t.exact ? pathname === t.href : pathname === t.href || pathname.startsWith(`${t.href}/`),
  );
  // طولانی‌ترین مسیرِ منطبق = دقیق‌ترین عنوان (ویرایش پروفایل ≠ پروفایل)
  const best = matches.sort((a, b) => b.href.length - a.href.length)[0];
  return best?.label ?? 'پنل کاربری';
}

export function PanelShell({ children }: { children: React.ReactNode }) {
  const { user, requireAuth } = useAuth();
  const { data: profile } = usePanelProfile();
  const { data: myPackage } = useMyPackage();
  const pathname = usePathname() ?? '';
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

  return (
    <div className="min-h-screen bg-background">
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

      {/* هدر موبایل پنل (دور ۱۶): نشان ایمچ + عنوان صفحهٔ جاری — بدون برگر */}
      <header className="sticky top-0 z-20 flex h-12 items-center gap-2.5 border-b border-border bg-background px-3 lg:hidden">
        <Link href="/panel" aria-label="آیمچ من" className="flex shrink-0 items-center">
          {/* نشان ایمچ (لوگوی کوتاه) — در هدر موبایل جای وردمارک کامل را می‌گیرد */}
          <img src="/logo-short.svg" alt="ایمچ" width={30} height={29} className="h-[26px] w-auto" />
        </Link>
        <h1 className="truncate text-[15px] font-extrabold">{panelPageTitle(pathname)}</h1>
      </header>

      {/* بنر قرمز + مودال «رمز عبور تعیین کنید» — تا تعیین رمز در همه صفحات پنل می‌ماند */}
      <PasswordBanner open={passwordOpen} onOpenChange={setPasswordOpen} />

      {/* محتوا — دسکتاپ: بدون padding-top تا خط هدر دقیقاً با هدر سایدبار
          تراز شود (خواسته مالک ۷-۱۱: ارتفاع هدر پنل بیش از حد بود) */}
      <main
        className={cn(
          'min-h-screen min-w-0 p-3 transition-[padding] duration-200 sm:p-4 lg:p-6 lg:pt-0',
          collapsed ? 'lg:mr-[68px]' : 'lg:mr-[250px]',
        )}
      >
        {/* هدر بالای محتوا (دسکتاپ) — الگوی right-menu-header باسکول (خواسته مالک
            ۲-۱۱ دور سیزدهم): راست = آیکون خانه + دکمهٔ طلایی «ارتقا به فروشنده ویژه»؛
            چپ = نام و تصویر پروفایل کاربر (خواسته مالک دور چهاردهم).
            ارتفاع 59px = هم‌تراز هدر سایدبار — خط زیرین دو هدر یکی می‌شود و
            صفحه مرتب‌تر دیده می‌شود (خواسته مالک ۷-۱۱). طلایی = قانون نشان
            فروشنده ویژه (RULES §۱-ب). دکمهٔ ارتقا ظریف است و وقتی بستهٔ فعال
            است حذف می‌شود (تکرار ممنوع — وضعیت در باکس اشتراک ایمچ من دیده می‌شود). */}
        {user && (
          <div className="mb-5 hidden h-[59px] items-center justify-between gap-3 border-b border-border lg:flex">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                aria-label="رفتن به سایت ایمچ"
                title="رفتن به سایت ایمچ"
                className="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Home size={18} />
              </Link>
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
            {/* چپِ هدر = نام + تصویر پروفایل (خواسته مالک دور چهاردهم) */}
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
          </div>
        )}
        {hydrated ? (
          user ? (
            // بدون رمز پنل = قفل محتوا (خواسته مالک — «قبل از هر کاری رمز تعیین کن»)
            needsPassword ? (
              <PasswordLock onOpen={() => setPasswordOpen(true)} />
            ) : (
              children
            )
          ) : (
            <LoginGate onOpen={() => requireAuth('login')} />
          )
        ) : (
          <div className="grid min-h-[60vh] place-items-center" aria-hidden>
            <Loader2 className="size-7 animate-spin text-muted-foreground/50" />
          </div>
        )}
      </main>
    </div>
  );
}
