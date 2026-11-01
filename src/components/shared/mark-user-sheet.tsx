'use client';

import { useMemo, useState } from 'react';
import {
  BadgeCheck,
  Bookmark,
  BookmarkCheck,
  Check,
  FolderPlus,
  Info,
  Loader2,
  Plus,
  X,
} from 'lucide-react';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';
import { useCreateSavedList, useMarkState, useMarkUser } from '@/lib/mock/hooks';
import { SAVED_USER_STATUS_LABELS } from '@/lib/mock/data';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';
import type { SavedList, SavedUserStatusKey } from '@/lib/types';

/**
 * مودال CRM «نشان کردن» (خواسته مالک ۱-۱۱ دور هفتم — عکس مرجع):
 * نشان کردن = ذخیره = علاقه‌مندی؛ یک مفهوم واحد. هر دکمهٔ نشان روی سایت
 * (آگهی / پروفایل فروشنده / کارت خریدار) همین مودال را باز می‌کند.
 *
 * ساختار عین عکس: هویت کاربر (آواتار + نام + تیک) ← «لیست ها» + «لیست جدید»
 * ← چک‌باکس هر لیست ← چیپ‌های وضعیت پیگیری ← انصراف / تأیید.
 * سینک کامل: تیک‌خورده‌ها عضو می‌مانند/می‌شوند؛ بقیه لیست‌ها حذف می‌شوند.
 */

const STATUS_KEYS = Object.keys(SAVED_USER_STATUS_LABELS) as SavedUserStatusKey[];

export interface MarkTarget {
  /** ObjectId کاربر هدف در بک‌اند (myuserId آگهی / id کاربر) */
  targetUserId: string;
  targetName: string;
  isVerified?: boolean;
  avatarUrl?: string | null;
  /** نام پیشنهادی لیست جدید (کارت خریدار: دستهٔ کالا) */
  defaultListName?: string;
}

