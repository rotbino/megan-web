'use client';

/**
 * درخواست‌های خرید من — دو تب بالایی (خواستهٔ مالک ۸-۱۱):
 *  • «درخواست‌های خرید فوری» — همان درخواست‌های قبل: تب‌های شمارنده‌دار
 *    (تایید/در انتظار/رد) + ردیف درخواست + جعبه دلایل رد + ویرایش/حذف.
 *  • «درخواست‌های خرید دوره‌ای» — دفتر خرید که از منو به اینجا آمد: کارت‌های
 *    تمام‌عرض با نوار اقدام «پیشنهادها + ویرایش + سه‌نقطه» (خواستهٔ مالک)
 *    و همان سه تب وضعیت — کالای تازه «در انتظار تایید» است و پس از تأیید
 *    ادمین برای فروشندگان هم‌کالا ارسال می‌شود.
 * ریدایرکت‌های «درخواست ثبت شد» با ?tab=pending|rejected|confirmed روی تب
 * وضعیت درست باز می‌شوند؛ ?tab=book تب دوره‌ای را باز می‌کند (status=… هم
 * پشتیبانی می‌شود).
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  FileText,
  Info,
  Loader2,
  NotebookPen,
  Pencil,
  Plus,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';
import {
  useDeleteMyBuyRequest,
  useMyBuyRequests,
  useMyBuyerBook,
  useSaveMyBuyerBook,
  useUpdateMyBuyRequest,
} from '@/lib/mock/hooks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { UnitInput } from '@/components/shared/unit-input';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { BUY_REQUEST_REJECTION_REASONS } from '@/lib/mock/data';
import { stockFa, toFa } from '@/lib/format';
import { RelativeTime } from '@/components/shared/relative-time';
import { useToast } from '@/hooks/use-toast';
import { cn, scrollPanelTop } from '@/lib/utils';
import type { BuyerBookItem, BuyRequestStatus, MyBuyRequest, PurchasePeriod } from '@/lib/types';
import { AddItemFlow, type NewBookItemInput } from '@/components/panel/buyer-book/add-item-flow';
import { BookRecordCard } from '@/components/panel/buyer-book/book-record-card';
import { EditItemDialog } from '@/components/panel/buyer-book/edit-item-dialog';

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

type ViewKey = 'urgent' | 'book';

/** پارامترهای اولیه از URL — ?tab=book | ?tab=pending|confirmed|rejected (قدمی) | ?status=… */
function parseInitialParams(): { view: ViewKey; status: BuyRequestStatus } {
  try {
    const p = new URLSearchParams(window.location.search);
    const tab = p.get('tab');
    const status = p.get('status');
    const st = (['pending', 'confirmed', 'rejected'] as const).find((k) => k === status || k === tab);
    return {
      view: tab === 'book' ? 'book' : 'urgent',
      status: st ?? 'confirmed',
    };
  } catch {
    return { view: 'urgent', status: 'confirmed' };
  }
}

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
                className="rounded-md bg-red-600 text-xs transition-colors hover:brightness-90"
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
  );
}

