'use client';

import { useState } from 'react';
import { ArrowRight, Loader2, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { useAuth } from '@/lib/mock/auth';
import { useRequestOtp, useVerifyOtp } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';

/**
 * مودال ورود/ثبت‌نام — فقط با شماره موبایل + کد یک‌بارمصرف (الگوی باسکول).
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
  const { login } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const otpMutation = useRequestOtp();
  const verifyMutation = useVerifyOtp();

  const sendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^09\d{9}$/.test(phone)) {
      setError('شماره موبایل معتبر نیست (مثال: 09123456789)');
      return;
    }
    otpMutation.mutate(phone, {
      onSuccess: (res) => {
        setStep('code');
        // devCode فقط در محیط توسعه از بک‌اند می‌آید — نمایش برای تست بدون پنل پیامک
        if (res.devCode) {
          toast({ description: `کد توسعه (فقط محیط توسعه): ${res.devCode}` });
        }
      },
      onError: (err) => setError(err instanceof Error ? err.message : 'ارسال کد ناموفق بود.'),
    });
  };

  const verify = (value: string) => {
    setCode(value);
    setError('');
    if (value.length === 4) {
      verifyMutation.mutate(
        { phone, code: value },
        {
          onSuccess: (res) => {
            if (res.ok) {
              login({ phone, userName: res.userName ?? '' });
              onLoggedIn();
              setStep('phone');
              setPhone('');
              setCode('');
            } else {
              setError('کد وارد شده صحیح نیست.');
            }
          },
          onError: (err) => setError(err instanceof Error ? err.message : 'تایید کد ناموفق بود.'),
        },
      );
    }
  };

  const reset = () => {
    setStep('phone');
    setPhone('');
    setCode('');
    setError('');
  };

  const title = step === 'phone' ? 'ورود / ثبت‌نام' : 'کد تأیید';
  const subtitle =
    step === 'phone'
      ? 'مشاهده قیمت‌ها فقط برای اعضای ایمچ امکان‌پذیر است.'
      : `کد ۴ رقمی پیامک‌شده به ${phone} را وارد کنید.`;

  const body = (
    <div className="space-y-4 p-1">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="grid size-11 place-items-center rounded-md bg-primary/10 text-primary">
          <Smartphone size={20} />
        </span>
        <p className="text-xs leading-5 text-muted-foreground">{subtitle}</p>
      </div>

      {step === 'phone' ? (
        <form onSubmit={sendCode} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="auth-phone">شماره موبایل</Label>
            <Input
              id="auth-phone"
              dir="ltr"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="09123456789"
              maxLength={11}
              className="rounded-md text-center font-mono tracking-widest"
              autoFocus={open}
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button type="submit" size="lg" className="w-full rounded-md" disabled={otpMutation.isPending}>
            {otpMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : null}
            {otpMutation.isPending ? 'در حال ارسال…' : 'دریافت کد تأیید'}
          </Button>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center" dir="ltr">
            <InputOTP maxLength={4} value={code} onChange={verify} disabled={verifyMutation.isPending}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          {verifyMutation.isPending && (
            <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" /> در حال بررسی کد…
            </p>
          )}
          {error && <p className="text-center text-xs text-destructive">{error}</p>}
          <Button variant="ghost" size="sm" className="w-full gap-1 text-muted-foreground" onClick={reset}>
            <ArrowRight size={14} />
            تغییر شماره موبایل
          </Button>
        </div>
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
