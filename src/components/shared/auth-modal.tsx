'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, KeyRound, Loader2, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { useAuth } from '@/lib/mock/auth';
import { useLoginSession } from '@/lib/mock/hooks';
import { flushPendingRfq, takeAfterAuthRedirect, PANEL_RFQ_DEST } from '@/lib/pending-rfq';

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
 * کاربر لاگین‌نشده قیمت‌ها را نمی‌بیند؛ همین مودال از دکمه «مشاهده قیمت» باز می‌شود.
 */

/**
 * مودال از کجا باز شده؟ جملهٔ بالای فرم با همان نیات جمله‌بندی می‌شود
 * (خواسته مالک ۱-۱۱: به‌جای جملهٔ ثابت «فقط با شماره موبایل…»،
 * جمله‌ای که همان لحظه برای کاربر معنا دارد).
 */
export type AuthIntent = 'login' | 'register' | 'price' | 'call' | 'rfq' | 'save' | 'save-catalog' | 'save-book' | 'chat' | 'review' | 'offer' | 'service-signup';

/** جملهٔ مرحله شماره موبایل بر اساس نیات ورود */
const INTENT_SUBTITLES: Record<AuthIntent, string> = {
  login: 'برای ورود، شماره موبایل خود را وارد کنید.',
  register: 'برای ثبت‌نام، شماره موبایل خود را وارد کنید.',
  price: 'برای مشاهده قیمت، شماره موبایل خود را وارد کنید.',
  call: 'برای تماس ابتدا وارد شوید؛ شماره موبایل خود را وارد کنید.',
  rfq: 'برای ثبت درخواست خرید، شماره موبایل خود را وارد کنید.',
  save: 'برای نشان کردن، شماره موبایل خود را وارد کنید.',
  // خواستهٔ مالک ۱۰-۱۱ دور ۵ — مهمان با ذخیرهٔ کاتالوگ/دفتر به ثبت‌نام در
  // ایمچ راهنمایی می‌شود (کاربر تازه خودکار به /register می‌رود)
  'save-catalog': 'برای ذخیرهٔ کاتالوگ، شماره موبایل خود را وارد کنید؛ هنوز عضو نیستید؟ همین‌جا رایگان ثبت‌نام کنید.',
  'save-book': 'برای ذخیرهٔ دفتر خرید، شماره موبایل خود را وارد کنید؛ هنوز عضو نیستید؟ همین‌جا رایگان ثبت‌نام کنید.',
  chat: 'برای گفتگو با فروشنده، شماره موبایل خود را وارد کنید.',
  review: 'برای ثبت نظر، شماره موبایل خود را وارد کنید.',
  offer: 'برای ارسال پیشنهاد تامین، شماره موبایل خود را وارد کنید.',
  // ثبت‌نام فروشنده در سرویس‌های تخصصی (ریتو/همخرید — خواستهٔ مالک ۱۱-۱۲)
  'service-signup': 'برای ثبت‌نام در سرویس‌های تخصصی، شماره موبایل خود را وارد کنید؛ هنوز عضو نیستید؟ همین‌جا رایگان ثبت‌نام کنید.',
};

