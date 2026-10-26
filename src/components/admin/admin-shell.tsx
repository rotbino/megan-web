'use client';

/**
 * پوسته پنل ادمین — کاملاً جدا از پوسته کاربران (components/panel):
 *  • تم سفیدِ فلت: سایدبار سفید + فقط یک خط ظریف بین منو و محتوا (border-e)؛
 *    رنگ اصلی (آبی) فقط در دکمه‌ها و لهجه‌های کوچک، نه پس‌زمینه
 *  • دسکتاپ: سایدبار ثابت سمت راست + محتوای سفید — موبایل: تاپ‌بار + دراور
 *  • گارد نشست: توکن ادمین → me؛ ناموفق → /admin/login
 *  • تغییر رمز خودم از تاپ‌بار (API زنده — admin/auth/changePassword)
 * آیتم‌های فازهای بعد (A3..A5) نمایش داده می‌شوند با چیپ فاز و غیرفعال.
 */

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Boxes,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  Loader2,
  LogOut,
  MapPin,
  Menu,
  Network,
  ScrollText,
  Settings,
  ShieldCheck,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { adminChangePassword, adminLogout, fetchAdminMe, type AdminProfile } from '@/lib/admin/api';
import { cn } from '@/lib/utils';

/** منوی پنل — فازهای بعد غیرفعال با چیپ فاز (نقشه: docs/ADMIN-IMPLEMENTATION.md) */
const NAV = [
  { href: '/admin', label: 'داشبورد', Icon: LayoutDashboard, phase: null },
  { href: '/admin/users', label: 'کاربران', Icon: Users, phase: null },
  { href: '/admin/products', label: 'آگهی‌ها', Icon: Boxes, phase: 'A4' },
  { href: '/admin/buy-requests', label: 'درخواست‌های خرید', Icon: ClipboardList, phase: 'A4' },
  { href: '/admin/categories', label: 'دسته‌بندی‌ها', Icon: Network, phase: null },
  { href: '/admin/locations', label: 'مکان‌ها', Icon: MapPin, phase: null },
  { href: '/admin/logs', label: 'لاگ عملیات', Icon: ScrollText, phase: 'A5' },
  { href: '/admin/settings', label: 'تنظیمات', Icon: Settings, phase: 'A5' },
] as const;

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? '/admin';
  return (
    <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2" aria-label="منوی مدیریت">
      {NAV.map(({ href, label, Icon, phase }) => {
        const active = !phase && (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`));
        const inner = (
          <>
            <Icon size={18} className={cn('shrink-0', active ? 'text-primary' : 'text-muted-foreground/70')} />
            <span className="min-w-0 flex-1 truncate">{label}</span>
            {phase ? (
              <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground/70">
                {phase}
              </span>
            ) : null}
          </>
        );
        if (phase) {
          return (
            <button
              key={label}
              type="button"
              disabled
              aria-disabled
              title={`${label} — در فاز ${phase} فعال می‌شود`}
              className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-normal text-muted-foreground/40"
            >
              {inner}
            </button>
          );
        }
        return (
          <Link
            key={label}
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
            {inner}
          </Link>
        );
      })}
    </nav>
  );
}

function ChangePasswordDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  const reset = () => {
    setCurrent('');
    setNew('');
    setConfirm('');
    setError('');
    setDone(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword.length < 6) {
      setError('رمز جدید باید حداقل ۶ نویسه باشد.');
      return;
    }
    if (newPassword !== confirm) {
      setError('تکرار رمز با رمز جدید یکسان نیست.');
      return;
    }
    setPending(true);
    try {
      await adminChangePassword(currentPassword, newPassword);
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر رمز ناموفق بود — دوباره تلاش کنید.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) {
          reset();
          onClose();
        }
      }}
    >
      <DialogContent className="max-w-sm rounded-xl">
        <DialogHeader className="text-right">
          <DialogTitle>تغییر رمز عبور مدیریت</DialogTitle>
          <DialogDescription>رمز فعلی و رمز جدید خود را وارد کنید.</DialogDescription>
        </DialogHeader>
        {done ? (
          <div className="space-y-3 py-2 text-center">
            <p className="text-sm font-bold text-primary">رمز عبور با موفقیت تغییر کرد.</p>
            <Button variant="outline" className="w-full rounded-md" onClick={() => { reset(); onClose(); }}>
              بستن
            </Button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="cp-current">رمز فعلی</Label>
              <Input id="cp-current" type="password" dir="ltr" value={currentPassword} onChange={(e) => setCurrent(e.target.value)} maxLength={72} className="rounded-md" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-new">رمز جدید</Label>
              <Input id="cp-new" type="password" dir="ltr" value={newPassword} onChange={(e) => setNew(e.target.value)} placeholder="حداقل ۶ نویسه" maxLength={72} className="rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cp-confirm">تکرار رمز جدید</Label>
              <Input id="cp-confirm" type="password" dir="ltr" value={confirm} onChange={(e) => setConfirm(e.target.value)} maxLength={72} className="rounded-md" />
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full rounded-md" disabled={pending}>
              {pending ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={17} />}
              {pending ? 'در حال ذخیره…' : 'تغییر رمز عبور'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminProfile | null>(null);
  const [state, setState] = useState<'checking' | 'ready' | 'denied'>('checking');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cpOpen, setCpOpen] = useState(false);

  const deny = useCallback(() => {
    setState('denied');
    router.replace('/admin/login');
  }, [router]);

  useEffect(() => {
    let alive = true;
    void fetchAdminMe()
      .then((me) => {
        if (!alive) return;
        if (me) {
          setAdmin(me);
          setState('ready');
        } else {
          deny();
        }
      })
      .catch(() => {
        if (alive) deny();
      });
    return () => {
      alive = false;
    };
  }, [deny]);

  // دراور باز = قفل اسکرول + Esc
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

  const logout = async () => {
    await adminLogout();
    router.replace('/admin/login');
  };

  if (state !== 'ready') {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
          <p className="text-xs">{state === 'checking' ? 'در حال بررسی نشست مدیریت…' : 'در حال انتقال به ورود…'}</p>
        </div>
      </div>
    );
  }

  const sidebarInner = (
    <>
      {/* سر برند */}
      <div className="flex h-14 items-center gap-2.5 border-b border-border px-4">
        <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck size={19} />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-extrabold">مدیریت ایمچ</p>
          <p className="text-[10px] text-muted-foreground">پنل کنترل بازارگاه</p>
        </div>
      </div>
      <SidebarNav onNavigate={() => setDrawerOpen(false)} />
      {/* پایین: ادمین + خروج */}
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
          {admin?.role === 'SUPER_ADMIN' ? (
            <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
              ارشد
            </span>
          ) : null}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="h-8 flex-1 gap-1.5 rounded-md text-[11px] text-muted-foreground hover:bg-secondary hover:text-foreground"
            onClick={() => setCpOpen(true)}
          >
            <KeyRound size={13} />
            تغییر رمز
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 gap-1.5 rounded-md text-[11px] text-muted-foreground hover:border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
            onClick={() => void logout()}
          >
            <LogOut size={13} />
            خروج
          </Button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* سایدبار دسکتاپ — سفید؛ جداکننده: خط ظریف border-e */}
      <aside
        className="fixed inset-y-0 right-0 z-30 hidden w-60 flex-col border-e border-border bg-card lg:flex"
        aria-label="منوی مدیریت"
      >
        {sidebarInner}
      </aside>

      {/* تاپ‌بار + دراور موبایل */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-white px-3 lg:mr-60 lg:px-5">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="باز کردن منوی مدیریت"
          className="grid size-9 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary lg:hidden"
        >
          <Menu size={21} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">داشبورد مدیریت</p>
          <p className="hidden text-[11px] text-muted-foreground sm:block">نمای کلی بازارگاه ایمچ</p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="hidden gap-1.5 rounded-md text-[12px] text-muted-foreground hover:text-foreground sm:inline-flex"
          onClick={() => setCpOpen(true)}
        >
          <KeyRound size={14} />
          تغییر رمز
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5 rounded-md text-[12px] text-muted-foreground hover:text-destructive"
          onClick={() => void logout()}
        >
          <LogOut size={14} />
          <span className="hidden sm:inline">خروج</span>
        </Button>
      </header>

      {/* دراور موبایل */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="منوی مدیریت">
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

      <ChangePasswordDialog open={cpOpen} onClose={() => setCpOpen(false)} />
    </div>
  );
}
