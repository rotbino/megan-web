'use client';

/**
 * پوستهٔ بخش «دیتا ایمپورت» — کاملاً جدا از پنل ادمین (خواستهٔ مالک ۱۳-۱۱):
 * ابزارهای مهاجرت داده از سایت‌های دیگر (فعلاً باسکول؛ ایمپورترهای آینده
 * هم همین‌جا اضافه می‌شوند) + مدیریت کاربران ایمپورت‌شده.
 *
 * گارد: همان نشست پنل مدیریت (توکن imach:admin-token) ولی فقط مدیر ارشد؛
 * خروج از این بخش = بازگشت به /admin (نشست مشترک است).
 */

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowRight,
  DatabaseZap,
  LayoutDashboard,
  Loader2,
  Menu,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchAdminMe, type AdminProfile } from '@/lib/admin/api';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/data-import', label: 'نمای کلی', Icon: LayoutDashboard },
  { href: '/data-import/buskool', label: 'ایمپورتر باسکول', Icon: DatabaseZap },
  { href: '/data-import/users', label: 'مدیریت کاربران', Icon: Users },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? '/data-import';
  const isActive = (href: string) =>
    href === '/data-import' ? pathname === '/data-import' : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav className="flex flex-1 flex-col gap-0.5 px-3 py-2" aria-label="منوی دیتا ایمپورت">
      {NAV_ITEMS.map(({ href, label, Icon }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'relative flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] transition-colors',
              active
                ? 'bg-primary/10 font-bold text-primary before:absolute before:inset-y-1.5 before:right-0 before:w-[3px] before:rounded-full before:bg-primary'
                : 'font-normal text-muted-foreground hover:bg-secondary/70 hover:text-foreground',
            )}
          >
            <Icon size={18} className={cn('shrink-0', active ? 'text-primary' : 'text-muted-foreground/70')} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function DataImportShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [state, setState] = useState<'checking' | 'ready' | 'denied' | 'forbidden'>('checking');
  const [drawerOpen, setDrawerOpen] = useState(false);

  const deny = useCallback(() => {
    setState('denied');
    router.replace('/admin/login');
  }, [router]);

  useEffect(() => {
    let alive = true;
    void fetchAdminMe()
      .then((me) => {
        if (!alive) return;
        if (!me) {
          deny();
          return;
        }
        setAdmin(me);
        setState(me.role === 'SUPER_ADMIN' ? 'ready' : 'forbidden');
      })
      .catch(() => {
        if (alive) deny();
      });
    return () => {
      alive = false;
    };
  }, [deny]);

  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', esc);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', esc);
    };
  }, [drawerOpen]);

  if (state !== 'ready') {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          {state === 'forbidden' ? (
            <>
              <span className="grid size-14 place-items-center rounded-full bg-red-50 text-red-600">
                <ShieldCheck size={26} />
              </span>
              <p className="text-sm font-bold text-foreground">فقط مدیر ارشد</p>
              <p className="max-w-xs text-center text-xs leading-6">
                بخش دیتا ایمپورت فقط برای حساب‌های مدیر ارشد (SUPER_ADMIN) قابل استفاده است.
              </p>
              <Button asChild size="sm" variant="outline" className="mt-1 rounded-md">
                <Link href="/admin">بازگشت به پنل مدیریت</Link>
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="size-8 animate-spin" />
              <p className="text-xs">
                {state === 'checking' ? 'در حال بررسی نشست مدیریت…' : 'در حال انتقال به ورود…'}
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  const sidebarInner = (
    <>
      {/* سر برند — جدا از پنل ادمین */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <DatabaseZap size={19} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">دیتا ایمپورت</p>
          <p className="text-[10px] text-muted-foreground">ابزارهای مهاجرت داده</p>
        </div>
      </div>
      <NavLinks onNavigate={() => setDrawerOpen(false)} />
      {/* پایین: ادمین + بازگشت به پنل */}
      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center gap-2.5 rounded-md border border-border px-3 py-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
            <Users size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold">{admin?.name ?? 'مدیر'}</p>
            <p className="truncate text-[10px] text-muted-foreground" dir="ltr">
              {admin?.username}
            </p>
          </div>
        </div>
        <Button
          asChild
          size="sm"
          variant="outline"
          className="h-8 w-full gap-1.5 rounded-md text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <Link href="/admin">
            <ArrowRight size={13} />
            بازگشت به پنل مدیریت
          </Link>
        </Button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* سایدبار دسکتاپ */}
      <aside
        className="fixed inset-y-0 right-0 z-30 hidden w-60 flex-col border-e border-border bg-card lg:flex"
        aria-label="منوی دیتا ایمپورت"
      >
        {sidebarInner}
      </aside>

      {/* تاپ‌بار + دراور موبایل */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card px-3 lg:mr-60 lg:px-5">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="باز کردن منوی دیتا ایمپورت"
          className="grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary lg:hidden"
        >
          <Menu size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">بخش دیتا ایمپورت</p>
          <p className="hidden text-[11px] text-muted-foreground sm:block">
            مهاجرت داده و مدیریت کاربران ایمپورت‌شده
          </p>
        </div>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="hidden gap-1.5 rounded-md text-[12px] text-muted-foreground hover:text-foreground sm:inline-flex"
        >
          <Link href="/admin">
            <ArrowRight size={14} />
            پنل مدیریت
          </Link>
        </Button>
      </header>

      {/* دراور موبایل */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="منوی دیتا ایمپورت">
          <button
            type="button"
            aria-label="بستن منو"
            className="animate-sheet-fade absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="animate-sheet-up absolute inset-y-0 right-0 flex w-64 max-w-[80vw] flex-col border-e border-border bg-card shadow-2xl">
            <button
              type="button"
              aria-label="بستن"
              onClick={() => setDrawerOpen(false)}
              className="absolute left-2 top-3 grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary"
            >
              <X size={17} />
            </button>
            {sidebarInner}
          </div>
        </div>
      )}

      {/* محتوا */}
      <main className="min-h-screen min-w-0 p-3 sm:p-4 lg:mr-60 lg:p-6">{children}</main>
    </div>
  );
}
