'use client';

/**
 * SaveFollowButton — دکمهٔ «ذخیره» + شیت/مودال پیگیری (CRM کوچک ایمچ، خواسته مالک ۶-۱۱).
 *
 * جریان ذخیره (دومرحله‌ای):
 *   ۱) انتخاب پرونده — یا ساخت پروندهٔ جدید (نام پیشنهادی = دستهٔ کالا، مثل «پفک»)
 *   ۲) وضعیت قیف (پیش‌فرض «در بررسی») + یادداشت اختیاری
 *
 * اگر مورد از قبل ذخیره شده باشد، کلیک حالت «مدیریت» را باز می‌کند:
 * تغییر وضعیت درجا، افزودن یادداشت، انتقال به پروندهٔ دیگر و حذف.
 *
 * موبایل: بات‌شیت پایین‌رونده / دسکتاپ: مودال مرکزی — الگوی مودال‌های ایمچ (RULES §۲).
 * variant:
 *   compact — دکمهٔ متن‌دار ریز (کارت خریدار پنل)
 *   block   — تمام‌عرض h-11 (سایدبار صفحهٔ آگهی)
 *   icon    — مربع/دایرهٔ ۴۴px فقط آیکون (روی عکس کارت آگهی)
 */

import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bookmark,
  FolderInput,
  FolderPlus,
  Loader2,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { useAuth } from '@/lib/mock/auth';
import {
  useAddFollowNote,
  useCreateFollowFolder,
  useFollowFolders,
  useIsFollowing,
  useMoveFollowItem,
  useRemoveFollowItem,
  useSetFollowStatus,
  useUpsertFollow,
} from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { FOLLOW_STATUSES, FOLLOW_TARGET_LABEL } from '@/lib/follow';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';
import type { FollowItem, FollowStatus, FollowTargetType } from '@/lib/types';

