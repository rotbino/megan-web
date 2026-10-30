'use client';

/**
 * درخواستهای من — عین MHTML باسکول:
 * تب‌های شمارنده‌دار (تایید شده/در انتظار تایید/رد شده) + ردیف درخواست +
 * جعبه «دلایل رد شدن درخواست های خرید» + حالت خالی با دکمه «ثبت درخواست خرید».
 */

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock3, FileText, Info, Loader2, Pencil, Trash2, XCircle } from 'lucide-react';
import { useMyBuyRequests, useDeleteMyBuyRequest, useUpdateMyBuyRequest } from '@/lib/mock/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UnitInput } from '@/components/shared/unit-input';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { BUY_REQUEST_REJECTION_REASONS } from '@/lib/mock/data';
import { stockFa, toFa } from '@/lib/format';
import { RelativeTime } from '@/components/shared/relative-time';
import { cn } from '@/lib/utils';
import type { BuyRequestStatus, MyBuyRequest } from '@/lib/types';

const TABS: { key: BuyRequestStatus; label: string; icon: React.ComponentType<{ size?: number | string; className?: string }> }[] = [
  { key: 'confirmed', label: 'تایید شده', icon: CheckCircle2 },
  { key: 'pending', label: 'در انتظار تایید', icon: Clock3 },
  { key: 'rejected', label: 'رد شده', icon: XCircle },
];

const STATUS_STYLE: Record<BuyRequestStatus, string> = {
  confirmed: 'bg-emerald-50 text-emerald-600',
  pending: 'bg-amber-50 text-amber-600',
  rejected: 'bg-red-50 text-red-600',
};

const STATUS_LABEL: Record<BuyRequestStatus, string> = {
  confirmed: 'تایید شده',
  pending: 'در انتظار تایید',
  rejected: 'رد شده',
};