export function MarkUserSheet({
  open,
  onClose,
  target,
}: {
  open: boolean;
  onClose: () => void;
  target: MarkTarget | null;
}) {
  const { toast } = useToast();
  const { data: lists, isLoading } = useMarkState(target?.targetUserId, open && !!target);
  const mark = useMarkUser();
  const createList = useCreateSavedList();

  // وضعیت محلی — الگوی derived state: تا کاربر دست نزده، همان seed سرور؛
  // بعد از اولین تعامل، seed دیگر روی انتخاب‌های کاربر نمی‌نویسد
  const [created, setCreated] = useState<SavedList[]>([]);
  const [localChecked, setLocalChecked] = useState<Set<string> | null>(null);
  const [localStatus, setLocalStatus] = useState<SavedUserStatusKey | null | undefined>(undefined);
  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState('');

  const allLists = useMemo(() => {
    const have = new Set((lists ?? []).map((l) => l.id));
    return [...(lists ?? []), ...created.filter((l) => !have.has(l.id))];
  }, [lists, created]);

  // مودال در والد با {open && …} مانت می‌شود → هر بار باز شدن، state تازه است
  const serverChecked = useMemo(
    () => new Set((lists ?? []).filter((l) => l.saved).map((l) => l.id)),
    [lists],
  );
  const checked = localChecked ?? serverChecked;
  const serverStatus =
    (lists ?? []).find((l) => l.saved && l.targetStatus)?.targetStatus ?? null;
  const status = localStatus === undefined ? serverStatus : localStatus;

  const toggleList = (id: string) => {
    const next = new Set(checked);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setLocalChecked(next);
  };

  const pickStatus = (k: SavedUserStatusKey | null) => setLocalStatus(k);

  const submitNewList = () => {
    const name = newListName.trim();
    if (!name || createList.isPending) return;
    createList.mutate(name, {
      onSuccess: (list) => {
        setCreated((prev) => [...prev, list]);
        setLocalChecked((prev) => new Set(prev ?? checked).add(list.id));
        setNewListName('');
        setNewListOpen(false);
      },
      onError: (err) =>
        toast({ description: err instanceof Error ? err.message : 'ساخت لیست ناموفق بود.', variant: 'destructive' }),
    });
  };

  const confirm = () => {
    if (!target || mark.isPending) return;
    mark.mutate(
      { targetUserId: target.targetUserId, listIds: [...checked], status: status ?? undefined },
      {
        onSuccess: (r) => {
          toast({
            description: r.marked
              ? `«${target.targetName}» نشان شد — از پنل ← نشان شده ها دنبال کنید.`
              : `نشان «${target.targetName}» برداشته شد.`,
          });
          onClose();
        },
        onError: (err) =>
          toast({ description: err instanceof Error ? err.message : 'نشان کردن ناموفق بود.', variant: 'destructive' }),
      },
    );
  };

  const identity = (
    <div className="flex items-center gap-3">
      {target?.avatarUrl ? (
        <img src={target.avatarUrl} alt={target.targetName} className="size-12 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="grid size-12 shrink-0 place-items-center rounded-full bg-primary/10 text-lg font-extrabold text-primary">
          {target?.targetName?.trim()?.[0] ?? '؟'}
        </span>
      )}
      <div className="min-w-0">
        <p className="flex min-w-0 items-center gap-1.5 text-sm font-extrabold">
          <span className="truncate">{target?.targetName ?? '…'}</span>
          {target?.isVerified && <BadgeCheck size={15} className="shrink-0 text-primary" />}
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">نشان کردن و پیگیری در پنل شما</p>
      </div>
    </div>
  );

  const body = (
    <div className="space-y-4 p-1">
      {identity}

      {/* ─── لیست ها ─── */}
      <div>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-extrabold">لیست ها</p>
          <button
            type="button"
            onClick={() => setNewListOpen((o) => !o)}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary-deep"
          >
            {newListOpen ? <X size={14} /> : <FolderPlus size={14} />}
            {newListOpen ? 'بی‌خیال' : 'لیست جدید'}
          </button>
        </div>

        {newListOpen && (
          <div className="mt-2 flex gap-2">
            <input
              autoFocus
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitNewList()}
              placeholder={target?.defaultListName ?? 'نام لیست (مثلاً: سیب زمینی)'}
              maxLength={60}
              className="h-11 flex-1 rounded-md border bg-transparent px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
            <button
              type="button"
              onClick={submitNewList}
              disabled={!newListName.trim() || createList.isPending}
              className="inline-flex h-11 items-center gap-1 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-50"
            >
              {createList.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
              ساختن
            </button>
          </div>
        )}

        <div className="mt-2 space-y-1.5">
          {isLoading ? (
            <p className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground">
              <Loader2 size={15} className="animate-spin" /> در حال دریافت لیست‌ها…
            </p>
          ) : allLists.length === 0 ? (
            <p className="rounded-md bg-secondary/60 px-3 py-3 text-center text-xs leading-6 text-muted-foreground">
              هنوز لیستی ندارید — با «لیست جدید» اولین لیستتان را بسازید.
            </p>
          ) : (
            allLists.map((l) => {
              const on = checked.has(l.id);
              return (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => toggleList(l.id)}
                  aria-pressed={on}
                  className={cn(
                    'flex h-11 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm transition-colors',
                    on
                      ? 'border-primary/45 bg-primary/10 text-primary'
                      : 'bg-card text-foreground/85 hover:border-primary/40',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate font-bold">{l.name}</span>
                    <span className="shrink-0 text-[10.5px] text-muted-foreground">{toFa(l.cnt)} نشان شده</span>
                  </span>
                  {/* چک‌باکس — عین عکس مرجع */}
                  <span
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded-[5px] border transition-colors',
                      on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
                    )}
                    aria-hidden
                  >
                    {on && <Check size={13} strokeWidth={3} />}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ─── وضعیت پیگیری ─── */}
      <div>
        <p className="text-[13px] font-extrabold">وضعیت پیگیری</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {STATUS_KEYS.map((k) => {
            const on = status === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => pickStatus(on ? null : k)}
                aria-pressed={on}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors',
                  on
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                {SAVED_USER_STATUS_LABELS[k]}
              </button>
            );
          })}
        </div>
      </div>

      <p className="flex items-start gap-1.5 rounded-md bg-secondary/60 px-3 py-2 text-[10.5px] leading-5 text-muted-foreground">
        <Info size={13} className="mt-0.5 shrink-0 text-primary/70" />
        نشان‌شده‌ها از پنل ← «نشان شده ها» دنبال می‌شوند؛ وضعیت را همیشه می‌توانید عوض کنید.
      </p>

      {/* انصراف / تأیید — هم‌قد (قانون تناسب RULES.md §۱) */}
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onClose}
          className="h-11 rounded-md border border-primary/40 bg-card text-sm font-bold text-primary transition-colors hover:bg-primary/5"
        >
          انصراف
        </button>
        <button
          type="button"
          onClick={confirm}
          disabled={mark.isPending}
          className="inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-50"
        >
          {mark.isPending && <Loader2 size={15} className="animate-spin" />}
          تأیید
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* موبایل — بات‌شیت (قانون مودال‌های ایمچ) */}
      <BottomSheet open={open} onClose={onClose} title="نشان کردن کاربر">
        {body}
      </BottomSheet>

      {/* دسکتاپ — مودال مرکزی */}
      {open && (
        <div
          className="fixed inset-0 z-[60] hidden items-center justify-center p-4 nav-desktop:flex"
          role="dialog"
          aria-modal="true"
          aria-label="نشان کردن کاربر"
        >
          <div className="animate-sheet-fade absolute inset-0 bg-black/40" onClick={onClose} />
          <div className="relative w-full max-w-sm rounded-xl bg-card p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between border-b border-border/70 pb-3">
              <h2 className="text-base font-bold">نشان کردن کاربر</h2>
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

/**
 * دکمهٔ «نشان کردن» + مودال — یک‌تکه. مهمان → مودال ورود (نیات save).
 * variant:
 *  · compact — کنار بازدید صفحهٔ آگهی (آیکون + متن)
 *  · block — تمام‌عرض h-11 کنار دکمه‌های سایدبار پروفایل
 */
export function MarkUserButton({
  target,
  variant = 'compact',
  className,
}: {
  target: MarkTarget;
  variant?: 'compact' | 'block';
  className?: string;
}) {
  const { user, requireAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: lists } = useMarkState(target.targetUserId, Boolean(user));

  const marked = Boolean(user && (lists ?? []).some((l) => l.saved));

  return (
    <>
      <button
        type="button"
        onClick={() => (user ? setOpen(true) : requireAuth('save'))}
        aria-pressed={marked}
        aria-label={marked ? `برداشتن نشان ${target.targetName}` : `نشان کردن ${target.targetName}`}
        title={marked ? `نشان شده — مدیریت در نشان شده ها` : 'نشان کردن برای پیگیری'}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded-md border font-bold transition-colors',
          variant === 'block' ? 'h-11 w-full text-sm' : 'h-9 px-3 text-xs',
          marked
            ? 'border-primary/45 bg-primary/10 text-primary'
            : 'border-border bg-card text-foreground/85 hover:border-primary/40',
          className,
        )}
      >
        {marked ? <BookmarkCheck size={variant === 'block' ? 16 : 14} /> : <Bookmark size={variant === 'block' ? 16 : 14} />}
        {marked ? 'نشان شده' : 'نشان کردن'}
      </button>

      {open && <MarkUserSheet open={open} onClose={() => setOpen(false)} target={target} />}
    </>
  );
}
