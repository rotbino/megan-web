'use client';

/**
 * پوسته پنل فروشنده (کلاینت) — عین الگوی باسکول:
 * دسکتاپ: سایدبار ثابت تیره سمت راست (max 250px، قابل جمع‌شدن) + ناحیه محتوای روشن.
 * موبایل: هدر چسبان (برگر → دراور منو) + محتوا + نوار پایین اپ (در root layout).
 * بدون هدر اصلی سایت — پنل چرم مستقل دارد.
 */

import { useEffect, useState } from 'react';
import { LogIn, Loader2 } from 'lucide-react';
import { PanelSidebar } from '@/components/panel/panel-sidebar';
import { usePanelProfile } from '@/lib/mock/hooks';
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
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

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
    <div className="min-h-screen bg-[#f2f3f7]">
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
      <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-border bg-white px-3 lg:hidden">
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
        {hydrated ? (
          user ? (
            children
          ) : (
            <LoginGate onOpen={() => requireAuth()} />
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
