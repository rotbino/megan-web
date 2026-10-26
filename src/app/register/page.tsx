'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Lock, Smartphone } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useRequestOtp, useVerifyOtp } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';

/** ورود/ثبت‌نام فقط با موبایل + کد یک‌بارمصرف — همان الگوی باسکول */
export default function RegisterPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'code'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

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
        // devCode فقط وقتی بک‌اند در محیط توسعه اجرا می‌شود برمی‌گردد —
        // نمایشش برای تست بدون پنل پیامک است؛ در پروداکشن هرگز وجود ندارد.
        if (res.devCode) {
          toast({ description: `کد توسعه (فقط محیط توسعه): ${res.devCode}` });
        }
      },
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
              setDone(true);
            } else {
              setError('کد وارد شده صحیح نیست.');
            }
          },
          onError: (err) => setError(err instanceof Error ? err.message : 'کد وارد شده صحیح نیست.'),
        },
      );
    }
  };

  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-secondary/60 to-background px-4 py-12">
        <div className="w-full max-w-sm rounded-md border bg-card p-6 shadow-sm">
          {done ? (
            <div className="space-y-4 py-6 text-center">
              <span className="mx-auto grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
                <Lock size={28} />
              </span>
              <h1 className="text-lg font-bold">ورود موفق!</h1>
              <p className="text-sm text-muted-foreground">به ایمچ خوش آمدید. اکنون به پنل کاربری منتقل می‌شوید.</p>
              <Button asChild className="w-full rounded-md">
                <Link href="/panel">ورود به پنل کاربری</Link>
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6 space-y-2 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-md bg-primary/10 text-primary">
                  <Smartphone size={22} />
                </span>
                <h1 className="text-lg font-bold">{step === 'phone' ? 'ورود / ثبت‌نام' : 'کد تأیید'}</h1>
                <p className="text-xs leading-5 text-muted-foreground">
                  {step === 'phone'
                    ? 'ورود و ثبت‌نام ایمچ فقط با شماره موبایل انجام می‌شود.'
                    : `کد ۴ رقمی پیامک‌شده به ${phone} را وارد کنید.`}
                </p>
              </div>

              {step === 'phone' ? (
                <form onSubmit={sendCode} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">شماره موبایل</Label>
                    <Input
                      id="phone"
                      dir="ltr"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="09123456789"
                      maxLength={11}
                      className="rounded-md text-center font-mono tracking-widest"
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
                    {/* کد پیامکی ۴ رقم ساده است — بدون جداکننده، عین متن پیامک */}
                    <InputOTP maxLength={4} value={code} onChange={verify} disabled={verifyMutation.isPending}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
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
                  <Button variant="ghost" size="sm" className="w-full gap-1 text-muted-foreground" onClick={() => { setStep('phone'); setCode(''); setError(''); }}>
                    <ArrowRight size={14} />
                    تغییر شماره موبایل
                  </Button>
                </div>
              )}

              <p className="mt-6 text-center text-[11px] leading-5 text-muted-foreground">
                با ورود، <Link href="#" className="text-primary hover:underline">قوانین و مقررات ایمچ</Link> را می‌پذیرید.
              </p>
            </>
          )}
        </div>
      </main>
    </>
  );
}