export function AuthModal({
  open,
  onClose,
  onLoggedIn,
  intent = 'login',
  initialPhone,
  notice,
}: {
  open: boolean;
  onClose: () => void;
  onLoggedIn: () => void;
  /** نیات باز شدن — جملهٔ بالای فرم و فوکوس خودکار روی موبایل */
  intent?: AuthIntent;
  /** شمارهٔ پیش‌پر (بعد از تعیین/تغییر رمز) — فرم مستقیم روی مرحلهٔ رمز شروع می‌شود */
  initialPhone?: string;
  /** اعلان موفقیت بالای فرم — «رمز عبور شما تغییر کرد. لطفاً با رمز جدید وارد شوید» */
  notice?: string;
}) {
  const router = useRouter();
  const { login } = useAuth();
  const [step, setStep] = useState<'phone' | 'password'>(initialPhone ? 'password' : 'phone');
  const [phone, setPhone] = useState(initialPhone ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const phoneRef = useRef<HTMLInputElement>(null);

  const loginMutation = useLoginSession();
  // بدنهٔ فرم دوبار رندر می‌شود (بات‌شیت موبایل + مودال دسکتاپ) — id یکتا
  // برای هر نمونه تا label/aria و فرم‌ها درست بمانند
  const phoneId = useId();
  const passwordId = useId();

  // فوکوس همیشگی روی اینپوت موبایل — مودال که باز می‌شود کاربر مستقیم تایپ کند
  // (autoFocus فقط لحظهٔ مونت عمل می‌کند؛ رفرشِ نیت/مرحه هم اینجا پوشیده می‌شود)
  useEffect(() => {
    if (!open || step !== 'phone') return;
    const t = setTimeout(() => phoneRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [open, step, intent]);

  const handleSuccess = async (isNewUser: boolean, user: Parameters<typeof login>[0]) => {
    login(user);
    setStep('phone');
    setPhone('');
    setPassword('');
    setError('');
    // کاربر جدید → تکمیل اطلاعات (نام/استان/شهر) در صفحه ثبت‌نام؛
    // درخواست معلق/مقصد پس از ورود می‌ماند تا بعد از تکمیل اجرا شود
    if (isNewUser) {
      onLoggedIn();
      router.push('/register?step=info');
      return;
    }
    // کاربر قبلی — نیت‌های معلق (درخواست خرید صفحه اول / مقصد بنر فروشگاه)
    // همین حالا اجرا شوند؛ بدون نیت، همان صفحه فعلی می‌ماند (رفتار قبلی)
    const flushed = await flushPendingRfq();
    onLoggedIn();
    if (flushed !== 'none') {
      // submitted: درخواست ثبت شد → پنل خرید
      // failed: شبکه خطا داد → کاربر در پنل لیست را می‌بیند و از همان‌جا دوباره ثبت می‌کند
      router.push(PANEL_RFQ_DEST);
      return;
    }
    const redirect = takeAfterAuthRedirect('');
    if (redirect) router.push(redirect);
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

  const title = step === 'phone' ? 'ورود / ثبت‌نام' : 'رمز عبور';
  const subtitle =
    step === 'phone'
      ? INTENT_SUBTITLES[intent]
      : `رمز عبور پنل خود را برای ${phone} وارد کنید.`;

  const body = (
    <div className="space-y-4 p-1">
      {/* اعلان «رمز عوض شد» — بالای فرم، سبز و آرام (خواسته مالک ۱-۱۱) */}
      {notice && (
        <p className="flex items-center justify-center gap-2 rounded-md bg-success-soft px-3 py-2.5 text-xs font-bold leading-5 text-success-deep">
          <CheckCircle2 size={16} className="shrink-0" aria-hidden />
          {notice}
        </p>
      )}
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="grid size-11 place-items-center rounded-md bg-primary/10 text-primary">
          {step === 'phone' ? <Smartphone size={20} /> : <KeyRound size={20} />}
        </span>
        <p className="text-xs leading-5 text-muted-foreground">{subtitle}</p>
      </div>

      {step === 'phone' ? (
        <form onSubmit={sendPhone} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={phoneId}>شماره موبایل</Label>
            <Input
              id={phoneId}
              ref={phoneRef}
              dir="ltr"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="0912…"
              maxLength={11}
              className="font-num rounded-md text-center text-base tracking-widest"
              autoComplete="tel"
            />
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
          {/* هم‌قدِ اینپوت موبایل — قانون تناسب RULES.md §۱ (h-12 / md:h-13) */}
          <Button type="submit" size="lg" className="h-12 w-full rounded-md md:h-13" disabled={loginMutation.isPending}>
            {loginMutation.isPending ? <Loader2 className="animate-spin" size={18} /> : null}
            {loginMutation.isPending ? 'در حال ورود…' : 'ورود به ایمچ'}
          </Button>
        </form>
      ) : (
        <form onSubmit={sendPassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor={passwordId}>رمز عبور</Label>
            <Input
              id={passwordId}
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
          {/* هم‌قدِ اینپوت رمز (h-12 / md:h-13) */}
          <Button type="submit" size="lg" className="h-12 w-full rounded-md md:h-13" disabled={loginMutation.isPending}>
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
