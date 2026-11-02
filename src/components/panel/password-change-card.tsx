'use client';

/**
 * تغییر رمز عبور — کارت انتهای «ویرایش پروفایل» (خواسته مالک ۲-۱۱):
 * بنر قرمز پنل فقط «اولین تعیین رمز» را انجام می‌دهد؛ از آن به بعد، تغییر
 * رمز از همین کارت است. جریان همان POST /auth/setPassword بک‌اند است:
 *  • رمز فعلی الزامی است (خطای دقیق PASSWORD_WRONG از بک‌یند می‌آید)؛
 *  • پس از موفقیت همهٔ نشست‌ها باطل می‌شوند → خروج خودکار + مودال ورود با
 *    شمارهٔ پیش‌پر و اعلان «رمز عبور شما تغییر کرد…» (forceRelogin — همان
 *    الگوی password-banner).
 * فقط برای کاربرِ رمزدار رندر می‌شود — بی‌رمزها را گیت بنر قرمز پوشش می‌دهد.
 */

import { useState } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PanelCard } from '@/components/panel/panel-parts';
import { useAuth } from '@/lib/mock/auth';
import { useSetPassword } from '@/lib/mock/hooks';

export function PasswordChangeCard() {
  const { user, forceRelogin } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const mutation = useSetPassword();

  // بی‌رمزها گیت بنر قرمز را می‌بینند — این کارت فقط «تغییر» رمز موجود است
  if (!user?.hasPassword) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!currentPassword) {
      setError('رمز عبور فعلی خود را وارد کنید.');
      return;
    }
    if (password.length < 6) {
      setError('رمز عبور جدید باید حداقل ۶ نویسه باشد.');
      return;
    }
    if (password !== confirm) {
      setError('تکرار رمز عبور جدید با رمز عبور جدید یکسان نیست.');
      return;
    }
    try {
      const res = await mutation.mutateAsync({ password, currentPassword });
      // موفق: همهٔ نشست‌ها باطل شده‌اند → خروج خودکار + ورود دوباره با رمز جدید
      forceRelogin(res.phone, 'رمز عبور شما تغییر کرد. لطفاً با رمز جدید وارد شوید.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تغییر رمز عبور ناموفق بود — دوباره تلاش کنید.');
    }
  };

  return (
    <PanelCard>
      <h2 className="flex items-center gap-2 text-sm font-extrabold">
        <KeyRound size={17} className="text-primary" /> تغییر رمز عبور
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        پس از تغییر رمز، از همهٔ دستگاه‌ها خارج می‌شوید و باید با رمز جدید وارد شوید.
      </p>
      <form onSubmit={submit} className="mt-4 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="current-password">رمز عبور فعلی</Label>
          <Input
            id="current-password"
            type="password"
            dir="ltr"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="رمز عبور فعلی خود را وارد کنید"
            maxLength={72}
            autoComplete="current-password"
            className="rounded-md"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password">رمز عبور جدید</Label>
          <Input
            id="new-password"
            type="password"
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="حداقل ۶ نویسه"
            maxLength={72}
            autoComplete="new-password"
            className="rounded-md"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="new-password-confirm">تکرار رمز عبور جدید</Label>
          <Input
            id="new-password-confirm"
            type="password"
            dir="ltr"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="تکرار رمز عبور جدید"
            maxLength={72}
            autoComplete="new-password"
            className="rounded-md"
          />
        </div>
        {error && <p className="text-xs leading-5 text-destructive">{error}</p>}
        {/* هم‌قدِ اینپوت‌های همین فرم — قانون تناسب RULES.md §۱ (h-12 / md:h-13) */}
        <Button
          type="submit"
          className="h-12 w-full rounded-md md:h-13"
          disabled={mutation.isPending}
        >
          {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={17} />}
          {mutation.isPending ? 'در حال ذخیره…' : 'تغییر رمز عبور'}
        </Button>
      </form>
    </PanelCard>
  );
}