export default function MyRequestsPage() {
  const { toast } = useToast();
  const initial = useMemo(parseInitialParams, []);
  const [view, setView] = useState<ViewKey>(initial.view);
  const [statusTab, setStatusTab] = useState<BuyRequestStatus>(initial.status);

  // ── فوری ──
  const { data, isLoading } = useMyBuyRequests();

  // ── دوره‌ای (دفتر خرید) ──
  const { data: book, isLoading: bookLoading } = useMyBuyerBook();
  const save = useSaveMyBuyerBook();
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<BuyerBookItem | null>(null);

  const bookItems = useMemo(() => book?.items ?? [], [book]);
  const limit = book?.max ?? 15;
  const existingIds = useMemo(() => new Set(bookItems.map((i) => i.categoryId)), [bookItems]);
  const remaining = Math.max(0, limit - bookItems.length);

  /** افزودن کالاهای جدید — کل دفتر + موارد جدید جایگزین می‌شود */
  const handleAdd = async (inputs: NewBookItemInput[]) => {
    await save.mutateAsync([
      ...bookItems.map((i) => ({ categoryId: i.categoryId, minAmount: i.minAmount, period: i.period })),
      ...inputs,
    ]);
  };

  /** ویرایش یک کالا — همان فهرست با یک ردیف وصله‌شده */
  const handleSave = async (patch: { minAmount: number; period: PurchasePeriod }) => {
    if (!editing) return;
    await save.mutateAsync(
      bookItems.map((i) =>
        i.categoryId === editing.categoryId
          ? { categoryId: i.categoryId, minAmount: patch.minAmount, period: patch.period }
          : { categoryId: i.categoryId, minAmount: i.minAmount, period: i.period },
      ),
    );
    setEditing(null);
    toast({ description: 'تغییرات ذخیره شد.' });
  };

  /** حذف یک کالا — فهرست بدون همان ردیف */
  const handleDelete = async (item: BuyerBookItem) => {
    await save.mutateAsync(
      bookItems
        .filter((i) => i.categoryId !== item.categoryId)
        .map((i) => ({ categoryId: i.categoryId, minAmount: i.minAmount, period: i.period })),
    );
    toast({ description: `«${item.name}» از دفتر خرید حذف شد.` });
  };

  const loading = view === 'urgent' ? isLoading : bookLoading;
  const urgentItems = data?.items ?? [];
  const viewItems = view === 'urgent' ? urgentItems : bookItems;
  const items = viewItems.filter((r) => r.status === statusTab);
  const urgentFiltered = urgentItems.filter((r) => r.status === statusTab);
  const bookFiltered = bookItems.filter((r) => r.status === statusTab);
  const countOf = (k: BuyRequestStatus) => viewItems.filter((r) => r.status === k).length;

  return (
    <div className="mx-auto max-w-4xl space-y-4">


      {/* ── تب‌های بالایی: فوری / دوره‌ای (خط زیرین — عین صفحه خریداران) ── */}
      <div role="tablist" aria-label="نوع درخواست‌های خرید">
        <div className="flex items-stretch gap-4 overflow-x-auto border-b border-border sm:gap-6">
          <button
            type="button"
            role="tab"
            aria-selected={view === 'urgent'}
            onClick={() => {
              setView('urgent');
              scrollPanelTop('auto');
            }}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-1 pb-2.5 pt-1 text-sm font-bold transition-colors',
              view === 'urgent'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <Zap size={15} className="shrink-0" />
            درخواست‌های خرید فوری
            <span className={cn('font-num text-[11px]', view === 'urgent' ? 'text-primary/70' : 'text-muted-foreground/70')}>
              {isLoading && !data ? '…' : toFa(urgentItems.length)}
            </span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={view === 'book'}
            onClick={() => {
              setView('book');
              scrollPanelTop('auto');
            }}
            className={cn(
              '-mb-px flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-1 pb-2.5 pt-1 text-sm font-bold transition-colors',
              view === 'book'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            <CalendarClock size={15} className="shrink-0" />
            درخواست‌های خرید دوره‌ای
            <span className={cn('font-num text-[11px]', view === 'book' ? 'text-primary/70' : 'text-muted-foreground/70')}>
              {bookLoading && !book ? '…' : toFa(bookItems.length)}
            </span>
          </button>
        </div>
      </div>

      {/* جعبه دلایل رد شدن — عین باسکول (هر دو تب) */}
     {/* <PanelCard className="border-amber-200/70 bg-amber-50/50">
        <p className="flex items-center gap-1.5 text-sm font-bold text-amber-700">
          <Info size={16} className="shrink-0" />
          دلایل رد شدن درخواست های خرید
        </p>
        <ul className="mt-2 list-disc space-y-1 pe-5 text-xs leading-6 text-amber-700/90">
          {BUY_REQUEST_REJECTION_REASONS.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
      </PanelCard>*/}

      {/* تب‌های وضعیت — شمارنده‌دار، در هر دو تب بالایی */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <div className={"flex flex-1 gap-2 overflow-x-auto pb-1"}>
          {TABS.map(({ key, label, icon: Icon }) => {
            const count = countOf(key);
            const active = statusTab === key;
            return (
                <button
                    key={key}
                    type="button"
                    onClick={() => setStatusTab(key)}
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

        <div className="flex flex-wrap items-center justify-between gap-3">
          {/*<div className="min-w-0">
          <h1 className="text-lg font-extrabold">درخواست‌های خرید من</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {view === 'urgent'
              ? 'درخواست‌های فوری شما و وضعیت بررسی آنها.'
              : 'کالاهایی که به‌طور مستمر می‌خرید — پس از تایید، فروشندگان مناسب پیشنهادشان را می‌فرستند.'}
          </p>
        </div>*/}
          {/* اقدام متناسب با تب — ثبت درخواست فوری / افزودن کالای دوره‌ای */}
          {view === 'urgent' ? (
              <Button asChild className="rounded-md bg-orange-600 ">
                <Link href="/panel/buy-requests/new">
                  <Plus size={16} />
                  ثبت درخواست فوری
                </Link>
              </Button>
          ) : (
              <Button className="rounded-md bg-orange-600 " onClick={() => setAddOpen(true)} disabled={remaining === 0}>
                <Plus size={16} />
                ثبت درخواست دوره ای
              </Button>
          )}
        </div>
      </div>

      {/* آیتم‌ها / حالت خالی */}
      {loading ? (
        <div className="h-64 animate-pulse rounded-lg border bg-card" />
      ) : items.length === 0 ? (
        view === 'urgent' ? (
          <PanelEmptyState
            icon={FileText}
            title={
              statusTab === 'confirmed'
                ? 'درخواست خرید تایید شده ای ندارید.'
                : statusTab === 'pending'
                  ? 'درخواست در انتظار تاییدی ندارید.'
                  : 'درخواست رد شده ای ندارید.'
            }
            hint="بعد از ثبت درخواست، منتظر تایید آن توسط کارشناسان ایمچ بمانید."
            actionLabel="ثبت درخواست خرید"
            actionHref="/panel/buy-requests/new"
          />
        ) : (
          <PanelEmptyState
            icon={NotebookPen}
            title={
              bookItems.length === 0
                ? 'درخواست خرید دوره‌ای ندارید.'
                : statusTab === 'confirmed'
                  ? 'کالای تایید شده‌ای ندارید.'
                  : statusTab === 'pending'
                    ? 'کالای در انتظار تاییدی ندارید.'
                    : 'کالای رد شده‌ای ندارید.'
            }
            hint={
              bookItems.length === 0
                ? 'کالاهایی که مرتب می‌خرید را ثبت کنید تا فروشندگان مناسب، پیشنهاد تامینشان را برایتان بفرستند.'
                : 'کالای تازه ثبت‌شده پس از تایید کارشناسان ایمچ برای فروشندگان هم‌کالا ارسال می‌شود.'
            }
            actionLabel="افزودن اولین کالا"
            onAction={() => setAddOpen(true)}
          />
        )
      ) : view === 'urgent' ? (
        <div className="space-y-3">
          {urgentFiltered.map((r) => (
            <RequestRow key={r.id} req={r} />
          ))}
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {toFa(bookItems.length)} کالا در دفتر خرید
            {remaining > 0 && <> — تا {toFa(remaining)} کالا دیگر می‌توانید اضافه کنید</>}
          </p>
          {/* تمام‌عرض (خواستهٔ مالک ۸-۱۱) — بدون گرید دوستونه */}
          <div className="space-y-3">
            {bookFiltered.map((item) => (
              <BookRecordCard
                key={item.categoryId}
                item={item}
                onEdit={() => setEditing(item)}
                onDelete={() => void handleDelete(item)}
                deleting={save.isPending}
              />
            ))}
          </div>
        </>
      )}

      {/* افزودن کالا — درخت دسته با تیک برگ‌ها؛ موفقیت → تب «در انتظار تایید» */}
      <AddItemFlow
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existingIds={existingIds}
        existingCount={bookItems.length}
        limit={limit}
        onSubmit={handleAdd}
        onViewRequests={() => {
          setView('book');
          setStatusTab('pending');
          scrollPanelTop('auto');
        }}
      />

      {/* ویرایش کالا — فقط حداقل خرید و دوره */}
      <EditItemDialog
        item={editing}
        onClose={() => setEditing(null)}
        onSave={handleSave}
        saving={save.isPending}
      />
    </div>
  );
}
