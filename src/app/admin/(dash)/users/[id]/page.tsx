'use client';

/**
 * جزئیات کاربر (فاز A3) — پروفایل + آمار + آگهی‌ها + کیف پول + احراز هویت.
 *
 * عملیات: فعال/غیرفعال (حذف نرم)، نقش خریدار/فروشنده، شارژ/کسر دستی
 * کیف پول با دلیل (WalletAdjustment)، بازبینی مدارک احراز (تأیید/رد).
 */

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  BadgeCheck,
  Boxes,
  Loader2,
  Minus,
  Plus,
  Receipt,
  ShieldCheck,
  UserRound,
  Wallet,
} from 'lucide-react';
import {
  creditAdminUserWallet,
  fetchAdminUserDetail,
  reviewAdminVerification,
  setAdminUserActive,
  setAdminUserRoles,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { dateFa, priceFa, timeAgoFa, toFa } from '@/lib/format';

type TabKey = 'overview' | 'products' | 'wallet' | 'verification';

const STATUS_LABEL: Record<string, string> = {
  confirmed: 'تأییدشده',
  pending: 'در انتظار تأیید',
  rejected: 'رد شده',
  deleted: 'حذف‌شده',
};

/** جعبه آمار کوچک */
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[10px] bg-secondary/60 px-3 py-2.5">
      <span className="block text-[10px] text-muted-foreground">{label}</span>
      <b className="text-[13px]">{value}</b>
    </div>
  );
}

