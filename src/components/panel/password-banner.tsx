'use client';

/**
 * بنر قرمز «رمز عبور تعیین کنید» — بالای پنل، در همه صفحات پنل دیده می‌شود
 * (داخل PanelShell رندر می‌شود). سوسوی ملایم دارد و تا وقتی کاربر برای
 * پنلش رمز عبور تعیین نکرده باشد سرجایش می‌ماند؛ با تعیین رمز (و refresh
 * نشست) برداشته می‌شود.
 *
 * منطق: SessionUser.hasPassword (از getProfile بک‌اند — has_password).
 * تا رمز تعیین نشده، ورود بدون رمز مثل دفعه اول ممکن است (روش سشن).
 */

import { useState } from 'react';
import { KeyRound, Loader2, ShieldAlert } from 'lucide-react';
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
import { useAuth } from '@/lib/mock/auth';
import { useSetPassword } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';

export function PasswordBanner() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const mutation = useSetPassword();

  // بنر فقط برای کاربر واردشده‌ای که هنوز رمز پنل تعیین نکرده است
  if (!user || user.hasPassword) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) {
      setError('رمز عبور باید حداقل ۶ نویسه باشد.');
      return;
    }
    if (password !== confirm) {
      setError('تکرار رمز عبور با رمز عبور یکسان نیست.');
      return;
    }
    try {
      await mutation.mutateAsync({ password });
      // نشست به‌روز شود → hasPassword=true → بنر خودش برداشته می‌شود
      await refreshUser();
      setOpen(false);
      setPassword('');
      setConfirm('');
      toast({ description: 'رمز عبور پنل شما تعیین شد. از این پس برای ورود از آن استفاده کنید.' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'تعیین رمز عبور ناموفق بود — دوباره تلاش کنید.');
    }
  };

  return (
    <>
      <div
        className="animate-soft-blink sticky top-12 z-20 bg-red-600 text-white shadow-sm lg:top-0"
        role="alert"
        aria-live="polite"
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-4 py-2.5">
          <p className="flex min-w-0 items-center gap-2 text-xs font-bold leading-5 sm:text-[13px]">
            <ShieldAlert size={17} className="shrink-0" aria-hidden />
            <span className="min-w-0">
              برای پنل خود رمز عبور تعیین کنید تا در صورت خروج بتوانید دوباره وارد شوید.
            </span>
          </p>
          <Button
            size="sm"
            variant="secondary"
            className="h-7 gap-1.5 rounded-sm px-3 text-[11px] font-bold text-red-700 hover:bg-white/90"
            onClick={() => setOpen(true)}
          >
            <KeyRound size={13} />
            تعیین رمز عبور
          </Button>
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setError(''); }}>
        <DialogContent className="max-w-sm rounded-xl">
          <DialogHeader className="text-right">
            <DialogTitle>تعیین رمز عبور پنل</DialogTitle>
            <DialogDescription>
              با تعیین رمز عبور، ورود بعدی شما با شماره موبایل و این رمز انجام می‌شود.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
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
                autoFocus
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
            {error && <p className="text-xs text-destructive">{error}</p>}
            <Button type="submit" size="lg" className="w-full rounded-md" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 className="animate-spin" size={18} /> : <KeyRound size={17} />}
              {mutation.isPending ? 'در حال ذخیره…' : 'تعیین رمز عبور'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