function RequestRow({ req }: { req: MyBuyRequest }) {
  const title = req.productType ? `${req.subcategoryName} ${req.productType}` : req.subcategoryName;
  const del = useDeleteMyBuyRequest();
  const upd = useUpdateMyBuyRequest();
  const [confirmDel, setConfirmDel] = useState(false);
  // ویرایش — فقط «در انتظار تایید» (خواسته مالک: بعد از ثبت از صفحه اول، در پنل قابل ویرایش)
  const [editing, setEditing] = useState(false);
  const [eType, setEType] = useState(req.productType);
  const [eAmount, setEAmount] = useState(String(req.requirementAmount));
  const [eGoal, setEGoal] = useState<'price_and_buy' | 'price_only'>(req.goal ?? 'price_and_buy');
  const [eErr, setEErr] = useState('');

  const saveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    setEErr('');
    const amount = Number(eAmount.replace(/[^\d]/g, ''));
    if (!amount || amount < 1) {
      setEErr('میزان نیازمندی را وارد کنید.');
      return;
    }
    upd.mutate(
      { id: req.id, productType: eType.trim(), requirementAmount: amount, goal: eGoal },
      {
        onSuccess: () => setEditing(false),
        onError: (err) => setEErr(err instanceof Error ? err.message : 'ذخیره ناموفق بود — دوباره تلاش کنید.'),
      },
    );
  };

  return (
    <div className="rounded-lg border bg-card p-3.5 sm:p-4">
    <div className="flex flex-wrap items-center gap-3">
      <span className="grid size-11 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground">
        <FileText size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
          {title}
          <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', STATUS_STYLE[req.status])}>
            {STATUS_LABEL[req.status]}
          </span>
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          میزان نیازمندی: {stockFa(req.requirementAmount, req.unit)} ·{' '}
          {req.goal === 'price_and_buy' ? 'اطلاع از قیمت و خرید سریع' : 'فقط اطلاع از قیمت'}
        </p>
      </div>
      <div className="flex items-center gap-3">
        {req.status === 'confirmed' && (
          <Button asChild size="sm" variant="outline" className="rounded-md">
            <Link href="/panel/suggested-sellers">فروشندگان پیشنهادی</Link>
          </Button>
        )}
        <span className="shrink-0 text-[11px] text-muted-foreground">
          <RelativeTime date={req.createdAt} />
        </span>
        {req.status === 'pending' && !editing && (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 rounded-md text-xs"
            onClick={() => {
              setEType(req.productType);
              setEAmount(String(req.requirementAmount));
              setEGoal(req.goal ?? 'price_and_buy');
              setEErr('');
              setEditing(true);
              setConfirmDel(false);
            }}
          >
            <Pencil size={14} /> ویرایش
          </Button>
        )}
        {confirmDel ? (
          <span className="flex shrink-0 items-center gap-1">
            <Button
              size="sm"
              className="rounded-md bg-red-600 text-xs hover:bg-red-700"
              disabled={del.isPending}
              onClick={() => del.mutate(req.id)}
            >
              {del.isPending ? '…' : 'حذف قطعی'}
            </Button>
            <Button size="sm" variant="outline" className="rounded-md text-xs" onClick={() => setConfirmDel(false)}>
              انصراف
            </Button>
          </span>
        ) : (
          <Button
            size="sm"
            variant="outline"
            className="shrink-0 rounded-md text-xs text-red-600 hover:border-red-300 hover:bg-red-50"
            onClick={() => setConfirmDel(true)}
          >
            <Trash2 size={14} /> حذف
          </Button>
        )}
      </div>

      {/* فرم ویرایش — فقط در انتظار تایید */}
      {editing && req.status === 'pending' && (
        <form onSubmit={saveEdit} className="mt-3 w-full space-y-3 rounded-md border bg-secondary/30 p-3.5">
          <p className="text-xs font-extrabold text-muted-foreground">
            ویرایش درخواست «{req.subcategoryName}»
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">نوع کالا (اختیاری)</p>
              <Input
                value={eType}
                onChange={(ev) => setEType(ev.target.value)}
                placeholder="مثلاً اکبری"
                className="rounded-md"
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <p className="text-xs text-muted-foreground">میزان نیازمندی ({req.unit})</p>
              <UnitInput
                kind="weight"
                unit={req.unit}
                value={eAmount}
                onValueChange={setEAmount}
                placeholder="مثلاً ۵۰۰"
                ariaLabel="میزان نیازمندی"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">هدف درخواست</p>
            <div className="flex gap-2">
              {(['price_and_buy', 'price_only'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setEGoal(g)}
                  className={cn(
                    'rounded-md border px-3 py-2 text-xs font-bold transition-colors',
                    eGoal === g
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-card text-muted-foreground hover:border-primary/40',
                  )}
                >
                  {g === 'price_and_buy' ? 'اطلاع از قیمت و خرید' : 'فقط اطلاع از قیمت'}
                </button>
              ))}
            </div>
          </div>
          {eErr && <p className="text-xs text-destructive">{eErr}</p>}
          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" className="rounded-md" disabled={upd.isPending}>
              {upd.isPending ? <Loader2 size={14} className="animate-spin" /> : null}
              {upd.isPending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
            </Button>
            <Button type="button" size="sm" variant="outline" className="rounded-md" onClick={() => setEditing(false)}>
              انصراف
            </Button>
          </div>
        </form>
      )}

      {/* دلایل رد شدن — فقط رد شده */}
      {req.status === 'rejected' && req.rejectionReasons && req.rejectionReasons.length > 0 && (
        <div className="mt-3 w-full rounded-md border border-red-100 bg-red-50/60 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold text-red-600">
            <AlertTriangle size={14} className="shrink-0" />
            دلایل رد شدن:
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pe-4 text-xs leading-5 text-red-700/90">
            {req.rejectionReasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
    </div>
  );
}

export default function MyRequestsPage() {
  const { data, isLoading } = useMyBuyRequests();
  // تب اولیه از URL (?tab=pending) — ریدایرکت‌های «درخواست ثبت شد» (RFQ
  // صفحه اول مهمان/واردشده) مستقیم روی تب درست باز می‌شوند
  const [tab, setTab] = useState<BuyRequestStatus>(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('tab');
      return t === 'pending' || t === 'rejected' ? t : 'confirmed';
    } catch {
      return 'confirmed';
    }
  });

  if (isLoading || !data) {
    return <div className="h-64 animate-pulse rounded-lg border bg-card" />;
  }

  const items = data.items.filter((r) => r.status === tab);

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div>
        <h1 className="text-lg font-extrabold">درخواستهای من</h1>
        <p className="mt-1 text-sm text-muted-foreground">درخواست‌های خرید ثبت‌شده شما و وضعیت بررسی آنها.</p>
      </div>

      {/* جعبه دلایل رد شدن — عین باسکول */}
      <PanelCard className="border-amber-200/70 bg-amber-50/50">
        <p className="flex items-center gap-1.5 text-sm font-bold text-amber-700">
          <Info size={16} className="shrink-0" />
          دلایل رد شدن درخواست های خرید
        </p>
        <ul className="mt-2 list-disc space-y-1 pe-5 text-xs leading-6 text-amber-700/90">
          {BUY_REQUEST_REJECTION_REASONS.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </PanelCard>

      {/* تب‌ها */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ key, label, icon: Icon }) => {
          const count = data.items.filter((r) => r.status === key).length;
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-bold transition-colors',
                active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:border-primary/40',
              )}
            >
              <Icon size={14} />
              {label} ({toFa(count)})
            </button>
          );
        })}
      </div>

      {/* آیتم‌ها / حالت خالی */}
      {items.length === 0 ? (
        <PanelEmptyState
          icon={FileText}
          title={
            tab === 'confirmed'
              ? 'درخواست خرید تایید شده ای ندارید.'
              : tab === 'pending'
                ? 'درخواست در انتظار تاییدی ندارید.'
                : 'درخواست رد شده ای ندارید.'
          }
          hint="بعد از ثبت درخواست، منتظر تایید آن توسط کارشناسان ایمچ بمانید."
          actionLabel="ثبت درخواست خرید"
          actionHref="/panel/buy-requests/new"
        />
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <RequestRow key={r.id} req={r} />
          ))}
        </div>
      )}
    </div>
  );
}
