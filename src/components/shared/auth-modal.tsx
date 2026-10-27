'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, KeyRound, Loader2, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { useAuth } from '@/lib/mock/auth';
import { useLoginSession } from '@/lib/mock/hooks';

/**
 * مودال ورود/ثبت‌نام — روش سشن: فقط با شماره موبایل، بدون پیامک
 * (تا آمدن پنل پیامک — ساختار OTP در api.ts/hooks و InputOTP برای
 * آن روز دست‌نخورده نگه داشته شده است).
 *
 * • کاربر بدون رمز → مستقیم وارد می‌شود (مثل دفعه اول).
 * • کاربر رمزدار → PASSWORD_REQUIRED → مرحله رمز عبور نمایش داده می‌شود.
 * • کاربر جدید → /register?step=info برای نام/استان/شهر.
 *
 * موبایل: بات‌شیت پایین‌رونده (قانون کلی مودال‌های ایمچ) / دسکتاپ: مودال مرکزی.
 * کاربر لاگین‌نشیده قیمت‌ها را نمی‌بیند؛ همین مودال از دکمه «مشاهده قیمت» باز می‌شود.
 */
export function AuthModal({
  open,
  onClose,
  onLoggedIn,
}: {
  open: boolean;
  onClose: () => void;
  onLoggedIn: () => void;
}) {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<'phone' | 'password'>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const loginMutation = useLoginSession();

  const handleSuccess = (isNewUser: boolean, user: Parameters<typeof login>[0]) => {
    login(user);
    onLoggedIn();
    setStep('phone');
    setPhone('');
    setPassword('');
    setError('');
    // کاربر جدید → تکمیل اطلاعات (نام/استان/شهر) در صفحه ثبت‌نام
    if (isNewUser) router.push('/register?step=info');
  };

  const sendPhone = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^09\d{9}$/.test(phone)) {
      setError('شماره موبایل معتبر نیست (مثل 09123456789).');
      return;
    }
    loginMutation.mutate(
      { phone },
      {
        onSuccess: (res) => {
          if (res.ok && res.user) handleSuccess(Boolean(res.isNewUser), res.user);
          else if (res.requiresPassword) setStep('password'); // کاربر رمز تعیین کرده است
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'ورود ناموفق بود.'),
      },
    );
  };

  const sendPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('رمز عبور حداقل ۶ نویسه است.');
      return;
    }
    loginMutation.mutate(
      { phone, password },
      {
        onSuccess: (res) => {
          if (res.ok && res.user) handleSuccess(Boolean(res.isNewUser), res.user);
          else if (res.requiresPassword) setError('رمز عبور وارد نشده است.');
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'ورود ناموفق بود.'),
      },
    );
  };

  const reset = () => {
    setStep('phone');
    setPhone('');
    setPassword('');
    setError('');
  };

  const title = step === 'phone' ? 'ورود / ثبت‌نام' : 'رمز عبور';
  const subtitle =
    step === 'phone'
      ? 'ورود و ثبت‌نام ایمچ فقط با شماره موبایل انجام می‌شود.'
      : `رمز عبور پنل خود را برای ${phone} وارد کنید.`;

  const body = (
    <div className="space-y-4 p-1">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="grid size-11 place-items-center rounded-md bg-primary/10 text-primary">
          {step === 'phone' ? <Smartphone size={20} /> : <KeyRound size={20} />}
        </span>
        <p className="text-xs leading-5 text-muted-foreground">{subtitle}</p>
      </div>

      {step === 'phone' ? (
        <form onSubmit={sendPhone} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="auth-phone">شماره موبایل</Label>
            <Input
              id="auth-phone"
              dir="ltr"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="0912…"
              maxLength={11}
              className="font-num rounded-md text-center text-base tracking-widest"
              autoFocus={open}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full rounded-md" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : null}
            {loginMutation.isPending ? 'در حال ورود…' : 'ورود به ایمچ'}
          </Button>
        </form>
      ) : (
        <form onSubmit={sendPassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="auth-password">رمز عبور</Label>
            <Input
              id="auth-password"
              type="password"
              dir="ltr"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••"
              maxLength={72}
              className="rounded-md text-center"
              autoFocus
            />
          </div>
          {error && <p className="text-center text-xs text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full rounded-md" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : null}
            {loginMutation.isPending ? 'در حال بررسی…' : 'ورود'}
          </Button>
          <Button variant="ghost" size="sm" className="w-full gap-1 text-muted-foreground" onClick={() => { setStep('phone'); setPassword(''); setError(''); }}>
            <ArrowRight size={14} />
            تغییر شماره موبایل
          </Button>
        </form>
      )}
    </div>
  );

  return (
    <>
      {/* موبایل — بات‌شیت پایین‌رونده */}
      <BottomSheet open={open} onClose={onClose} title={title}>
        {body}
      </BottomSheet>

      {/* دسکتاپ — مودال مرکزی */}
      {open && (
        <div
          className="fixed inset-0 z-[60] hidden items-center justify-center p-4 nav-desktop:flex"
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <div className="animate-sheet-fade absolute inset-0 bg-black/40" onClick={onClose} />
          <div className="relative w-full max-w-sm rounded-xl bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-border/70 pb-3">
              <h2 className="text-base font-bold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="بستن"
                className="flex size-8 items-center justify-center rounded-lg text-foreground hover:bg-accent"
              >
                <X size={20} />
              </button>
            </div>
            {body}
          </div>
        </div>
      )}
    </>
  );
}
