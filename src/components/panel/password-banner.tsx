'use client';

/**
 * گیت رمز عبور پنل (خواسته مالک ۱-۱۱ دور هشتم — «ترفند مجبور کردن کاربر»):
 *
 * ۱) بنر قرمز چسبان «قبل از هر کاری، برای پنل خود رمز عبور تعیین کنید» —
 *    با تپش ملایم؛ تا تعیین رمز در همهٔ صفحات پنل می‌ماند.
 * ۲) مودال تعیین رمز (موبایل: بات‌شیت / دسکتاپ: مودال مرکزی — قانون §۲):
 *    • پیام گیت: «قبل از هر کاری، برای پنل خود رمز عبور تعیین کنید.»
 *    • شماره موبایلی که کاربر با آن وارد شده — درشت (font-num)، دقیقاً بالای
 *      باکس رمز + مداد ویرایش کنارش؛ با زدن مداد شماره به تکست‌باکس تبدیل
 *      می‌شود و کاربر می‌تواند آن را اصلاح کند (مثلاً غلط تایپی ورود سشن).
 *    • شمارهٔ ویرایش‌شده اگر از قبل رمزدار باشد → خطای دقیق + شماره پشتیبانی
 *      (پیام از بک‌اند می‌آید — PHONE_HAS_PASSWORD).
 *    • پس از موفقیت: خروج خودکار + اعلان «رمز عبور شما تغییر کرد. لطفاً با
 *      رمز جدید وارد شوید.» و ورود دوباره با همان شماره (forceRelogin).
 *
 * منطق: SessionUser.hasPassword (از getProfile بک‌اند — has_password).
 * باز/بسته شدن مودال دست PanelShell است (auto-open هنگام ورود به پنل).
 */