export function SaveFollowButton({
  targetType,
  targetId,
  suggestedFolderName,
  variant = 'compact',
  className,
}: {
  targetType: FollowTargetType;
  targetId: number;
  /** نام پیشنهادی پروندهٔ جدید — دستهٔ کالا (مثل «پفک»/«سیب زمینی»)، نه نام خود کالا (خواسته مالک ۶-۱۱) */
  suggestedFolderName?: string;
  variant?: 'compact' | 'block' | 'icon';
  className?: string;
}) {
  const { user, requireAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: state } = useIsFollowing(targetType, targetId, Boolean(user));
  const item = state?.item ?? null;

  const openSheet = () => {
    if (!requireAuth('save')) return; // مهمان → مودال ورود با نیت ذخیره
    setOpen(true);
  };

  const iconSize = variant === 'block' ? 16 : variant === 'icon' ? 20 : 14;

  if (variant === 'icon') {
    return (
      <>
        <button
          type="button"
          aria-label={item ? 'مدیریت پیگیری' : 'ذخیره در پیگیری‌ها'}
          title={item ? 'مدیریت پیگیری' : 'ذخیره در پیگیری‌ها'}
          onClick={openSheet}
          className={cn(
            'grid size-11 place-items-center rounded-full bg-card/95 shadow-md backdrop-blur transition-colors hover:text-primary',
            item && 'bg-primary text-primary-foreground hover:text-primary-foreground',
            className,
          )}
        >
          <Bookmark size={iconSize} fill={item ? 'currentColor' : 'none'} />
        </button>
        {open && (
          <SaveFollowSheet
            targetType={targetType}
            targetId={targetId}
            suggestedFolderName={suggestedFolderName}
            initialMode={item ? 'manage' : 'folder'}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    );
  }

  if (variant === 'block') {
    return (
      <>
        <button
          type="button"
          onClick={openSheet}
          className={cn(
            'inline-flex h-11 w-full items-center justify-center gap-1.5 rounded-md border text-sm font-bold transition-colors',
            item
              ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
              : 'border-border bg-card text-foreground hover:border-primary/40',
            className,
          )}
        >
          <Bookmark size={iconSize} fill={item ? 'currentColor' : 'none'} />
          {item ? 'در پیگیری‌ها' : 'ذخیره در پیگیری‌ها'}
        </button>
        {open && (
          <SaveFollowSheet
            targetType={targetType}
            targetId={targetId}
            suggestedFolderName={suggestedFolderName}
            initialMode={item ? 'manage' : 'folder'}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={cn(
          'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-xs font-bold transition-colors',
          item
            ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
            : 'border-border bg-card text-foreground hover:border-primary/40',
          className,
        )}
      >
        <Bookmark size={iconSize} fill={item ? 'currentColor' : 'none'} />
        {item ? 'در پیگیری' : 'ذخیره'}
      </button>
      {open && (
        <SaveFollowSheet
          targetType={targetType}
          targetId={targetId}
          suggestedFolderName={suggestedFolderName}
          initialMode={item ? 'manage' : 'folder'}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

type Mode = 'folder' | 'status' | 'manage' | 'move';

/** شیت/مودال ذخیره — هر بار باز شدن state تازه دارد (والد با {open && …} مانت می‌کند) */
function SaveFollowSheet({
  targetType,
  targetId,
  suggestedFolderName,
  initialMode,
  onClose,
}: {
  targetType: FollowTargetType;
  targetId: number;
  suggestedFolderName?: string;
  initialMode: Mode;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { data: folders, isLoading: foldersLoading } = useFollowFolders();
  const { data: state } = useIsFollowing(targetType, targetId);
  const item: FollowItem | null = useMemo(() => state?.item ?? null, [state]);

  const [mode, setMode] = useState<Mode>(initialMode);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [status, setStatus] = useState<FollowStatus>('reviewing');
  const [note, setNote] = useState('');
  /** null = خودکار — کاربر هنوز چیزی باز/بسته نکرده؛ فرم ساخت فقط
   *  وقتی خودکار باز می‌شود که پرونده‌ای وجود نداشته باشد (state مشتق، بدون effect) */
  const [explicitCreate, setExplicitCreate] = useState<boolean | null>(null);
  const [newName, setNewName] = useState(suggestedFolderName ?? '');

  // کاربر بدون پرونده: فرم ساخت همان اول باز است؛ وگرنه لیست پرونده‌ها دیده می‌شود
  const noFolders = !foldersLoading && (folders ?? []).length === 0;
  const creatingNew = explicitCreate ?? (mode === 'folder' && noFolders);

  const createFolder = useCreateFollowFolder();
  const upsert = useUpsertFollow();
  const setStatusMutation = useSetFollowStatus();
  const moveMutation = useMoveFollowItem();
  const noteMutation = useAddFollowNote();
  const removeMutation = useRemoveFollowItem();

  const fail = (err: unknown) =>
    toast({
      description: err instanceof Error ? err.message : 'خطای غیرمنتظره — دوباره تلاش کنید.',
      variant: 'destructive',
    });

  /** ساخت پروندهٔ جدید → انتخاب و رفتن به مرحلهٔ بعد */
  const createAndContinue = async () => {
    const name = newName.trim();
    if (!name || createFolder.isPending) return;
    try {
      const folder = await createFolder.mutateAsync({ name });
      setFolderId(folder.id);
      setNewName('');
      setExplicitCreate(null);
      if (mode === 'move' && item) {
        await moveMutation.mutateAsync({ itemId: item.id, folderId: folder.id });
        toast({ description: `به پروندهٔ «${folder.name}» منتقل شد.` });
        setMode('manage');
      } else {
        setMode('status');
      }
    } catch (err) {
      fail(err);
    }
  };

  /** مرحلهٔ ۲ — ثبت نهایی ذخیره */
  const save = async () => {
    if (!folderId || upsert.isPending) return;
    try {
      const saved = await upsert.mutateAsync({
        folderId,
        targetType,
        targetId,
        status,
        note: note.trim() || undefined,
      });
      toast({ description: `در پروندهٔ «${saved.folderName}» ذخیره شد.` });
      onClose();
    } catch (err) {
      fail(err);
    }
  };

  const move = async (toFolderId: string) => {
    if (!item) return;
    if (toFolderId === item.folderId) {
      setMode('manage');
      return;
    }
    try {
      await moveMutation.mutateAsync({ itemId: item.id, folderId: toFolderId });
      toast({ description: 'مورد به پروندهٔ جدید منتقل شد.' });
      setMode('manage');
    } catch (err) {
      fail(err);
    }
  };

  const changeStatus = async (next: FollowStatus) => {
    if (!item || setStatusMutation.isPending) return;
    try {
      await setStatusMutation.mutateAsync({ itemId: item.id, status: next });
      toast({ description: 'وضعیت به‌روزرسانی شد.' });
    } catch (err) {
      fail(err);
    }
  };

  const addNote = async (text: string) => {
    if (!item || noteMutation.isPending) return;
    try {
      await noteMutation.mutateAsync({ itemId: item.id, text });
      toast({ description: 'یادداشت ثبت شد.' });
    } catch (err) {
      fail(err);
    }
  };

  const remove = async () => {
    if (!item || removeMutation.isPending) return;
    try {
      await removeMutation.mutateAsync(item.id);
      toast({ description: 'از پیگیری‌ها حذف شد.' });
      onClose();
    } catch (err) {
      fail(err);
    }
  };

  // ─── انتخاب پرونده (مرحلهٔ ۱ یا حالت انتقال) ─────────────────────────
  const renderFolderPicker = (onPick: (folderId: string) => void) => (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-bold">پرونده‌ها</p>
        {!creatingNew && (
          <button
            type="button"
            onClick={() => {
              setExplicitCreate(true);
              setNewName(suggestedFolderName ?? '');
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-primary transition-colors hover:text-primary-deep"
          >
            <FolderPlus size={14} /> پروندهٔ جدید
          </button>
        )}
      </div>

      {creatingNew && (
        <div className="mt-2 flex gap-2">
          <input
            autoFocus
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createAndContinue()}
            placeholder={suggestedFolderName ?? 'نام پرونده (مثلاً: خرید سیب زمینی)'}
            maxLength={60}
            className="h-11 flex-1 rounded-md border bg-transparent px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
          <button
            type="button"
            onClick={createAndContinue}
            disabled={!newName.trim() || createFolder.isPending}
            className="inline-flex h-11 items-center gap-1 rounded-md bg-primary px-4 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-50"
          >
            {createFolder.isPending ? <Loader2 size={15} className="animate-spin" /> : <Plus size={15} />}
            ساختن
          </button>
        </div>
      )}

      <div className="mt-2 space-y-1.5">
        {foldersLoading ? (
          <p className="flex items-center justify-center gap-2 py-5 text-xs text-muted-foreground">
            <Loader2 size={15} className="animate-spin" /> در حال دریافت پرونده‌ها…
          </p>
        ) : (folders ?? []).length === 0 && !creatingNew ? (
          <p className="rounded-md bg-secondary/60 px-3 py-3 text-center text-xs leading-6 text-muted-foreground">
            هنوز پرونده‌ای ندارید — با «پروندهٔ جدید» اولین پروندهٔ پیگیری‌تان را بسازید.
          </p>
        ) : (
          (folders ?? []).map((f) => {
            const on = folderId === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => onPick(f.id)}
                aria-pressed={on}
                className={cn(
                  'flex h-11 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm transition-colors',
                  on ? 'border-primary/45 bg-primary/10 text-primary' : 'bg-card text-foreground/85 hover:border-primary/40',
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate font-bold">{f.name}</span>
                  <span className="shrink-0 text-[10.5px] text-muted-foreground">{toFa(f.itemCount)} مورد</span>
                </span>
                <span
                  className={cn(
                    'grid size-5 shrink-0 place-items-center rounded-full border transition-colors',
                    on ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-card',
                  )}
                  aria-hidden
                >
                  {on && <span className="size-2 rounded-full bg-current" />}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  const renderStatusChips = (value: FollowStatus, onPick: (s: FollowStatus) => void, disabled?: boolean) => (
    <div className="flex flex-wrap gap-2">
      {FOLLOW_STATUSES.map((s) => {
        const on = s.key === value;
        return (
          <button
            key={s.key}
            type="button"
            onClick={() => onPick(s.key)}
            aria-pressed={on}
            disabled={disabled}
            title={s.hint}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors',
              on ? 'border-primary bg-primary text-primary-foreground' : cn(s.tone, 'hover:brightness-95'),
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );

  // ─── بدنه بر اساس حالت ───────────────────────────────────────────────
  const body = (
    <div className="space-y-4 p-1">
      {mode === 'folder' && (
        <>
          <p className="text-xs leading-5 text-muted-foreground">
            این {FOLLOW_TARGET_LABEL[targetType]} را در کدام پرونده ذخیره کنیم؟
          </p>
          {renderFolderPicker((id) => setFolderId(id))}
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
              disabled={folderId === null}
              onClick={() => setMode('status')}
              className="h-11 rounded-md bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-50"
            >
              ادامه
            </button>
          </div>
        </>
      )}

      {mode === 'status' && (
        <>
          <p className="text-xs leading-5 text-muted-foreground">
            اگر الان مطمئن نیستید، همان «در بررسی» کافی است — بعداً هم قابل تغییر است.
          </p>
          <div>
            <p className="mb-1.5 text-[13px] font-bold">وضعیت</p>
            {renderStatusChips(status, setStatus)}
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-bold">یادداشت (اختیاری)</p>
            <textarea
              dir="rtl"
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="مثلاً: قیمت ۴۸ هزار گفت، جمعه دوباره تماس می‌گیرم."
              maxLength={500}
              className="w-full resize-none rounded-md border bg-transparent px-3 py-2 text-sm leading-6 outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setMode('folder')}
              className="inline-flex h-11 items-center gap-1 rounded-md px-3 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowRight size={14} /> بازگشت
            </button>
            <button
              type="button"
              onClick={save}
              disabled={upsert.isPending}
              className="inline-flex h-11 items-center gap-1.5 rounded-md bg-primary px-5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-deep disabled:opacity-50"
            >
              {upsert.isPending ? <Loader2 size={15} className="animate-spin" /> : <Bookmark size={15} />}
              ذخیره در پیگیری
            </button>
          </div>
        </>
      )}

      {mode === 'move' && (
        <>
          <p className="text-xs leading-5 text-muted-foreground">
            وضعیت و یادداشت‌ها همراه خودِ مورد منتقل می‌شوند.
          </p>
          {renderFolderPicker((id) => move(id))}
          <button
            type="button"
            onClick={() => setMode('manage')}
            className="inline-flex h-11 items-center gap-1 rounded-md px-3 text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowRight size={14} /> بازگشت
          </button>
        </>
      )}

      {mode === 'manage' && item && (
        <>
          <p className="text-xs leading-5 text-muted-foreground">
            پروندهٔ «{item.folderName}» — ذخیره از {FOLLOW_TARGET_LABEL[item.targetType]}.
          </p>
          <div>
            <p className="mb-1.5 text-[13px] font-bold">وضعیت</p>
            {renderStatusChips(item.status, changeStatus, setStatusMutation.isPending)}
          </div>
          <div>
            <p className="mb-1.5 text-[13px] font-bold">یادداشت‌ها</p>
            {item.notes.length === 0 ? (
              <p className="rounded-md bg-secondary/60 px-3 py-2.5 text-[11px] leading-5 text-muted-foreground">
                یادداشتی ثبت نشده — قیمت توافقی، کیفیت یا قرار ملاقات را یادداشت کنید.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {[...item.notes]
                  .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                  .map((n) => (
                    <li key={n.id} className="rounded-md border bg-secondary/40 px-3 py-2 text-xs leading-5">
                      <span className="mb-0.5 block text-[10px] text-muted-foreground">{n.createdAt}</span>
                      {n.text}
                    </li>
                  ))}
              </ul>
            )}
            <NoteInline onSubmit={addNote} disabled={noteMutation.isPending} />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-dashed pt-3">
            <button
              type="button"
              onClick={() => {
                setExplicitCreate(false);
                setMode('move');
              }}
              className="inline-flex h-11 items-center gap-1 rounded-md px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
            >
              <FolderInput size={14} /> انتقال به پروندهٔ دیگر
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={removeMutation.isPending}
              className="inline-flex h-11 items-center gap-1 rounded-md px-3 text-xs font-bold text-red-500 transition-colors hover:bg-red-50"
            >
              {removeMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              حذف از پیگیری
            </button>
          </div>
        </>
      )}

      {mode === 'manage' && !item && (
        <div className="space-y-3">
          <p className="text-xs leading-5 text-muted-foreground">این مورد هنوز ذخیره نشده است.</p>
          <button
            type="button"
            onClick={() => setMode('folder')}
            className="h-11 w-full rounded-md bg-primary text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-deep"
          >
            انتخاب پرونده
          </button>
        </div>
      )}
    </div>
  );

  const title =
    mode === 'folder'
      ? 'افزودن به پیگیری'
      : mode === 'status'
        ? 'وضعیت و یادداشت'
        : mode === 'move'
          ? 'انتقال به پروندهٔ دیگر'
          : 'مدیریت پیگیری';

  return (
    <>
      {/* موبایل — بات‌شیت (قانون مودال‌های ایمچ) */}
      <BottomSheet open onClose={onClose} title={title}>
        {body}
      </BottomSheet>

      {/* دسکتاپ — مودال مرکزی */}
      <div
        className="fixed inset-0 z-[60] hidden items-center justify-center p-4 nav-desktop:flex"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="animate-sheet-fade absolute inset-0 bg-black/40" onClick={onClose} />
        <div className="relative max-h-[85vh] w-full max-w-sm overflow-y-auto rounded-xl bg-card p-5 shadow-2xl">
          <div className="mb-4 flex items-center justify-between border-b border-border/70 pb-3">
            <h2 className="text-base font-bold">{title}</h2>
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
    </>
  );
}

/** افزودن یادداشت — دکمه تا تایپ غیرفعال است (یادداشت اجباری نیست) */
function NoteInline({ onSubmit, disabled }: { onSubmit: (text: string) => void; disabled?: boolean }) {
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim() || disabled) return;
    onSubmit(text.trim());
    setText('');
  };
  return (
    <div className="mt-2 space-y-2">
      <textarea
        dir="rtl"
        rows={2}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
        }}
        placeholder="یادداشت جدید (مثلاً: گفت ۱۰ تن می‌خواهد)…"
        maxLength={500}
        className="w-full resize-none rounded-md border bg-transparent px-3 py-2 text-xs leading-6 outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <button
        type="button"
        onClick={submit}
        disabled={disabled || !text.trim()}
        className="inline-flex h-9 items-center gap-1 rounded-md border border-primary/40 bg-card px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/5 disabled:opacity-50"
      >
        ثبت یادداشت
      </button>
    </div>
  );
}
