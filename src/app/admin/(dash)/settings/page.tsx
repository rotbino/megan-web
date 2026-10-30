'use client';

/**
 * تنظیمات (فاز A5) — حساب مدیریت جاری:
 *  • اطلاعات حساب + نقش + آخرین ورود
 *  • تغییر رمز عبور خودم (با رمز فعلی — admin/auth/changePassword)
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { KeyRound, Loader2, Settings, ShieldCheck } from 'lucide-react';
import { adminChangePassword, fetchAdminMe } from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { timeAgoFa } from '@/lib/format';

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: me, isLoading } = useQuery({ queryKey: ['admin-me'], queryFn: fetchAdminMe });

  const [currentPassword, setCurrent] = useState('');
  const [newPassword, setNew] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const changePassword = useMutation({
    mutationFn: () => adminChangePassword(currentPassword, newPassword),
    onSuccess: () => {
      setCurrent('');
      setNew('');
      setConfirm('');
      setError('');
      setDone(true);
      void queryClient.invalidateQueries({ queryKey: ['admin-me'] });
      toast({ description: 'رمز عبور مدیریت تغییر کرد.' });
    },
    onError: (err: Error) => {
      setDone(false);
      setError(err.message);
    },
  });

  const submit = () => {
    setError('');
    setDone(false);
    if (newPassword.length < 8) return setError('رمز جدید باید حداقل ۸ نویسه باشد.');
    if (newPassword !== confirm) return setError('تکرار رمز جدید مطابقت ندارد.');
    changePassword.mutate();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* سربرگ */}
      <div className="flex items-center gap-2.5">
        <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
          <Settings size={18} />
        </span>
        <div>
          <h1 className="text-base font-extrabold">تنظیمات</h1>
          <p className="text-[11px] text-muted-foreground">حساب مدیریت جاری و امنیت آن</p>
        </div>
      </div>

      {/* اطلاعات حساب */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <ShieldCheck size={15} className="text-verified" />
          حساب مدیریت
        </h2>
        {isLoading || !me ? (
          <div className="space-y-2">
            <Skeleton className="h-6 w-40 rounded-md" />
            <Skeleton className="h-6 w-56 rounded-md" />
          </div>
        ) : (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2.5 sm:grid-cols-2">
            <div>
              <dt className="text-[11px] text-muted-foreground">نام نمایشی</dt>
              <dd className="text-[13px] font-bold">{me.name}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">نام کاربری</dt>
              <dd className="text-[13px] font-bold" dir="ltr">
                {me.username}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">نقش</dt>
              <dd className="text-[13px] font-bold">
                {me.role === 'SUPER_ADMIN' ? 'مدیر ارشد (SUPER_ADMIN)' : 'ادمین (ADMIN)'}
              </dd>
            </div>
            <div>
              <dt className="text-[11px] text-muted-foreground">آخرین ورود</dt>
              <dd className="text-[13px] font-bold">
                {me.lastLoginAt ? timeAgoFa(me.lastLoginAt) : '—'}
              </dd>
            </div>
          </dl>
        )}
        <p className="mt-3 border-t border-border/60 pt-2.5 text-[11px] leading-5 text-muted-foreground">
          مدیریت ادمین‌ها (ایجاد/غیرفعال‌سازی/تعیین رمز) در صفحه «ادمین‌ها» انجام می‌شود — فقط
          برای مدیر ارشد.
        </p>
      </div>

      {/* تغییر رمز */}
      <div className="rounded-lg border bg-card p-4 shadow-sm">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold">
          <KeyRound size={15} className="text-primary" />
          تغییر رمز عبور
        </h2>
        <div className="max-w-sm space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">رمز عبور فعلی</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrent(e.target.value)}
              dir="ltr"
              className="h-9 rounded-md"
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">رمز عبور جدید (حداقل ۸ نویسه)</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNew(e.target.value)}
              dir="ltr"
              className="h-9 rounded-md"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">تکرار رمز عبور جدید</Label>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              dir="ltr"
              className="h-9 rounded-md"
              autoComplete="new-password"
            />
          </div>
          {error && <p className="text-[11.5px] font-bold text-destructive">{error}</p>}
          {done && (
            <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-[11.5px] font-bold text-emerald-700">
              رمز عبور با موفقیت تغییر کرد.
            </p>
          )}
          <Button
            size="sm"
            className="h-9 rounded-lg"
            disabled={changePassword.isPending || !currentPassword || !newPassword || !confirm}
            onClick={submit}
          >
            {changePassword.isPending ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            تغییر رمز
          </Button>
        </div>
        <p className="mt-3 border-t border-border/60 pt-2.5 text-[11px] leading-5 text-muted-foreground">
          پس از تغییر رمز، نشست‌های دیگر با توکن ۱۲ ساعته تا انقضایشان معتبر می‌مانند — اگر
          رمز در دست دیگران است غیرفعال‌سازی ادمین فوری‌تر است.
        </p>
      </div>
    </div>
  );
}
