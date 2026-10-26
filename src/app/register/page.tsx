'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Loader2, Lock, MapPin, Smartphone, UserRound } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { useRequestOtp, useVerifyOtp, useProvinces, useCities, useUpdatePanelProfile } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { getTokens } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';

/**
 * ورود/ثبت‌نام سه‌مرحله‌ای (خواسته مالک):
 * ۱) شماره موبایل ۲) کد تأیید ۴ رقمی (بدون جداکننده — عین متن پیامک)
 * ۳) فقط کاربر جدید: نام و نام خانوادگی + استان و شهر — مکان پیش‌فرض
 * کاربر ذخیره می‌شود تا در فرم‌های ثبت آگهی/درخواست خودکار انتخاب شده باشد.
 *
 * پشتیبانی از /register?step=info — ریدایرکت کاربر تازه‌ثبت‌نام‌شده از مودال ورود.
 */
export default function RegisterPage() {
  const { user, login, refreshUser } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<'phone' | 'code' | 'info'>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // مرحله اطلاعات — نام/نام‌خانوادگی + استان/شهر
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [cityId, setCityId] = useState('');

  const otpMutation = useRequestOtp();
  const verifyMutation = useVerifyOtp();
  const profileMutation = useUpdatePanelProfile();
  const { data: provinces } = useProvinces();
  const { data: cities } = useCities(Number(provinceId) || undefined);

  // ورود عمیق ?step=info — کاربر تازه‌واردشده از مودال ورود
  // window فقط بعد از مونت در دسترس است — الگوی استاندارد هیدریشن
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('step') === 'info' && getTokens()?.accessToken) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- خواندن آدرس مرورگر فقط بعد از مونت ممکن است (ورود عمیق)
        setStep('info');
        if (user?.phone) setPhone(user.phone);
      }
    } catch {
      /* noop */
    }
  }, [user?.phone]);

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
              if (res.user) login(res.user);
              // کاربر جدید → مرحله اطلاعات؛ کاربر قبلی → مستقیم وارد شد
              setStep(res.isNewUser ? 'info' : 'phone');
              setDone(!res.isNewUser);
              if (!res.isNewUser) setCode('');
            } else {
              setError('کد وارد شده صحیح نیست.');
            }
          },
          onError: (err) => setError(err instanceof Error ? err.message : 'کد وارد شده صحیح نیست.'),
        },
      );
    }
  };

  const submitInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (firstName.trim().length < 2) {
      setError('نام را وارد کنید (حداقل ۲ حرف).');
      return;
    }
    if (lastName.trim().length < 2) {
      setError('نام خانوادگی را وارد کنید (حداقل ۲ حرف).');
      return;
    }
    if (!provinceId) {
      setError('استان خود را انتخاب کنید.');
      return;
    }
    if (!cityId) {
      setError('شهر خود را انتخاب کنید.');
      return;
    }
    try {
      await profileMutation.mutateAsync({
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        province_id: Number(provinceId),
        city_id: Number(cityId),
      });
      // نشست فرانت با نام/مکان جدید به‌روز شود (هدر، منوها)
      await refreshUser();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره اطلاعات ناموفق بود — دوباره تلاش کنید.');
    }
  };

  const stepTitle =
    step === 'phone' ? 'ورود / ثبت‌نام' : step === 'code' ? 'کد تأیید' : 'تکمیل اطلاعات';
  const stepSubtitle =
    step === 'phone'
      ? 'ورود و ثبت‌نام ایمچ فقط با شماره موبایل انجام می‌شود.'
      : step === 'code'
        ? `کد ۴ رقمی پیامک‌شده به ${phone} را وارد کنید.`
        : 'نام و شهر شما در ایمچ ذخیره می‌شود تا ثبت آگهی‌ها سریع‌تر باشد.';

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
                  {step === 'info' ? <UserRound size={22} /> : <Smartphone size={22} />}
                </span>
                <h1 className="text-lg font-bold">{stepTitle}</h1>
                <p className="text-xs leading-5 text-muted-foreground">{stepSubtitle}</p>
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
              ) : step === 'code' ? (
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
              ) : (
                <form onSubmit={submitInfo} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="first-name">نام <span className="text-red-500">*</span></Label>
                      <Input
                        id="first-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="مثلا: علی"
                        maxLength={60}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="last-name">نام خانوادگی <span className="text-red-500">*</span></Label>
                      <Input
                        id="last-name"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="مثلا: رضایی"
                        maxLength={60}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="province">استان <span className="text-red-500">*</span></Label>
                    <Select
                      value={provinceId}
                      onValueChange={(v) => {
                        setProvinceId(v);
                        setCityId(''); // شهر استان قبلی دیگر معتبر نیست
                      }}
                    >
                      <SelectTrigger id="province" className="w-full">
                        <SelectValue placeholder="انتخاب استان" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {(provinces ?? []).map((p) => (
                          <SelectItem key={p.id} value={String(p.id)}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="city">شهر <span className="text-red-500">*</span></Label>
                    <Select value={cityId} onValueChange={setCityId} disabled={!provinceId}>
                      <SelectTrigger id="city" className="w-full">
                        <SelectValue placeholder={provinceId ? 'انتخاب شهر' : 'ابتدا استان را انتخاب کنید'} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {(cities ?? []).map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <Button type="submit" size="lg" className="w-full rounded-md" disabled={profileMutation.isPending}>
                    {profileMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <MapPin size={17} />}
                    {profileMutation.isPending ? 'در حال ذخیره…' : 'ذخیره و ورود به ایمچ'}
                  </Button>
                  <p className="text-center text-[11px] leading-5 text-muted-foreground">
                    استان و شهر شما در ثبت آگهی خرید/فروش به‌صورت پیش‌فرض انتخاب می‌شود و هر وقت بخواهید قابل تغییر است.
                  </p>
                </form>
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