/** دیالوگ اصلاح کیف پول — شارژ/کسر با دلیل */
function WalletDialog({
  userId,
  balance,
  onClose,
}: {
  userId: string;
  balance: number;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<'charge' | 'deduct'>('charge');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const save = useMutation({
    mutationFn: () => {
      const n = Math.abs(parseInt(amount.replace(/[^\d]/g, ''), 10) || 0);
      return creditAdminUserWallet(userId, mode === 'charge' ? n : -n, reason.trim());
    },
    onSuccess: (d) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-user', userId] });
      toast({ description: `کیف پول اصلاح شد — موجودی جدید: ${priceFa(d.balance)}` });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const n = Math.abs(parseInt(amount.replace(/[^\d]/g, ''), 10) || 0);
    if (n <= 0) {
      setError('مبلغ معتبر وارد کنید.');
      return;
    }
    if (reason.trim().length < 3) {
      setError('دلیل اصلاح را بنویسید (برای کاربر نمایش داده می‌شود).');
      return;
    }
    save.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="اصلاح کیف پول">
      <button type="button" aria-label="بستن" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-lg">
        <div>
          <h2 className="text-sm font-extrabold">اصلاح کیف پول</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            موجودی فعلی: {priceFa(balance)} — اصلاح با دلیل در تاریخچه کاربر ثبت می‌شود.
          </p>
        </div>

        {/* شارژ / کسر */}
        <div className="grid grid-cols-2 gap-2">
          {(['charge', 'deduct'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={cn(
                'flex h-10 items-center justify-center gap-1.5 rounded-[10px] border text-[12.5px] font-bold transition-colors',
                mode === m
                  ? 'border-primary-line bg-primary-soft text-primary'
                  : 'border-input bg-card text-secondary-foreground hover:bg-secondary/60',
              )}
            >
              {m === 'charge' ? <Plus size={14} /> : <Minus size={14} />}
              {m === 'charge' ? 'شارژ دستی' : 'کسر دستی'}
            </button>
          ))}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wa-amount">مبلغ (تومان)</Label>
          <Input
            id="wa-amount"
            inputMode="numeric"
            dir="ltr"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="مثلاً 500000"
            maxLength={12}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="wa-reason">دلیل (برای کاربر نمایش داده می‌شود)</Label>
          <Textarea
            id="wa-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثلاً: جبران واریز حضوری شعبه"
            maxLength={200}
            className="min-h-20"
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="submit" className="flex-1 rounded-md" disabled={save.isPending}>
            {save.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
            اعمال اصلاح
          </Button>
          <Button type="button" variant="outline" className="rounded-md" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </form>
    </div>
  );
}

/** دیالوگ رد مدارک احراز با دلیل */
function RejectDialog({ orderId, onClose }: { orderId: string; onClose: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const reject = useMutation({
    mutationFn: () => reviewAdminVerification(orderId, false, reason.trim()),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-user'] });
      toast({ description: 'درخواست احراز رد شد — دلیل برای کاربر ثبت شد.' });
      onClose();
    },
    onError: (err: Error) => setError(err.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (reason.trim().length < 3) {
      setError('دلیل رد را بنویسید.');
      return;
    }
    reject.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="رد مدارک احراز">
      <button type="button" aria-label="بستن" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-lg">
        <div>
          <h2 className="text-sm font-extrabold">رد مدارک احراز هویت</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">دلیل برای کاربر نمایش داده می‌شود تا مدارک درست را دوباره بفرستد.</p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="rj-reason">دلیل رد</Label>
          <Textarea
            id="rj-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="مثلاً: تصویر کارت ملی ناخواناست"
            maxLength={300}
            className="min-h-20"
            autoFocus
          />
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="submit" variant="destructive" className="flex-1 rounded-md" disabled={reject.isPending}>
            {reject.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
            رد مدارک
          </Button>
          <Button type="button" variant="outline" className="rounded-md" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id ?? '';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [walletOpen, setWalletOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-user', id],
    queryFn: () => fetchAdminUserDetail(id),
    enabled: Boolean(id),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-user', id] });

  const toggleActive = useMutation({
    mutationFn: (active: boolean) => setAdminUserActive(id, active),
    onSuccess: (_d, active) => {
      invalidate();
      toast({
        description: active
          ? 'حساب کاربر فعال شد.'
          : 'حساب کاربر غیرفعال شد — ورود مسدود، نشست‌ها باطل و محتوایش پنهان است.',
      });
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  const toggleRole = useMutation({
    mutationFn: (input: { isBuyer?: boolean; isSeller?: boolean }) => setAdminUserRoles(id, input),
    onSuccess: () => {
      invalidate();
      toast({ description: 'نقش کاربر به‌روز شد.' });
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  const approve = useMutation({
    mutationFn: () => reviewAdminVerification(verificationOrderId!, true),
    onSuccess: () => {
      invalidate();
      toast({ description: 'هویت کاربر تأیید شد — نشان احراز روی پروفایل و آگهی‌ها فعال می‌شود.' });
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-3">
        <Skeleton className="h-8 w-40 rounded-md" />
        <Skeleton className="h-28 rounded-lg" />
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 rounded-lg border bg-card p-10 text-center">
        <p className="text-sm text-muted-foreground">{error instanceof Error ? error.message : 'کاربر یافت نشد.'}</p>
        <Link href="/admin/users" className="text-xs font-bold text-primary hover:underline">
          ← بازگشت به لیست کاربران
        </Link>
      </div>
    );
  }

  const u = data.user;
  const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ') || 'بی‌نام';
  const verificationOrderId = data.verification.orderId ?? null;

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* بازگشت */}
      <Link
        href="/admin/users"
        className="inline-flex items-center gap-1.5 text-[12px] font-bold text-primary hover:underline"
      >
        <ArrowRight size={14} /> بازگشت به لیست کاربران
      </Link>

      {/* سربرگ کاربر */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-primary-soft text-lg font-extrabold text-primary">
            {(u.first_name || u.user_name || '؟').slice(0, 1).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-extrabold">{fullName}</h1>
              {u.is_verified ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-verified/10 px-1.5 py-0.5 text-[9px] font-bold text-verified">
                  <BadgeCheck size={10} /> احرازشده
                </span>
              ) : data.verification.status === 'pending' ? (
                <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">احراز در بررسی</span>
              ) : null}
              {!u.is_active && (
                <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">غیرفعال</span>
              )}
              {u.role === 'ADMIN' && (
                <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">ادمین سیستم</span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span dir="ltr" className="font-bold text-foreground/80">{u.phone}</span>
              <span dir="ltr">@{u.user_name}</span>
              {u.city || u.province ? <span>{[u.province, u.city].filter(Boolean).join('، ')}</span> : null}
              <span>عضویت: {dateFa(u.created_at)}</span>
              <span>آخرین ورود: {u.last_login_at ? timeAgoFa(u.last_login_at) : 'هرگز'}</span>
            </div>
          </div>

          {/* عملیات سریع */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              className="rounded-[10px]"
              onClick={() => setWalletOpen(true)}
            >
              <Wallet size={14} /> اصلاح کیف پول
            </Button>
            <Link
              href={`/admin/products?sellerId=${u.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-input bg-card px-3 text-[12px] font-bold text-secondary-foreground transition-colors hover:border-primary-line hover:bg-primary-soft hover:text-primary"
            >
              <Boxes size={14} /> آگهی‌های این کاربر
            </Link>
            <Link
              href={`/admin/buy-requests?userId=${u.id}`}
              className="inline-flex h-8 items-center gap-1.5 rounded-[10px] border border-input bg-card px-3 text-[12px] font-bold text-secondary-foreground transition-colors hover:border-primary-line hover:bg-primary-soft hover:text-primary"
            >
              درخواست‌های خرید این کاربر
            </Link>
            <Button
              size="sm"
              variant={u.is_active ? 'outline' : 'default'}
              className="rounded-[10px]"
              disabled={toggleActive.isPending}
              onClick={() => toggleActive.mutate(!u.is_active)}
            >
              {toggleActive.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              {u.is_active ? 'غیرفعال‌سازی حساب' : 'فعال‌سازی حساب'}
            </Button>
          </div>
        </div>

        {/* نقش‌ها — سوییچ سریع */}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-3.5">
          <span className="text-[11px] font-bold text-muted-foreground">نقش‌ها:</span>
          {(
            [
              { key: 'is_buyer', label: 'خریدار', value: u.is_buyer },
              { key: 'is_seller', label: 'فروشنده', value: u.is_seller },
            ] as const
          ).map((r) => (
            <button
              key={r.key}
              type="button"
              disabled={toggleRole.isPending}
              onClick={() => toggleRole.mutate({ [r.key]: !r.value } as { isBuyer?: boolean; isSeller?: boolean })}
              className={cn(
                'rounded-[10px] border px-3 py-1 text-[11.5px] font-bold transition-colors',
                r.value
                  ? 'border-primary-line bg-primary-soft text-primary'
                  : 'border-input bg-card text-muted-foreground hover:bg-secondary/60',
              )}
            >
              {r.label}
            </button>
          ))}
          <span className="ms-auto text-[12px] font-extrabold text-primary">{priceFa(u.wallet_balance)}</span>
        </div>
      </div>

      {/* تب‌ها */}
      <Tabs defaultValue="overview" dir="rtl">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">نمای کلی</TabsTrigger>
          <TabsTrigger value="products">آگهی‌ها ({toFa(Object.values(data.stats.products).reduce((a, b) => a + b, 0))})</TabsTrigger>
          <TabsTrigger value="wallet">کیف پول</TabsTrigger>
          <TabsTrigger value="verification">احراز هویت</TabsTrigger>
        </TabsList>

        {/* نمای کلی */}
        <TabsContent value="overview" className="mt-3">
          <div className="rounded-lg border bg-card p-4">
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <Stat label="آگهی تأییدشده" value={toFa(data.stats.products.confirmed)} />
              <Stat label="در انتظار تأیید" value={toFa(data.stats.products.pending)} />
              <Stat label="رد شده" value={toFa(data.stats.products.rejected)} />
              <Stat label="درخواست خرید" value={toFa(data.stats.buy_requests)} />
              <Stat label="شارژ در انتظار" value={toFa(data.stats.charges.pending)} />
              <Stat label="شارژ تأییدشده" value={toFa(data.stats.charges.approved)} />
              <Stat label="سفارش نردبان" value={toFa(data.stats.ladder_orders)} />
              <Stat label="رمز عبور" value={u.has_password ? 'تعیین شده' : 'ندارد'} />
            </div>

            {u.business_desc ? (
              <div className="mt-4 border-t pt-3.5">
                <span className="mb-1.5 block text-[11px] font-bold text-muted-foreground">توضیحات کسب‌وکار</span>
                <p className="text-[12.5px] leading-7">{u.business_desc}</p>
              </div>
            ) : null}

            {Object.keys(u.profile ?? {}).length > 0 ? (
              <div className="mt-4 border-t pt-3.5">
                <span className="mb-1.5 block text-[11px] font-bold text-muted-foreground">پروفایل کسب‌وکار</span>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] sm:grid-cols-3">
                  {Object.entries(u.profile as Record<string, unknown>)
                    .filter(([, v]) => v != null && v !== '')
                    .slice(0, 12)
                    .map(([k, v]) => (
                      <div key={k} className="min-w-0">
                        <dt className="truncate text-[10px] text-muted-foreground">{k}</dt>
                        <dd className="truncate font-medium">{String(v)}</dd>
                      </div>
                    ))}
                </dl>
              </div>
            ) : null}
          </div>
        </TabsContent>

        {/* آگهی‌ها */}
        <TabsContent value="products" className="mt-3">
          <div className="overflow-hidden rounded-lg border bg-card">
            {data.products.length === 0 ? (
              <div className="grid place-items-center gap-2 p-10 text-center text-muted-foreground">
                <Boxes size={26} className="opacity-40" />
                <p className="text-sm">این کاربر آگهی ثبت نکرده است.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-secondary/40 text-[11px] text-muted-foreground">
                    <th className="px-3 py-2.5 text-start font-bold">آگهی</th>
                    <th className="px-3 py-2.5 text-start font-bold">وضعیت</th>
                    <th className="px-3 py-2.5 text-start font-bold">موجودی</th>
                    <th className="px-3 py-2.5 text-start font-bold">کف قیمت</th>
                    <th className="px-3 py-2.5 text-start font-bold">بازدید</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((p) => (
                    <tr key={p.id} className="border-b transition-colors last:border-0 hover:bg-secondary/30">
                      <td className="max-w-[220px] px-3 py-2.5">
                        <span className="line-clamp-1 font-medium">{p.isLadder ? 'نردبان · ' : ''}{p.productName}</span>
                        <span className="text-[10px] text-muted-foreground">{timeAgoFa(p.updatedAt)}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className={cn(
                            'rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                            p.status === 'confirmed' && 'bg-emerald-500/10 text-emerald-600',
                            p.status === 'pending' && 'bg-amber-500/10 text-amber-600',
                            p.status === 'rejected' && 'bg-destructive/10 text-destructive',
                            p.status === 'deleted' && 'bg-secondary text-muted-foreground',
                          )}
                        >
                          {STATUS_LABEL[p.status] ?? p.status}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-[11.5px]">{toFa(p.stock)} {p.unit}</td>
                      <td className="px-3 py-2.5 text-[11.5px] font-bold">{p.minSalePrice > 0 ? priceFa(p.minSalePrice) : 'تماس'}</td>
                      <td className="px-3 py-2.5 text-[11.5px]">{toFa(p.viewCount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <p className="border-t bg-secondary/20 px-3 py-2 text-center text-[10px] text-muted-foreground">
              ۱۰ آگهی اخیر — مدیریت کامل آگهی‌ها در فاز A4 فعال می‌شود.
            </p>
          </div>
        </TabsContent>

        {/* کیف پول */}
        <TabsContent value="wallet" className="mt-3">
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="flex items-center justify-between gap-2 border-b p-3">
              <div className="flex items-center gap-2">
                <Receipt size={15} className="text-muted-foreground" />
                <span className="text-[12.5px] font-extrabold">تراکنش‌ها (۱۵ مورد اخیر)</span>
              </div>
              <Button size="sm" className="rounded-[10px]" onClick={() => setWalletOpen(true)}>
                <Plus size={14} /> اصلاح جدید
              </Button>
            </div>
            {data.transactions.length === 0 ? (
              <div className="grid place-items-center gap-2 p-10 text-center text-muted-foreground">
                <Wallet size={26} className="opacity-40" />
                <p className="text-sm">تراکنشی ثبت نشده است.</p>
              </div>
            ) : (
              <ul>
                {data.transactions.map((t) => (
                  <li key={t.id} className="flex items-center gap-3 border-b px-3 py-2.5 text-sm last:border-0 hover:bg-secondary/30">
                    <span
                      className={cn(
                        'grid size-7 shrink-0 place-items-center rounded-full',
                        t.incoming ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive',
                      )}
                    >
                      {t.incoming ? <Plus size={13} /> : <Minus size={13} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[12.5px] font-medium">{t.title}</p>
                      <p className="text-[10px] text-muted-foreground">{timeAgoFa(t.at)}</p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold',
                        t.type === 'card'
                          ? 'bg-primary/10 text-primary'
                          : t.type === 'ladder'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-secondary text-muted-foreground',
                      )}
                    >
                      {t.type === 'card' ? 'کارت به کارت' : t.type === 'ladder' ? 'نردبان' : 'اصلاح'}
                    </span>
                    <span className={cn('shrink-0 text-[12.5px] font-extrabold', t.incoming ? 'text-emerald-600' : 'text-destructive')}>
                      {t.incoming ? '+' : '−'}{priceFa(t.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </TabsContent>

        {/* احراز هویت */}
        <TabsContent value="verification" className="mt-3">
          <div className="rounded-lg border bg-card p-4">
            {data.verification.status === 'none' ? (
              <div className="grid place-items-center gap-2 p-8 text-center text-muted-foreground">
                <ShieldCheck size={28} className="opacity-40" />
                <p className="text-sm">این کاربر هنوز درخواست احراز هویت ثبت نکرده است.</p>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-bold',
                        data.verification.status === 'approved' && 'bg-emerald-500/10 text-emerald-600',
                        data.verification.status === 'pending' && 'bg-amber-500/10 text-amber-600',
                        data.verification.status === 'rejected' && 'bg-destructive/10 text-destructive',
                      )}
                    >
                      {data.verification.status === 'approved'
                        ? 'تأییدشده'
                        : data.verification.status === 'pending'
                          ? 'در انتظار بررسی'
                          : 'رد شده'}
                    </span>
                    {data.verification.submittedAt ? (
                      <span className="text-[11px] text-muted-foreground">ارسال: {dateFa(data.verification.submittedAt)}</span>
                    ) : null}
                    {data.verification.reviewedAt ? (
                      <span className="text-[11px] text-muted-foreground">بازبینی: {dateFa(data.verification.reviewedAt)}</span>
                    ) : null}
                  </div>

                  {data.verification.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        className="rounded-[10px]"
                        disabled={approve.isPending}
                        onClick={() => approve.mutate()}
                      >
                        {approve.isPending ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                        تأیید هویت
                      </Button>
                      <Button size="sm" variant="destructive" className="rounded-[10px]" onClick={() => setRejectOpen(true)}>
                        رد مدارک
                      </Button>
                    </div>
                  )}
                </div>

                {data.verification.rejectionReason ? (
                  <p className="mt-3 rounded-[10px] bg-destructive/5 px-3 py-2 text-[11.5px] leading-6 text-destructive">
                    دلیل رد: {data.verification.rejectionReason}
                  </p>
                ) : null}

                {/* مدارک */}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {(['nationalCard', 'selfie'] as const).map((key) => {
                    const doc = data.verification.docs[key];
                    const label = key === 'nationalCard' ? 'کارت ملی' : 'سلفی';
                    return (
                      <div key={key} className="overflow-hidden rounded-[10px] border">
                        <div className="flex items-center justify-between bg-secondary/40 px-3 py-2">
                          <span className="text-[11px] font-bold">{label}</span>
                          {doc ? (
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[10px] font-bold text-primary hover:underline"
                            >
                              اندازه کامل ↗
                            </a>
                          ) : null}
                        </div>
                        {doc ? (
                           
                          <img
                            src={doc.thumbUrl ?? doc.url}
                            alt={label}
                            loading="lazy"
                            className="h-44 w-full bg-secondary object-cover"
                          />
                        ) : (
                          <div className="grid h-44 place-items-center bg-secondary/30 text-[11px] text-muted-foreground">
                            مدرکی ثبت نشده
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {walletOpen ? <WalletDialog userId={id} balance={u.wallet_balance} onClose={() => setWalletOpen(false)} /> : null}
      {rejectOpen && verificationOrderId ? (
        <RejectDialog orderId={verificationOrderId} onClose={() => setRejectOpen(false)} />
      ) : null}
    </div>
  );
}
