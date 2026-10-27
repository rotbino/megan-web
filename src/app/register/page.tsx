'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, KeyRound, Loader2, MapPin, Smartphone, UserRound } from 'lucide-react';
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
import { useLoginSession, useProvinces, useCities, useUpdatePanelProfile } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { getTokens } from '@/lib/api/client';

/**
 * ورود/ثبت‌نام (روش سشن — بدون پیامک، تا آمدن پنل پیامک):
 * ۱) شماره موبایل → ورود مستقیم (کاربر رمزدار → مرحله رمز عبور)
 * ۲) فقط کاربر جدید: نام و نام خانوادگی + استان و شهر — مکان پیش‌فرض
 * کاربر ذخیره می‌شود تا در فرم‌های ثبت آگهی/درخواست خودکار انتخاب شده باشد.
 *
 * پشتیبانی از /register?step=info — ریدایرکت کاربر تازه‌ثبت‌نام‌شده از مودال ورود.
 * بعد از ورود/تکمیل، کاربر بلافاصله به پنل می‌رود (خواسته مالک — بدون دکمه اضافه).
 */
export default function RegisterPage() {
  const router = useRouter();
  const { user, login, refreshUser } = useAuth();
  const [step, setStep] = useState<'phone' | 'password' | 'info'>('phone');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // مرحله اطلاعات — نام/نام‌خانوادگی + استان/شهر
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [cityId, setCityId] = useState('');

  const loginMutation = useLoginSession();
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

  // ورود موفق (کاربر قبلی) → بلافاصله پنل (خواسته مالک — بدون دکمه اضافه)
  useEffect(() => {
    if (done) {
      router.push('/panel');
    }
  }, [done, router]);

  const handleLogin = (withPassword: boolean) => {
    setError('');
    loginMutation.mutate(
      withPassword ? { phone, password } : { phone },
      {
        onSuccess: (res) => {
          if (res.ok && res.user) {
            login(res.user);
            // کاربر جدید → مرحله اطلاعات؛ کاربر قبلی → مستقیم به پنل
            if (res.isNewUser) setStep('info');
            else setDone(true);
          } else if (res.requiresPassword) {
            setStep('password'); // کاربر رمز تعیین کرده است
          }
        },
        onError: (err) => setError(err instanceof Error ? err.message : 'ورود ناموفق بود.'),
      },
    );
  };

  const sendPhone = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^09\d{9}$/.test(phone)) {
      setError('شماره موبایل معتبر نیست (مثال: 09123456789)');
      return;
    }
    handleLogin(false);
  };

  const sendPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('رمز عبور حداقل ۶ نویسه است.');
      return;
    }
    handleLogin(true);
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
    step === 'phone' ? 'ورود / ثبت‌نام' : step === 'password' ? 'رمز عبور' : 'تکمیل اطلاعات';
  const stepSubtitle =
    step === 'phone'
      ? 'ورود و ثبت‌نام ایمچ فقط با شماره موبایل انجام می‌شود.'
      : step === 'password'
        ? `رمز عبور پنل خود را برای ${phone} وارد کنید.`
        : 'نام و شهر شما در ایمچ ذخیره می‌شود تا ثبت آگهی‌ها سریع‌تر باشد.';

  return (
    <>
      <Header />
      <main className="flex flex-1 items-center justify-center bg-gradient-to-b from-secondary/60 to-background px-4 py-12">
        <div className="w-full max-w-sm rounded-md border bg-card p-6 shadow-sm">
          {done ? (
            // ورود/تکمیل موفق — لحظه‌ای بعد خودکار به پنل می‌رود (بدون دکمه اضافه)
            <div className="grid place-items-center gap-3 py-10 text-center">
              <Loader2 size={30} className="animate-spin text-primary" />
              <p className="text-sm font-bold">ورود موفق — در حال انتقال به پنل…</p>
            </div>
          ) : (
            <>
              <div className="mb-6 space-y-2 text-center">
                <span className="mx-auto grid size-12 place-items-center rounded-md bg-primary/10 text-primary">
                  {step === 'info' ? <UserRound size={22} /> : step === 'password' ? <KeyRound size={22} /> : <Smartphone size={22} />}
                </span>
                <h1 className="text-lg font-bold">{stepTitle}</h1>
                <p className="text-xs leading-5 text-muted-foreground">{stepSubtitle}</p>
              </div>

              {step === 'phone' ? (
                <form onSubmit={sendPhone} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="phone">شماره موبایل</Label>
                    <Input
                      id="phone"
                      dir="ltr"
                      inputMode="numeric"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
                      placeholder="0912…"
                      maxLength={11}
                      className="font-num rounded-md text-center text-base tracking-widest"
                    />
                  </div>
                  {error && <p className="text-xs text-destructive">{error}</p>}
                  <Button type="submit" size="lg" className="w-full rounded-md" disabled={loginMutation.isPending}>
                    {loginMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : null}
                    {loginMutation.isPending ? 'در حال ورود…' : 'ورود به ایمچ'}
                  </Button>
                </form>
              ) : step === 'password' ? (
                <form onSubmit={sendPassword} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="reg-password">رمز عبور</Label>
                    <Input
                      id="reg-password"
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
                  {loginMutation.isPending && (
                    <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                      <Loader2 size={12} className="animate-spin" /> در حال بررسی…
                    </p>
                  )}
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
              ) : (
                <form onSubmit={submitInfo} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="first-name">نام <span className="text-red-500">*</span></Label>
                      <Input
                        id="first-name"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
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
