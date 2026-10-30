'use client';

/**
 * مدیریت ادمین‌ها (فاز A5) — فقط SUPER_ADMIN.
 *  • لیست ادمین‌ها + آخرین ورود + تعداد عملیات
 *  • ایجاد ادمین جدید (نام کاربری یکتا + نقش + رمز)
 *  • فعال/غیرفعال (قفل فوری ورود) + تعیین مجدد رمز
 * گاردهای بک‌اند: خودم غیرفعال نمی‌شوم؛ آخرین سوپر فعال خاموش نمی‌شود.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  KeyRound,
  Loader2,
  ShieldCheck,
  UserCog,
  UserPlus,
} from 'lucide-react';
import {
  createAdminAdmin,
  fetchAdminAdmins,
  fetchAdminMe,
  resetAdminAdminPassword,
  setAdminAdminActive,
  type AdminRow,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { toFa, timeAgoFa } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function AdminAdminsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: me } = useQuery({ queryKey: ['admin-me'], queryFn: fetchAdminMe });
  const { data, isLoading } = useQuery({
    queryKey: ['admin-admins'],
    queryFn: () => fetchAdminAdmins(1, 50),
    retry: false,
  });

  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<AdminRow | null>(null);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ['admin-admins'] });

  const toggleActive = useMutation({
    mutationFn: (input: { id: string; active: boolean }) => setAdminAdminActive(input.id, input.active),
    onSuccess: (_d, input) => {
      invalidate();
      toast({
        description: input.active
          ? 'حساب ادمین فعال شد.'
          : 'حساب ادمین غیرفعال شد — ورودش فوراً قفل است.',
      });
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  // غیرسوپر → پیام دسترسی
  if (me && me.role !== 'SUPER_ADMIN') {
    return (
      <div className="mx-auto grid max-w-md place-items-center gap-3 py-16 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-secondary text-muted-foreground">
          <ShieldCheck size={26} />
        </span>
        <h1 className="text-base font-extrabold">فقط مدیر ارشد</h1>
        <p className="text-[12px] leading-6 text-muted-foreground">
          مدیریت ادمین‌ها فقط برای حساب‌های SUPER_ADMIN مجاز است.
        </p>
      </div>
    );
  }

  const items = data?.items ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <UserCog size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">مدیریت ادمین‌ها</h1>
            <p className="text-[11px] text-muted-foreground">
              {data ? `${toFa(data.total)} حساب مدیریت — فقط مدیر ارشد` : 'حساب‌های پنل مدیریت'}
            </p>
          </div>
        </div>
        <Button size="sm" className="h-9 rounded-lg" onClick={() => setCreateOpen(true)}>
          <UserPlus size={15} />
          ادمین جدید
        </Button>
      </div>

      {/* جدول/کارت‌ها */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((a) => {
            const isSelf = me?.id === a.id;
            return (
              <div
                key={a.id}
                className={cn(
                  'flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3.5',
                  !a.isActive && 'opacity-70',
                )}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-md',
                      a.role === 'SUPER_ADMIN' ? 'bg-primary/10 text-primary' : 'bg-secondary text-secondary-foreground',
                    )}
                  >
                    <UserCog size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold">
                      {a.name}
                      {isSelf && <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">شما</span>}
                      {a.role === 'SUPER_ADMIN' ? (
                        <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[9px] font-bold text-primary">مدیر ارشد</span>
                      ) : (
                        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-secondary-foreground">ادمین</span>
                      )}
                      {!a.isActive && (
                        <span className="rounded-full bg-rose-500/10 px-1.5 py-0.5 text-[9px] font-bold text-rose-600">غیرفعال</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      <span dir="ltr">{a.username}</span>
                      {' · '}
                      {a.lastLoginAt ? `آخرین ورود ${timeAgoFa(a.lastLoginAt)}` : 'بدون ورود'}
                      {' · '}
                      {toFa(a.actionCount)} عملیات ثبت‌شده
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 rounded-lg px-2.5 text-[11px]"
                    onClick={() => setResetTarget(a)}
                  >
                    <KeyRound size={13} />
                    رمز
                  </Button>
                  {!isSelf && (
                    <Button
                      variant={a.isActive ? 'outline' : 'default'}
                      size="sm"
                      className={cn('h-8 rounded-lg px-2.5 text-[11px]', !a.isActive && 'bg-primary')}
                      disabled={toggleActive.isPending}
                      onClick={() => toggleActive.mutate({ id: a.id, active: !a.isActive })}
                    >
                      {toggleActive.isPending ? <Loader2 size={13} className="animate-spin" /> : null}
                      {a.isActive ? 'غیرفعال‌سازی' : 'فعال‌سازی'}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-center text-[11px] leading-5 text-muted-foreground">
        غیرفعال‌سازی = قفل فوری ورود (گارد توکن وضعیت را زنده از دیتابیس می‌خواند). آخرین مدیر ارشد فعال و حساب خودتان قابل غیرفعال‌سازی نیست.
      </p>

      <CreateAdminDialog open={createOpen} onClose={() => setCreateOpen(false)} onDone={invalidate} />
      <ResetPasswordDialog target={resetTarget} onClose={() => setResetTarget(null)} onDone={invalidate} />
    </div>
  );
}

/** دیالوگ ایجاد ادمین جدید */
function CreateAdminDialog({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'SUPER_ADMIN'>('ADMIN');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const reset = () => {
    setUsername('');
    setName('');
    setRole('ADMIN');
    setPassword('');
    setError('');
  };

  const submit = async () => {
    setError('');
    if (username.trim().length < 4) return setError('نام کاربری باید حداقل ۴ نویسه باشد.');
    if (name.trim().length < 2) return setError('نام نمایشی را وارد کنید.');
    if (password.length < 8) return setError('رمز عبور باید حداقل ۸ نویسه باشد.');
    setPending(true);
    try {
      await createAdminAdmin({ username: username.trim(), name: name.trim(), role, password });
      toast({ description: 'ادمین جدید ساخته شد.' });
      onDone();
      reset();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>ایجاد ادمین جدید</DialogTitle>
          <DialogDescription>حساب ورود پنل مدیریت با نقش انتخابی.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">نام کاربری (موبایل)</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              dir="ltr"
              placeholder="09121234567"
              className="h-9 rounded-md"
              maxLength={40}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">نام نمایشی</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="مثلاً: مدیر محتوا"
              className="h-9 rounded-md"
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">نقش</Label>
            <div className="flex gap-1.5">
              {(['ADMIN', 'SUPER_ADMIN'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={cn(
                    'h-9 flex-1 rounded-[10px] border text-[11.5px] font-bold transition-colors',
                    role === r
                      ? 'border-primary-line bg-primary-soft text-primary'
                      : 'border-input bg-card text-secondary-foreground hover:bg-secondary/60',
                  )}
                >
                  {r === 'ADMIN' ? 'ادمین' : 'مدیر ارشد'}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[12px]">رمز عبور (حداقل ۸ نویسه)</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              dir="ltr"
              className="h-9 rounded-md"
              maxLength={64}
            />
          </div>
          {error && <p className="text-[11.5px] font-bold text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-9 rounded-lg" onClick={onClose}>
            انصراف
          </Button>
          <Button size="sm" className="h-9 rounded-lg" disabled={pending} onClick={submit}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
            ایجاد
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** دیالوگ تعیین مجدد رمز */
function ResetPasswordDialog({ target, onClose, onDone }: { target: AdminRow | null; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  const submit = async () => {
    if (!target) return;
    setError('');
    if (newPassword.length < 8) return setError('رمز عبور باید حداقل ۸ نویسه باشد.');
    setPending(true);
    try {
      await resetAdminAdminPassword(target.id, newPassword);
      toast({ description: `رمز «${target.name}» تغییر کرد.` });
      setNewPassword('');
      onDone();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) { setNewPassword(''); setError(''); onClose(); } }}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>تعیین مجدد رمز عبور</DialogTitle>
          <DialogDescription>
            رمز جدید برای «{target?.name}» (<span dir="ltr">{target?.username}</span>) تنظیم می‌شود.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-[12px]">رمز جدید (حداقل ۸ نویسه)</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              dir="ltr"
              className="h-9 rounded-md"
              maxLength={64}
            />
          </div>
          {error && <p className="text-[11.5px] font-bold text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" className="h-9 rounded-lg" onClick={onClose}>
            انصراف
          </Button>
          <Button size="sm" className="h-9 rounded-lg" disabled={pending} onClick={submit}>
            {pending ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            ذخیره
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