import { useState } from 'react';
import { Check, KeyRound, Loader2, Pencil, ShieldAlert, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { useAuth } from '@/lib/mock/auth';
import { useSetPassword } from '@/lib/mock/hooks';

const PHONE_RE = /^09\d{9}$/;

export function PasswordBanner({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user, forceRelogin } = useAuth();
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneDraft, setPhoneDraft] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const mutation = useSetPassword();

  // گیت فقط برای کاربر واردشده‌ای که هنوز رمز پنل تعیین نکرده است
  if (!user || user.hasPassword) return null;

  // شمارهٔ مؤثر — تا وقتی ویرایش نشده همان شمارهٔ نشست است
  const effectivePhone = phoneDraft || user.phone;
  const phoneChanged = effectivePhone !== user.phone;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!PHONE_RE.test(effectivePhone)) {
      setError('شماره موبایل معتبر نیست (مثل 09123456789).');
      return;
    }
    if (password.length < 6) {
      setError('رمز عبور باید حداقل ۶ نویسه باشد.');
      return;
    }
    if (password !== confirm) {
      setError('تکرار رمز عبور با رمز عبور یکسان نیست.');
      return;
    }
    try {
      const res = await mutation.mutateAsync({
        password,
        // شمارهٔ ویرایش‌شده فقط وقتی فرستاده می‌شود که واقعاً عوض شده است
        newPhone: phoneChanged ? effectivePhone : undefined,
      });
      // موفق: خروج خودکار + ورود دوباره با رمز جدید (خواسته مالک)
      onOpenChange(false);
      forceRelogin(
        res.phone,
        'رمز عبور شما تغییر کرد. لطفاً با رمز جدید وارد شوید.',
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعیین رمز عبور ناموفق بود — دوباره تلاش کنید.');
    }
  };

  const body = (
    <form onSubmit={submit} className="space-y-4">
      {/* پیام گیت — جملهٔ دقیق خواستهٔ مالک */}
      <p
        className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2.5 text-xs font-bold leading-5 text-destructive"
        role="alert"
      >
        <ShieldAlert size={16} className="shrink-0" aria-hidden />
        قبل از هر کاری، برای پنل خود رمز عبور تعیین کنید.
      </p>

      {/* شماره موبایل — درشت، دقیقاً بالای باکس رمز + مداد ویرایش (خواسته مالک) */}
      <div className="rounded-lg border bg-secondary/50 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-bold text-muted-foreground">شماره موبایل شما</span>
          {!editingPhone ? (
            <button
              type="button"
              onClick={() => {
                setPhoneDraft(user.phone);
                setEditingPhone(true);
              }}
              aria-label="ویرایش شماره موبایل"
              title="ویرایش شماره موبایل"
              className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <Pencil size={15} />
            </button>
          ) : (
            <span className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setEditingPhone(false)}
                aria-label="تایید شماره موبایل"
                title="تایید شماره موبایل"
                className="flex size-9 items-center justify-center rounded-md text-success-deep transition-colors hover:bg-success-soft"
              >
                <Check size={16} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setPhoneDraft(user.phone);
                  setEditingPhone(false);
                }}
                aria-label="انصراف از ویرایش"
                title="انصراف از ویرایش"
                className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <X size={16} />
              </button>
            </span>
          )}
        </div>
        {!editingPhone ? (
          <p
            dir="ltr"
            className="mt-0.5 text-center font-num text-xl font-extrabold tracking-widest text-foreground"
          >
            {effectivePhone}
          </p>
        ) : (
          <Input
            dir="ltr"
            inputMode="numeric"
            value={phoneDraft}
            onChange={(e) => setPhoneDraft(e.target.value.replace(/[^\d]/g, ''))}
            placeholder="0912…"
            maxLength={11}
            autoFocus
            aria-label="شماره موبایل"
            className="mt-1.5 rounded-md text-center font-num text-base tracking-widest"
          />
        )}
        {editingPhone && (
          <p className="mt-1.5 text-center text-[10px] leading-4 text-muted-foreground">
            رمز عبور برای همین شمارهٔ جدید تعیین می‌شود و دفعهٔ بعد با آن وارد می‌شوید.
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="panel-password">رمز عبور</Label>
        <Input
          id="panel-password"
          type="password"
          dir="ltr"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="حداقل ۶ نویسه"
          maxLength={72}
          className="rounded-md"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="panel-password-confirm">تکرار رمز عبور</Label>
        <Input
          id="panel-password-confirm"
          type="password"
          dir="ltr"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="تکرار رمز عبور"
          maxLength={72}
          className="rounded-md"
        />
      </div>
      {error && (
        <p className="text-xs leading-5 text-destructive font-num">{error}</p>
      )}
      {/* هم‌قدِ اینپوت‌های فرم — قانون تناسب RULES.md §۱ (h-12 / md:h-13) */}
      <Button
        type="submit"
        size="lg"
        className="h-12 w-full rounded-md md:h-13"
        disabled={mutation.isPending}
      >
        {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={17} />}
        {mutation.isPending ? 'در حال ذخیره…' : 'تعیین رمز عبور'}
      </Button>
    </form>
  );

  return (
    <>
      {/* بنر قرمز چسبان — یادآور همیشگی تا تعیین رمز */}
      <div
        className="animate-soft-blink sticky top-12 z-20 bg-red-600 text-white shadow-sm lg:top-0"
        role="alert"
        aria-live="polite"
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4 py-2.5">
          <p className="flex min-w-0 items-center gap-2 text-xs font-bold leading-5 sm:text-[13px]">
            <ShieldAlert size={17} className="shrink-0" aria-hidden />
            <span className="min-w-0">
              قبل از هر کاری، برای پنل خود رمز عبور تعیین کنید تا در صورت خروج بتوانید دوباره وارد شوید.
            </span>
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 gap-1.5 rounded-sm px-3 text-[11px] font-bold text-red-700 hover:bg-white/90"
            onClick={() => onOpenChange(true)}
          >
            <KeyRound size={13} />
            تعیین رمز عبور
          </Button>
        </div>
      </div>

      {/* موبایل — بات‌شیت پایین‌رونده (قانون §۲) */}
      <BottomSheet open={open} onClose={() => onOpenChange(false)} title="تعیین رمز عبور پنل">
        <div className="p-1">{body}</div>
      </BottomSheet>

      {/* دسکتاپ — مودال مرکزی */}
      {open && (
        <div
          className="fixed inset-0 z-[60] hidden items-center justify-center p-4 nav-desktop:flex"
          role="dialog"
          aria-modal="true"
          aria-label="تعیین رمز عبور پنل"
        >
          <div className="animate-sheet-fade absolute inset-0 bg-black/40" onClick={() => onOpenChange(false)} />
          <div className="relative w-full max-w-sm rounded-xl bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-border/70 pb-3">
              <h2 className="text-base font-bold">تعیین رمز عبور پنل</h2>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
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

/** صفحهٔ قفل پنل — محتوای پنل تا تعیین رمز با همین جایگزین می‌شود (اجبار ملایم:
 *  کاربر می‌تواند مودال را ببندد اما تا رمز تعیین نکند به داده‌های پنل نمی‌رسد). */
export function PasswordLock({ onOpen }: { onOpen: () => void }) {
  return (
    <div className="grid min-h-[60vh] place-items-center p-6">
      <div className="w-full max-w-sm rounded-lg border bg-card p-8 text-center shadow-sm">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/10 text-destructive">
          <ShieldAlert size={26} />
        </span>
        <h1 className="mt-4 text-lg font-extrabold">پنل شما منتظر رمز عبور است</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          قبل از هر کاری، برای پنل خود رمز عبور تعیین کنید تا در صورت خروج بتوانید دوباره وارد شوید.
        </p>
        {/* هم‌قدِ اینپوت‌ها — قانون تناسب §۱ */}
        <Button className="mt-5 h-12 w-full rounded-md md:h-13" onClick={onOpen}>
          <KeyRound size={17} />
          تعیین رمز عبور
        </Button>
      </div>
    </div>
  );
}
