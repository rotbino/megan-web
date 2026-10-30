'use client';

/**
 * بسته‌ها و کمپین‌ها (admin/packages) — سه تب (خواسته مالک ۳۱-۱۰):
 *  • سفارش‌ها: صف بازبینی فیش‌های خرید بسته (تأیید → فعال/تمدید؛ رد → دلیل)
 *  • بسته‌ها: CRUD کامل — قیمت/مدت/عنوان/ویژگی‌ها همه قابل تعریف ادمین
 *  • کمپین‌ها: کمپین زمانی (٪ ثابت تا پایان) و تعدادی (پله‌ای: ۱۰ نفر اول
 *    ۷۰٪…) + تغییر دستی درصد جاری + آمار جذب هر کمپین/بسته
 */

import { useEffect, useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import {
  CalendarClock,
  Check,
  Crown,
  Layers,
  Loader2,
  Megaphone,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import {
  deleteAdminCampaign,
  deleteAdminPlan,
  fetchAdminCampaigns,
  fetchAdminPackageOrders,
  fetchAdminPlans,
  reviewAdminPackageOrder,
  setAdminCampaignDiscount,
  setAdminCampaignPurchaseCount,
  upsertAdminCampaign,
  upsertAdminPlan,
  type AdminCampaignInput,
  type AdminCampaignRow,
  type AdminPackageOrderRow,
  type AdminPlanInput,
  type AdminPlanRow,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { dateFa, priceFa, timeAgoFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

type MainTab = 'orders' | 'plans' | 'campaigns';
type StatusKey = 'pending' | 'approved' | 'rejected';

const STATUS_TABS: Array<{ key: StatusKey | 'all'; label: string }> = [
  { key: 'pending', label: 'در انتظار بررسی' },
  { key: 'approved', label: 'تأییدشده' },
  { key: 'rejected', label: 'ردشده' },
];

const MAIN_TABS: Array<{ key: MainTab; label: string }> = [
  { key: 'orders', label: 'سفارش‌های بسته' },
  { key: 'plans', label: 'مدیریت بسته‌ها' },
  { key: 'campaigns', label: 'کمپین‌های فروش' },
];

function StatusChip({ status }: { status: StatusKey }) {
  if (status === 'pending') {
    return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">در انتظار</span>;
  }
  if (status === 'approved') {
    return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">تأییدشده</span>;
  }
  return <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">ردشده</span>;
}

const planLabel = (months: number) =>
  months === 2 ? 'دو ماهه' : months === 6 ? 'شش ماهه' : months === 12 ? 'یک‌ساله' : `${toFa(months)} ماهه`;

export default function AdminPackagesPage() {
  const [mainTab, setMainTab] = useState<MainTab>('orders');

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-amber-500/10 text-amber-600">
            <Crown size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">بسته‌ها و کمپین‌ها</h1>
            <p className="text-[11px] text-muted-foreground">
              بازبینی سفارش‌ها + تعریف بسته/ویژگی‌ها + کمپین‌های زمانی و تعدادی
            </p>
          </div>
        </div>
      </div>

      {/* تب‌های اصلی */}
      <div className="flex flex-wrap gap-1.5">
        {MAIN_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setMainTab(t.key)}
            className={cn(
              'h-9 rounded-[10px] border px-3.5 text-[12px] font-bold transition-colors',
              mainTab === t.key
                ? 'border-primary-line bg-primary-soft text-primary'
                : 'border-input bg-card text-secondary-foreground hover:bg-secondary/60',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mainTab === 'orders' && <OrdersTab />}
      {mainTab === 'plans' && <PlansTab />}
      {mainTab === 'campaigns' && <CampaignsTab />}
    </div>
  );
}

// ═══ تب ۱: سفارش‌ها (صف بازبینی فیش‌ها) ═══════════════════════════════════

function OrdersTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusKey | 'all'>('pending');
  const [page, setPage] = useState(1);
  const [reviewTarget, setReviewTarget] = useState<AdminPackageOrderRow | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-packages', status, page],
    queryFn: () => fetchAdminPackageOrders(status === 'all' ? undefined : status, page, 20),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const review = useMutation({
    mutationFn: (input: { orderId: string; approve: boolean; reason?: string }) =>
      reviewAdminPackageOrder(input.orderId, input.approve, input.reason),
    onSuccess: (_d, input) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
      toast({
        description: input.approve
          ? 'بسته اشتراک کاربر تأیید و فعال شد.'
          : 'سفارش بسته رد شد.',
      });
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  const items = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.perPage ?? 20)));

  return (
    <div className="space-y-4">
      {/* تب‌های وضعیت */}
      <div className="flex flex-wrap items-center gap-1.5">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setStatus(t.key); setPage(1); }}
            className={cn(
              'h-8 rounded-[10px] border px-3 text-[11.5px] font-bold transition-colors',
              status === t.key
                ? 'border-primary-line bg-primary-soft text-primary'
                : 'border-input bg-card text-secondary-foreground hover:bg-secondary/60',
            )}
          >
            {t.label}
          </button>
        ))}
        <span className="ms-auto flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {isFetching && !isLoading ? <Loader2 size={13} className="animate-spin" /> : null}
          {data ? `${toFa(data.total)} سفارش` : ''}
        </span>
      </div>

      {/* لیست */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-lg border bg-card p-12 text-center text-muted-foreground">
          <Crown size={28} className="opacity-40" />
          <p className="text-sm">سفارشی در این وضعیت نیست.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((o) => (
            <div key={o.id} className="rounded-lg border bg-card p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-amber-500/10 text-amber-600">
                    <Crown size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold">
                      <StatusChip status={o.status} />
                      <span dir="ltr">{o.user.phone}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {o.user.first_name || o.user.last_name
                        ? `${o.user.first_name} ${o.user.last_name}`.trim()
                        : o.user.user_name || 'بدون نام'}{' '}
                      · بسته {planLabel(o.months)}
                      {(o.discountPercent ?? 0) > 0 && o.baseAmount ? (
                        <span className="text-red-600">
                          {' '}({priceFa(o.amount)} با {toFa(o.discountPercent ?? 0)}٪ تخفیف —{' '}
                          <span className="line-through">{priceFa(o.baseAmount)}</span>
                          {o.campaignTitle ? ` ${o.campaignTitle}` : ''})
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[11px] text-muted-foreground">{timeAgoFa(o.createdAt)}</p>
                    {o.status === 'approved' && o.expiresAt && (
                      <p className="mt-0.5 text-[11px] text-emerald-700">اعتبار تا {dateFa(o.expiresAt)}</p>
                    )}
                    {o.status === 'rejected' && o.rejectionReason && (
                      <p className="mt-1 rounded-md bg-rose-500/10 px-2 py-1 text-[11px] text-rose-700">
                        دلیل رد: {o.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-end">
                    <p className="text-[13px] font-extrabold tabular-nums">{priceFa(o.amount)}</p>
                    <p className="text-[10px] text-muted-foreground">اشتراک {planLabel(o.months)}</p>
                  </div>
                  {o.status === 'pending' && (
                    <Button size="sm" className="h-9 rounded-lg" onClick={() => setReviewTarget(o)}>
                      بازبینی
                    </Button>
                  )}
                  {o.user.id && (
                    <Link
                      href={`/admin/users/${o.user.id}`}
                      className="text-[11px] font-bold text-primary hover:underline"
                    >
                      پروفایل ←
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* صفحه‌بندی */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            قبلی
          </Button>
          <span className="text-[12px] font-bold tabular-nums text-muted-foreground">
            صفحه {toFa(page)} از {toFa(pageCount)}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
            بعدی
          </Button>
        </div>
      )}

      <ReviewDialog
        target={reviewTarget}
        pending={review.isPending}
        onClose={() => setReviewTarget(null)}
        onReview={(approve, reason) => {
          if (reviewTarget) review.mutate({ orderId: reviewTarget.id, approve, reason });
        }}
      />
    </div>
  );
}

/** دیالوگ بازبینی — پیش‌نمایش فیش + تأیید/رد با دلیل */
function ReviewDialog({
  target,
  pending,
  onClose,
  onReview,
}: {
  target: AdminPackageOrderRow | null;
  pending: boolean;
  onClose: () => void;
  onReview: (approve: boolean, reason?: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const close = () => {
    setRejecting(false);
    setReason('');
    onClose();
  };

  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>بازبینی فیش خرید بسته</DialogTitle>
          <DialogDescription>
            {target ? (
              <>
                <span dir="ltr">{target.user.phone}</span> — واریز {priceFa(target.amount)} → فعال‌سازی اشتراک{' '}
                {planLabel(target.months)}
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        {target?.receipt && (
          <a
            href={target.receipt.url}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-lg border bg-secondary/30"
          >
            <div className="relative aspect-[16/10] w-full">
              <Image
                src={target.receipt.thumbUrl || target.receipt.url}
                alt="فیش واریزی"
                fill
                sizes="(min-width: 640px) 448px, 100vw"
                className="object-cover"
                unoptimized
              />
            </div>
            <p className="border-t bg-card px-3 py-1.5 text-center text-[11px] font-bold text-primary">
              برای بزرگ‌نمایی کلیک کنید
            </p>
          </a>
        )}

        {rejecting ? (
          <div className="space-y-2">
            <Label className="text-[12px]">دلیل رد (الزامی — به کاربر نمایش داده می‌شود)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثلاً: فیش خوانا نیست — دوباره ارسال کنید."
              className="min-h-20 rounded-md text-[12.5px]"
              maxLength={500}
            />
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          {rejecting ? (
            <>
              <Button variant="outline" size="sm" className="h-9 rounded-lg" onClick={() => setRejecting(false)}>
                بازگشت
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-9 rounded-lg"
                disabled={pending || reason.trim().length < 3}
                onClick={() => onReview(false, reason.trim())}
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                ثبت رد
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                disabled={pending}
                onClick={() => setRejecting(true)}
              >
                <X size={14} />
                رد سفارش
              </Button>
              <Button
                size="sm"
                className="h-9 rounded-lg"
                disabled={pending}
                onClick={() => onReview(true)}
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                تأیید و فعال‌سازی بسته
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══ تب ۲: مدیریت بسته‌ها (CRUD — خواسته مالک ۳۱-۱۰) ═════════════════════

const PAKAGE_TYPE_LABELS: Record<number, string> = {
  1: '۱ — سطح دوماهه',
  2: '۲ — سطح شش‌ماهه',
  3: '۳ — سطح یک‌ساله',
};

function PlansTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminPlanInput | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['admin-plans'],
    queryFn: fetchAdminPlans,
  });

  const save = useMutation({
    mutationFn: upsertAdminPlan,
    onSuccess: (_d, input) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      toast({ description: input.id ? 'بسته به‌روزرسانی شد.' : 'بسته جدید ساخته شد.' });
      setEditing(null);
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: deleteAdminPlan,
    onSuccess: (d) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-plans'] });
      toast({
        description: d.deactivated
          ? 'این بسته سفارش دارد — به‌جای حذف، غیرفعال شد (تاریخچه سفارش‌ها سالم ماند).'
          : 'بسته حذف شد.',
      });
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11.5px] leading-5 text-muted-foreground">
          قیمت و ویژگی‌های بسته‌ها را خودتان تعیین کنید — تغییرات فوراً در صفحه «بسته‌های اشتراک» کاربران اعمال می‌شود.
        </p>
        <Button
          size="sm"
          className="rounded-[10px]"
          onClick={() =>
            setEditing({
              key: '',
              title: '',
              months: 2,
              amount: 398_000,
              pakageType: 1,
              bestSeller: false,
              features: [],
              isActive: true,
              sortOrder: (items.length ?? 0) + 1,
            })
          }
        >
          <Plus size={14} /> بسته جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((p) => (
            <div
              key={p.id}
              className={cn('rounded-lg border bg-card p-3.5', !p.isActive && 'opacity-60')}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary-soft text-primary">
                    <Layers size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold">
                      اشتراک {p.title}
                      {p.bestSeller && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold text-amber-600">
                          <Sparkles size={9} /> پرفروش
                        </span>
                      )}
                      {!p.isActive && (
                        <span className="rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">غیرفعال</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {priceFa(p.amount)} پایه · {planLabel(p.months)} · سطح {toFa(p.pakageType)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      جذب: <b className="text-foreground">{toFa(p.soldCount)}</b> فروش
                      {p.orderCount !== p.soldCount ? ` (${toFa(p.orderCount)} سفارش)` : ''} · {toFa(p.features.length)} ویژگی
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-[10px] text-[11.5px]"
                    onClick={() =>
                      setEditing({
                        id: p.id,
                        key: p.key,
                        title: p.title,
                        months: p.months,
                        amount: p.amount,
                        pakageType: p.pakageType,
                        bestSeller: p.bestSeller,
                        features: p.features,
                        isActive: p.isActive,
                        sortOrder: p.sortOrder,
                      })
                    }
                  >
                    <Pencil size={13} /> ویرایش
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-[10px] text-[11.5px] text-muted-foreground hover:text-destructive"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (confirm(`بسته «${p.title}» حذف شود؟ (اگر سفارش دارد فقط غیرفعال می‌شود)`)) {
                        remove.mutate(p.id);
                      }
                    }}
                  >
                    <Trash2 size={13} /> حذف
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <PlanEditDialog
        input={editing}
        pending={save.isPending}
        onClose={() => setEditing(null)}
        onSave={(v) => save.mutate(v)}
      />
    </div>
  );
}

/** دیالوگ ساخت/ویرایش بسته — قیمت/مدت/سطح/ویژگی‌ها */
function PlanEditDialog({
  input,
  pending,
  onClose,
  onSave,
}: {
  input: AdminPlanInput | null;
  pending: boolean;
  onClose: () => void;
  onSave: (v: AdminPlanInput) => void;
}) {
  const [form, setForm] = useState<AdminPlanInput | null>(null);

  // فرم تازه در هر باز شدن
  useEffect(() => {
    setForm(input);
  }, [input]);

  return (
    <Dialog open={Boolean(form)} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{form?.id ? `ویرایش بسته «${form.title}»` : 'بسته جدید'}</DialogTitle>
          <DialogDescription>
            قیمت پایه، مدت، سطح و ویژگی‌ها را تعیین کنید — قیمت نهایی با تخفیف کمپین جاری محاسبه می‌شود.
          </DialogDescription>
        </DialogHeader>

        {form && (
          <div className="max-h-[65vh] space-y-3 overflow-y-auto pe-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">کلید (انگلیسی، یکتا)</Label>
                <Input
                  dir="ltr"
                  value={form.key}
                  onChange={(e) => setForm({ ...form, key: e.target.value })}
                  placeholder="مثلاً p3m"
                  className="h-9 rounded-md"
                  maxLength={20}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">عنوان</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="مثلاً سه ماهه"
                  className="h-9 rounded-md"
                  maxLength={40}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">مدت (ماه)</Label>
                <Input
                  dir="ltr"
                  type="number"
                  min={1}
                  max={36}
                  value={form.months}
                  onChange={(e) => setForm({ ...form, months: Number(e.target.value) })}
                  className="h-9 rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">قیمت پایه (تومان)</Label>
                <Input
                  dir="ltr"
                  type="number"
                  min={10_000}
                  step={1000}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
                  className="h-9 rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">سطح بسته</Label>
                <select
                  value={form.pakageType}
                  onChange={(e) => setForm({ ...form, pakageType: Number(e.target.value) })}
                  className="h-9 w-full rounded-md border border-input bg-card px-2 text-[13px]"
                >
                  {[1, 2, 3].map((t) => (
                    <option key={t} value={t}>{PAKAGE_TYPE_LABELS[t]}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">ترتیب نمایش</Label>
                <Input
                  dir="ltr"
                  type="number"
                  min={0}
                  value={form.sortOrder ?? 0}
                  onChange={(e) => setForm({ ...form, sortOrder: Number(e.target.value) })}
                  className="h-9 rounded-md"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-4 rounded-md border p-3">
              <label className="flex cursor-pointer items-center gap-2 text-[12px] font-bold">
                <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
                نمایش در صفحه بسته‌ها
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-[12px] font-bold">
                <Switch checked={form.bestSeller} onCheckedChange={(v) => setForm({ ...form, bestSeller: v })} />
                برچسب «پرفروش‌ترین»
              </label>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px]">ویژگی‌های بسته (هر خط یک ویژگی — ردیف‌های کارت قیمت)</Label>
              <Textarea
                value={form.features.join('\n')}
                onChange={(e) => setForm({ ...form, features: e.target.value.split('\n') })}
                placeholder={'ثبت تعداد نامحدود محصول\nدسترسی نامحدود به همه خریداران\n…'}
                className="min-h-32 rounded-md text-[12.5px] leading-6"
                maxLength={2500}
              />
              <p className="text-[10px] text-muted-foreground">{toFa(form.features.length)} ویژگی</p>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-lg" onClick={onClose}>
            انصراف
          </Button>
          <Button
            size="sm"
            className="h-9 rounded-lg"
            disabled={
              pending ||
              !form ||
              !form.key.trim() ||
              !form.title.trim() ||
              form.months < 1 ||
              form.amount < 10_000
            }
            onClick={() => form && onSave({ ...form, key: form.key.trim().toLowerCase(), title: form.title.trim() })}
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            ذخیره بسته
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══ تب ۳: کمپین‌های فروش (خواسته مالک ۳۱-۱۰) ═══════════════════════════

function CampaignsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<AdminCampaignInput | null>(null);
  const [discountTarget, setDiscountTarget] = useState<AdminCampaignRow | null>(null);
  const [manualPercent, setManualPercent] = useState('');
  const [countTarget, setCountTarget] = useState<AdminCampaignRow | null>(null);
  const [manualCount, setManualCount] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: fetchAdminCampaigns,
    refetchInterval: 60_000,
  });

  const save = useMutation({
    mutationFn: upsertAdminCampaign,
    onSuccess: (_d, input) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      toast({ description: input.id ? 'کمپین به‌روزرسانی شد.' : 'کمپین جدید ساخته شد.' });
      setEditing(null);
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  const remove = useMutation({
    mutationFn: deleteAdminCampaign,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      toast({ description: 'کمپین حذف شد.' });
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  const setDiscount = useMutation({
    mutationFn: (input: { id: string; manualDiscountPercent: number | null }) =>
      setAdminCampaignDiscount(input.id, input.manualDiscountPercent),
    onSuccess: (d) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      toast({
        description:
          d.manualDiscountPercent == null
            ? `درصد جاری به محاسبه خودکار پله‌ای برگشت (${toFa(d.currentPercent)}٪).`
            : `درصد تخفیف جاری کمپین روی ${toFa(d.currentPercent)}٪ ثبت شد.`,
      });
      setDiscountTarget(null);
      setManualPercent('');
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  const setCount = useMutation({
    mutationFn: (input: { id: string; manualPurchaseCount: number | null }) =>
      setAdminCampaignPurchaseCount(input.id, input.manualPurchaseCount),
    onSuccess: (d) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      const spot =
        d.currentTier && d.currentTier.to != null
          ? ` — تخفیف ${toFa(d.currentTier.percent)}٪ فقط برای ${toFa(d.currentTier.spotsLeft ?? 0)} نفر دیگر`
          : d.currentTier
            ? ` — از نفر ${toFa(d.currentTier.from)} به بعد: ${toFa(d.currentTier.percent)}٪ تا پایان`
            : '';
      toast({
        description:
          d.manualPurchaseCount == null
            ? `شمار خریداران به حالت واقعی برگشت (${toFa(d.purchaseCount)} نفر).${spot}`
            : `${toFa(d.effectiveCount)} نفر خریدن نمایش داده می‌شود.${spot}`,
      });
      setCountTarget(null);
      setManualCount('');
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  const items = data?.items ?? [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11.5px] leading-5 text-muted-foreground">
          کمپین زمانی = درصد ثابت تا تاریخ پایان؛ کمپین تعدادی = پله‌ای بر اساس شمار خریداران. عنوان و شعار
          کمپین فعال، بالای بسته‌ها در صفحه کاربران نمایش داده می‌شود.
        </p>
        <Button
          size="sm"
          className="rounded-[10px]"
          onClick={() =>
            setEditing({
              title: '',
              description: '',
              type: 'time',
              discountPercent: 50,
              finalPercent: 30,
              manualPurchaseCount: null,
              isActive: true,
              tiers: [{ from: 1, to: 10, percent: 70 }],
            })
          }
        >
          <Plus size={14} /> کمپین جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-lg border bg-card p-12 text-center text-muted-foreground">
          <Megaphone size={28} className="opacity-40" />
          <p className="text-sm">هنوز کمپینی تعریف نشده است.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((c) => (
            <div
              key={c.id}
              className={cn(
                'rounded-lg border bg-card p-3.5',
                c.running ? 'border-red-200 bg-red-50/40' : !c.isActive ? 'opacity-60' : '',
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cn(
                      'grid size-10 shrink-0 place-items-center rounded-md',
                      c.running ? 'bg-red-600 text-white' : 'bg-secondary text-muted-foreground',
                    )}
                  >
                    <Megaphone size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold">
                      {c.title}
                      <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {toFa(c.currentPercent)}٪ جاری
                      </span>
                      {c.running ? (
                        <span className="rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">در حال اجرا</span>
                      ) : c.expired ? (
                        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">منقضی</span>
                      ) : (
                        <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[9px] font-bold text-muted-foreground">غیرفعال</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {c.type === 'time' ? 'زمانی' : 'تعدادی (پله‌ای)'}
                      {' · '}
                      {c.type === 'time' ? `${toFa(c.discountPercent)}٪ ثابت` : `${toFa(c.tiers.length)} پله`}
                      {' · '}
                      {c.endsAt ? `پایان: ${dateFa(c.endsAt)}` : 'بی‌پایان'}
                    </p>
                    {c.description && (
                      <p className="mt-1 line-clamp-2 max-w-xl text-[11px] leading-5 text-muted-foreground/90">
                        {c.description}
                      </p>
                    )}
                    {/* پله‌های کمپین تعدادی + پله عمومی پس از پله‌ها */}
                    {c.type === 'quantity' && c.tiers.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {c.tiers.map((t, i) => (
                          <span
                            key={i}
                            className="rounded-full bg-white px-1.5 py-0.5 text-[9.5px] font-bold text-red-700 ring-1 ring-red-200"
                          >
                            {t.to == null
                              ? `نفر ${toFa(t.from)} به بعد: ${toFa(t.percent)}٪`
                              : `${toFa(t.from)}${t.from === t.to ? '' : `–${toFa(t.to)}`}: ${toFa(t.percent)}٪`}
                          </span>
                        ))}
                        {c.finalPercent != null && (
                          <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[9.5px] font-bold text-white">
                            بعد از نفر آخر: {toFa(c.finalPercent)}٪ تا پایان
                          </span>
                        )}
                      </div>
                    )}
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      جذب واقعی: <b className="text-foreground">{toFa(c.purchaseCount)}</b> خرید ثبت‌شده
                      {c.manualPurchaseCount != null && (
                        <span className="text-amber-600"> · شمار دستی: {toFa(c.manualPurchaseCount)}</span>
                      )}
                      {c.manualDiscountPercent != null && (
                        <span className="text-red-600"> · درصد دستی: {toFa(c.manualDiscountPercent)}٪</span>
                      )}
                    </p>

                    {/* گزارش زنده پله جاری — عین چیزی که کاربر در صفحه بسته‌ها می‌بیند
                        (خواسته مالک ۳۱-۱۰: «بنویسه ۹ نفر خریدن و تخفیف ۷۰٪ فقط یک نفر جا داره») */}
                    {c.running && c.type === 'quantity' && c.currentTier && (
                      <p className="mt-2 flex flex-wrap items-center gap-1.5 rounded-md bg-red-50 px-2.5 py-2 text-[11.5px] font-bold text-red-800 ring-1 ring-red-100">
                        <Users size={13} className="shrink-0 text-red-600" />
                        {toFa(c.effectiveCount)} نفر خریدند
                        <span className="text-red-400">·</span>
                        {c.currentTier.to != null ? (
                          <>
                            تخفیف {toFa(c.currentTier.percent)}٪ فقط برای{' '}
                            <span className="text-red-600">{toFa(c.currentTier.spotsLeft ?? 0)} نفر دیگر</span> مانده
                          </>
                        ) : (
                          <>
                            از نفر {toFa(c.currentTier.from)} به بعد تا پایان:{' '}
                            <span className="text-red-600">{toFa(c.currentTier.percent)}٪ تخفیف</span>
                          </>
                        )}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {c.running && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-[10px] text-[11.5px]"
                        onClick={() => {
                          setDiscountTarget(c);
                          setManualPercent(c.manualDiscountPercent == null ? '' : String(c.manualDiscountPercent));
                        }}
                      >
                        <CalendarClock size={13} /> درصد جاری
                      </Button>
                      {c.type === 'quantity' && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-[10px] text-[11.5px]"
                          onClick={() => {
                            setCountTarget(c);
                            setManualCount(c.manualPurchaseCount == null ? '' : String(c.manualPurchaseCount));
                          }}
                        >
                          <Users size={13} /> شمار خریداران
                        </Button>
                      )}
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-[10px] text-[11.5px]"
                    onClick={() =>
                      setEditing({
                        id: c.id,
                        title: c.title,
                        description: c.description ?? '',
                        type: c.type,
                        discountPercent: c.discountPercent,
                        manualDiscountPercent: c.manualDiscountPercent,
                        finalPercent: c.finalPercent,
                        manualPurchaseCount: c.manualPurchaseCount,
                        startsAt: c.startsAt,
                        endsAt: c.endsAt,
                        isActive: c.isActive,
                        tiers: c.tiers,
                      })
                    }
                  >
                    <Pencil size={13} /> ویرایش
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 rounded-[10px] text-[11.5px] text-muted-foreground hover:text-destructive"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (confirm(`کمپین «${c.title}» حذف شود؟`)) remove.mutate(c.id);
                    }}
                  >
                    <Trash2 size={13} /> حذف
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CampaignEditDialog
        input={editing}
        pending={save.isPending}
        onClose={() => setEditing(null)}
        onSave={(v) => save.mutate(v)}
      />

      {/* دیالوگ تغییر سریع درصد جاری — خواسته مالک: «روی چند هست رو خودم تغییر بدم» */}
      <Dialog open={Boolean(discountTarget)} onOpenChange={(v) => { if (!v) { setDiscountTarget(null); setManualPercent(''); } }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>درصد تخفیف جاری «{discountTarget?.title}»</DialogTitle>
            <DialogDescription>
              این عدد فوراً روی قیمت بسته‌ها اعمال می‌شود. خالی بگذارید تا از پله‌های کمپین به‌صورت خودکار محاسبه شود.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-[12px]">درصد دستی (۰ تا ۱۰۰)</Label>
            <Input
              dir="ltr"
              type="number"
              min={0}
              max={100}
              value={manualPercent}
              onChange={(e) => setManualPercent(e.target.value)}
              placeholder="خالی = خودکار پله‌ای"
              className="h-9 rounded-md"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-lg"
              disabled={setDiscount.isPending}
              onClick={() => discountTarget && setDiscount.mutate({ id: discountTarget.id, manualDiscountPercent: null })}
            >
              خودکار پله‌ای
            </Button>
            <Button
              size="sm"
              className="h-9 rounded-lg"
              disabled={setDiscount.isPending || manualPercent === '' || Number(manualPercent) < 0 || Number(manualPercent) > 100}
              onClick={() =>
                discountTarget &&
                setDiscount.mutate({ id: discountTarget.id, manualDiscountPercent: Math.round(Number(manualPercent)) })
              }
            >
              {setDiscount.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              ثبت درصد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* دیالوگ تغییر سریع شمار خریداران — دستی/نمایشی (خواسته مالک ۳۱-۱۰:
          «بتونم الکی ست کنم چند نفر خریدن تا صفحه کمپین فوریت بسازه») */}
      <Dialog open={Boolean(countTarget)} onOpenChange={(v) => { if (!v) { setCountTarget(null); setManualCount(''); } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>شمار خریداران «{countTarget?.title}»</DialogTitle>
            <DialogDescription>
              عددی که به‌عنوان «چند نفر خریدن» به کاربران نمایش داده می‌شود. خالی بگذارید تا فقط شمار واقعی خریدها
              ملاک باشد. مثال: پله ۱ تا ۱۰ با ۷۰٪ و عدد ۹ → «۹ نفر خریدند، تخفیف ۷۰٪ فقط برای ۱ نفر دیگر».
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-[12px]">تعداد خریداران (دستی/نمایشی)</Label>
            <Input
              dir="ltr"
              type="number"
              min={0}
              max={1000000}
              value={manualCount}
              onChange={(e) => setManualCount(e.target.value)}
              placeholder="خالی = فقط شمار واقعی"
              className="h-9 rounded-md"
            />
            {countTarget && (
              <p className="text-[10.5px] leading-5 text-muted-foreground">
                خرید واقعی ثبت‌شده: <b className="text-foreground">{toFa(countTarget.purchaseCount)}</b> نفر
                {countTarget.currentTier && countTarget.currentTier.to != null && (
                  <>
                    {' '}— پله جاری: نفر {toFa(countTarget.currentTier.from)} تا {toFa(countTarget.currentTier.to ?? 0)}{' '}
                    با {toFa(countTarget.currentTier.percent)}٪
                  </>
                )}
              </p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-lg"
              disabled={setCount.isPending}
              onClick={() => countTarget && setCount.mutate({ id: countTarget.id, manualPurchaseCount: null })}
            >
              فقط واقعی
            </Button>
            <Button
              size="sm"
              className="h-9 rounded-lg"
              disabled={
                setCount.isPending ||
                manualCount === '' ||
                Number(manualCount) < 0 ||
                !Number.isFinite(Number(manualCount))
              }
              onClick={() =>
                countTarget &&
                setCount.mutate({ id: countTarget.id, manualPurchaseCount: Math.max(0, Math.round(Number(manualCount))) })
              }
            >
              {setCount.isPending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              ثبت تعداد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** دیالوگ ساخت/ویرایش کمپین — زمانی/تعدادی + پله‌ها */
function CampaignEditDialog({
  input,
  pending,
  onClose,
  onSave,
}: {
  input: AdminCampaignInput | null;
  pending: boolean;
  onClose: () => void;
  onSave: (v: AdminCampaignInput) => void;
}) {
  const [form, setForm] = useState<AdminCampaignInput | null>(null);

  useEffect(() => {
    setForm(input);
  }, [input]);

  /** تاریخ ISO → yyyy-MM-ddTHH:mm برای input datetime-local */
  const toLocalInput = (iso?: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <Dialog open={Boolean(form)} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{form?.id ? `ویرایش کمپین «${form.title}»` : 'کمپین جدید'}</DialogTitle>
          <DialogDescription>
            کمپین فعال بالای بسته‌های صفحه قیمت‌ها نمایش داده می‌شود و تخفیف آن روی قیمت همه بسته‌ها اعمال می‌شود.
          </DialogDescription>
        </DialogHeader>

        {form && (
          <div className="max-h-[65vh] space-y-3 overflow-y-auto pe-1">
            <div className="space-y-1.5">
              <Label className="text-[12px]">عنوان کمپین</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="مثلاً جشنواره آغاز فعالیت ایمچ"
                className="h-9 rounded-md"
                maxLength={80}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px]">شعار / توضیح (بالای بسته‌ها نمایش داده می‌شود)</Label>
              <Textarea
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="مثلاً: به مناسبت بازگشایی سایت، همه بسته‌ها با ۵۰٪ تخفیف!"
                className="min-h-16 rounded-md text-[12.5px] leading-6"
                maxLength={400}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px]">نوع کمپین</Label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as 'time' | 'quantity' })}
                  className="h-9 w-full rounded-md border border-input bg-card px-2 text-[13px]"
                >
                  <option value="time">زمانی — درصد ثابت تا پایان</option>
                  <option value="quantity">تعدادی — پله‌ای بر اساس خریداران</option>
                </select>
              </div>
              {form.type === 'time' && (
                <div className="space-y-1.5">
                  <Label className="text-[12px]">درصد تخفیف</Label>
                  <Input
                    dir="ltr"
                    type="number"
                    min={1}
                    max={100}
                    value={form.discountPercent}
                    onChange={(e) => setForm({ ...form, discountPercent: Number(e.target.value) })}
                    className="h-9 rounded-md"
                  />
                </div>
              )}
              {form.type === 'quantity' && (
                <div className="space-y-1.5">
                  <Label className="text-[12px]">تخفیف عمومی بعد از پله‌ها (٪)</Label>
                  <Input
                    dir="ltr"
                    type="number"
                    min={0}
                    max={100}
                    value={form.finalPercent ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, finalPercent: e.target.value === '' ? null : Number(e.target.value) })
                    }
                    placeholder="مثلاً 30"
                    className="h-9 rounded-md"
                  />
                </div>
              )}
              <div className="space-y-1.5">
                <Label className="text-[12px]">شروع</Label>
                <Input
                  dir="ltr"
                  type="datetime-local"
                  value={toLocalInput(form.startsAt)}
                  onChange={(e) => setForm({ ...form, startsAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                  className="h-9 rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]">پایان (خالی = بی‌پایان)</Label>
                <Input
                  dir="ltr"
                  type="datetime-local"
                  value={toLocalInput(form.endsAt)}
                  onChange={(e) => setForm({ ...form, endsAt: e.target.value ? new Date(e.target.value).toISOString() : null })}
                  className="h-9 rounded-md"
                />
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 rounded-md border p-3 text-[12px] font-bold">
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              کمپین فعال باشد
            </label>

            {/* پله‌های کمپین تعدادی + تخفیف عمومی بعد از پله‌ها */}
            {form.type === 'quantity' && (
              <div className="space-y-2 rounded-md border border-dashed border-red-200 bg-red-50/30 p-3">
                <div className="flex items-center justify-between">
                  <Label className="text-[12px] text-red-800">پله‌های تخفیف (پیوسته — از نفر ۱)</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 rounded-md text-[11px]"
                    onClick={() => {
                      const tiers = form.tiers ?? [];
                      const last = tiers[tiers.length - 1];
                      const from = last ? (last.to ?? 0) + 1 : 1;
                      setForm({ ...form, tiers: [...tiers, { from, to: from + 29, percent: 30 }] });
                    }}
                  >
                    <Plus size={12} /> پله جدید
                  </Button>
                </div>
                {(form.tiers ?? []).map((t, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] font-bold text-red-800">نفر</span>
                    <Input
                      dir="ltr"
                      type="number"
                      min={1}
                      value={t.from}
                      onChange={(e) => {
                        const tiers = [...(form.tiers ?? [])];
                        tiers[i] = { ...t, from: Number(e.target.value) };
                        setForm({ ...form, tiers });
                      }}
                      className="h-8 w-20 rounded-md"
                      aria-label={`پله ${i + 1} از نفر`}
                    />
                    <span className="text-[11px] font-bold text-red-800">تا</span>
                    <Input
                      dir="ltr"
                      type="number"
                      min={t.from}
                      placeholder="∞"
                      value={t.to ?? ''}
                      onChange={(e) => {
                        const tiers = [...(form.tiers ?? [])];
                        tiers[i] = { ...t, to: e.target.value === '' ? null : Number(e.target.value) };
                        setForm({ ...form, tiers });
                      }}
                      className="h-8 w-20 rounded-md"
                      aria-label={`پله ${i + 1} تا نفر`}
                    />
                    <span className="text-[11px] font-bold text-red-800">→</span>
                    <Input
                      dir="ltr"
                      type="number"
                      min={0}
                      max={100}
                      value={t.percent}
                      onChange={(e) => {
                        const tiers = [...(form.tiers ?? [])];
                        tiers[i] = { ...t, percent: Number(e.target.value) };
                        setForm({ ...form, tiers });
                      }}
                      className="h-8 w-20 rounded-md"
                      aria-label={`پله ${i + 1} درصد`}
                    />
                    <span className="text-[11px] font-bold text-red-800">٪</span>
                    <button
                      type="button"
                      aria-label="حذف پله"
                      onClick={() => setForm({ ...form, tiers: (form.tiers ?? []).filter((_, j) => j !== i) })}
                      className="grid size-7 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-red-100 hover:text-red-600"
                    >
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <p className="text-[10px] leading-5 text-red-900/70">
                  مثال: نفر ۱ تا ۱۰ → ۷۰٪ | ۱۱ تا ۴۰ → ۵۰٪ | ۴۱ تا ۱۴۰ → ۳۰٪. «تخفیف عمومی بعد از پله‌ها» از نفر
                  بعدِ آخرین پله شروع می‌شود و تا پایان کمپین معتبر می‌ماند — اگر خالی بگذارید، بعد از اتمام پله‌ها
                  تخفیف تمام می‌شود.
                </p>

                {/* شمار دستی/نمایشی خریداران — فوریت‌سازی (خواسته مالک ۳۱-۱۰) */}
                <div className="space-y-1.5 rounded-md border border-amber-200 bg-amber-50/50 p-2.5">
                  <Label className="text-[12px] text-amber-800">شمار دستی خریداران (نمایشی)</Label>
                  <Input
                    dir="ltr"
                    type="number"
                    min={0}
                    max={1000000}
                    value={form.manualPurchaseCount ?? ''}
                    onChange={(e) =>
                      setForm({ ...form, manualPurchaseCount: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })
                    }
                    placeholder="خالی = فقط شمار واقعی خریدها"
                    className="h-8 rounded-md"
                  />
                  <p className="text-[10px] leading-5 text-amber-800/80">
                    عددی که به‌عنوان «چند نفر خریدن» نمایش داده می‌شود (بیشینهٔ واقعی/دستی ملاک است). مثال: پله ۱ تا ۱۰
                    با ۷۰٪ و عدد ۹ → «۹ نفر خریدند، تخفیف ۷۰٪ فقط برای ۱ نفر دیگر».
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" className="h-9 rounded-lg" onClick={onClose}>
            انصراف
          </Button>
          <Button
            size="sm"
            className="h-9 rounded-lg"
            disabled={
              pending ||
              !form ||
              form.title.trim().length < 3 ||
              (form.type === 'time' && form.discountPercent <= 0) ||
              (form.type === 'quantity' && (form.tiers ?? []).length === 0)
            }
            onClick={() => form && onSave({ ...form, title: form.title.trim() })}
          >
            {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            ذخیره کمپین
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
