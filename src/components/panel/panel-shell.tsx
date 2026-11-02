'use client';

/**
 * پوسته پنل فروشنده (کلاینت) — عین الگوی باسکول:
 * دسکتاپ: سایدبار ثابت تیره سمت راست (max 250px، قابل جمع‌شدن) + ناحیه محتوای روشن.
 * موبایل: هدر چسبان (برگر → دراور منو) + محتوا + نوار پایین اپ (در root layout).
 * بدون هدر اصلی سایت — پنل چرم مستقل دارد.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Crown, Home, LogIn, Loader2 } from 'lucide-react';
import { PanelSidebar } from '@/components/panel/panel-sidebar';
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

export function PanelShell({ children }: { children: React.ReactNode }) {
  const { user, requireAuth } = useAuth();
  const { data: profile } = usePanelProfile();
  const { data: myPackage } = useMyPackage();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
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

  // بستن دراور با Escape
  useEffect(() => {
    if (!drawerOpen) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [drawerOpen]);

  // دراور باز = قفل اسکرول بدنه
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

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

      {/* هدر موبایل پنل */}
      <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-border bg-background px-3 lg:hidden">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="باز کردن منوی پنل"
          className="grid size-9 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-secondary"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M3 5.5h18M3 12h18M3 18.5h18" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
          </svg>
        </button>
        {/* لوگوی SVG برند */}
        <img src="/logo-short.svg" alt="ایمچ" width={80} height={28} className="h-6 w-auto" />
      </header>

      {/* بنر قرمز + مودال «رمز عبور تعیین کنید» — تا تعیین رمز در همه صفحات پنل می‌ماند */}
      <PasswordBanner open={passwordOpen} onOpenChange={setPasswordOpen} />

      {/* دراور موبایل */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="منوی پنل">
          <button
            type="button"
            aria-label="بستن منو"
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 w-[268px] max-w-[82vw] shadow-2xl">
            <PanelSidebar profile={profile ?? null} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* محتوا */}
      <main
        className={cn(
          'min-h-screen min-w-0 p-3 transition-[padding] duration-200 sm:p-4 lg:p-6',
          collapsed ? 'lg:mr-[68px]' : 'lg:mr-[250px]',
        )}
      >
        {/* هدر بالای محتوا (دسکتاپ) — الگوی right-menu-header باسکول (خواسته مالک
            ۲-۱۱ دور سیزدهم): راست = آیکون خانه + دکمهٔ طلایی «ارتقا به فروشنده ویژه»؛
            چپ = نام و تصویر پروفایل کاربر (خواسته مالک دور چهاردهم). خط ظریف زیرش
            هدر را از محتوا جدا می‌کند (خواسته دور چهاردهم). طلایی = قانون نشان
            فروشنده ویژه (RULES §۱-ب). دکمهٔ ارتقا ظریف است و وقتی بستهٔ فعال
            است حذف می‌شود (تکرار ممنوع — وضعیت در باکس اشتراک ایمچ من دیده می‌شود). */}
        {user && (
          <div className="mb-4 hidden items-center justify-between gap-3 border-b border-border pb-3 lg:flex">
            <div className="flex items-center gap-2">
              <Link
                href="/"
                aria-label="رفتن به سایت ایمچ"
                title="رفتن به سایت ایمچ"
                className="grid size-10 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              >
                <Home size={20} />
              </Link>
              {user.role !== 'buyer' && !myPackage?.isActive && (
                <Link
                  href="/panel/pricing"
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-3.5 text-[13px] font-bold text-amber-950 shadow-[0_1px_5px_rgba(254,239,154,0.45)] ring-1 ring-amber-500/50 transition-colors hover:bg-amber-300"
                >
                  <Crown size={14} />
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
                <img src={profile.userInfo.avatarUrl} alt="" className="size-9 shrink-0 rounded-full object-cover" />
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
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
