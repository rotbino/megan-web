'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Loader2, LogIn, ShieldCheck, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAdminToken, adminLogin } from '@/lib/admin/api';

/**
 * ورود پنل مدیریت — نام کاربری + رمز عبور (اکانت ادمین، جدای کاربران عادی).
 * موفق → /admin (داشبورد). اگر از قبل توکن زنده هست مستقیم داخل پنل می‌رود.
 */
export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const [booting, setBooting] = useState(true);

  // نشست زنده؟ مستقیم به داشبورد — بعد از مونت (الگوی هیدریشن)
  useEffect(() => {
    if (getAdminToken()) {
      router.replace('/admin');
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- خواندن حافظه مرورگر فقط بعد از مونت ممکن است (الگوی استاندارد هیدریشن)
    setBooting(false);
  }, [router]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (username.trim().length < 3) {
      setError('نام کاربری را وارد کنید.');
      return;
    }
    if (password.length < 1) {
      setError('رمز عبور را وارد کنید.');
      return;
    }
    setPending(true);
    try {
      await adminLogin(username.trim(), password);
      router.replace('/admin');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ورود ناموفق بود — دوباره تلاش کنید.');
      setPending(false);
    }
  };

  if (booting) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="size-8 animate-spin text-muted-foreground/60" />
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background p-4">
      <div className="w-full max-w-sm">
        {/* برند */}
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <span className="grid size-14 place-items-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/15">
            <ShieldCheck size={28} />
          </span>
          <h1 className="text-lg font-extrabold">پنل مدیریت ایمچ</h1>
          <p className="text-xs leading-5 text-muted-foreground">
            ورود مخصوص مدیران سیستم — با نام کاربری و رمز عبور مدیریت.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="space-y-4 rounded-xl border bg-card p-6"
        >
          <div className="space-y-1.5">
            <Label htmlFor="admin-username">
              <span className="inline-flex items-center gap-1.5">
                <UserRound size={14} className="text-muted-foreground" />
                نام کاربری
              </span>
            </Label>
            <Input
              id="admin-username"
              dir="ltr"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              maxLength={64}
              className="rounded-md"
              autoFocus
              autoComplete="username"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-password">
              <span className="inline-flex items-center gap-1.5">
                <KeyRound size={14} className="text-muted-foreground" />
                رمز عبور
              </span>
            </Label>
            <Input
              id="admin-password"
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              maxLength={72}
              className="rounded-md"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">
              {error}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full rounded-md" disabled={pending}>
            {pending ? <Loader2 className="animate-spin" size={18} /> : <LogIn size={17} />}
            {pending ? 'در حال ورود…' : 'ورود به پنل مدیریت'}
          </Button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-5 text-muted-foreground">
          دسترسی مدیریتی محرمانه است — رمز خود را به اشتراک نگذارید.
        </p>
      </div>
    </div>
  );
}
