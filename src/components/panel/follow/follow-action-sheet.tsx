'use client';

import { useState } from 'react';
import {
  ArrowLeftRight,
  ArrowRight,
  FolderInput,
  FolderPlus,
  Loader2,
  NotebookPen,
  Trash2,
  X,
} from 'lucide-react';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { Button } from '@/components/ui/button';
import { NoteComposer, StatusChipsRow } from '@/components/panel/follow/follow-parts';
import {
  useAddFollowNote,
  useCreateFollowFolder,
  useFollowFolders,
  useMoveFollowItem,
  useRemoveFollowItem,
  useSetFollowStatus,
} from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { FOLLOW_STATUS_MAP, FOLLOW_TARGET_LABEL } from '@/lib/follow';
import { toFa } from '@/lib/format';
import type { BuyRequest, FollowItem, FollowStatus, Product } from '@/lib/types';
import type { FollowActionMode } from './follow-item-row';
import { cn } from '@/lib/utils';

/** عنوان نمایشی هدف — برای پیام‌های شیت */
function targetTitle(item: FollowItem): string {
  if (item.targetType === 'buy_request') {
    const r = item.target as BuyRequest;
    return `${r.firstName} ${r.lastName}`.trim() || 'خریدار';
  }
  return (item.target as Product).productName;
}

/**
 * شیت عملیات مورد پیگیری — پشت دکمهٔ سه‌نقطهٔ ردیف (خواسته مالک ۶-۱۱:
 * تغییر وضعیت / یادداشت / انتقال / حذف زیر سه‌نقطه).
 *
 * منو → هر عمل حالت خودش را باز می‌کند (همان الگوی چندحالتهٔ SaveFollowSheet).
 * موبایل: بات‌شیت با دکمهٔ بازگشت / دسکتاپ: مودال مرکزی.
 */
export function FollowActionSheet({
  item,
  initialMode,
  onClose,
}: {
  item: FollowItem;
  initialMode: FollowActionMode;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { data: folders } = useFollowFolders();
  const [mode, setMode] = useState<FollowActionMode>(initialMode);
  const [creatingNew, setCreatingNew] = useState(false);
  const [newName, setNewName] = useState('');

  const setStatusM = useSetFollowStatus();
  const noteM = useAddFollowNote();
  const moveM = useMoveFollowItem();
  const removeM = useRemoveFollowItem();
  const createFolder = useCreateFollowFolder();

  const fail = (err: unknown) =>
    toast({
      description: err instanceof Error ? err.message : 'خطای غیرمنتظره — دوباره تلاش کنید.',
      variant: 'destructive',
    });

  const changeStatus = (status: FollowStatus) => {
    if (setStatusM.isPending) return;
    setStatusM.mutate(
      { itemId: item.id, status },
      {
        onSuccess: () => {
          toast({ description: 'وضعیت به‌روزرسانی شد.' });
          onClose();
        },
        onError: fail,
      },
    );
  };

  const addNote = (text: string) => {
    if (noteM.isPending) return;
    noteM.mutate(
      { itemId: item.id, text },
      {
        onSuccess: () => {
          toast({ description: 'یادداشت ثبت شد.' });
          onClose();
        },
        onError: fail,
      },
    );
  };

  const move = async (folderId: string) => {
    if (moveM.isPending) return;
    try {
      await moveM.mutateAsync({ itemId: item.id, folderId });
      toast({ description: 'مورد به پروندهٔ جدید منتقل شد.' });
      onClose();
    } catch (err) {
      fail(err);
    }
  };

  /** ساخت پروندهٔ جدید و انتقال مورد به آن */
  const createAndMove = async () => {
    const name = newName.trim();
    if (!name || createFolder.isPending) return;
    try {
      const folder = await createFolder.mutateAsync({ name });
      await moveM.mutateAsync({ itemId: item.id, folderId: folder.id });
      toast({ description: `به پروندهٔ «${folder.name}» منتقل شد.` });
      onClose();
    } catch (err) {
      fail(err);
    }
  };

  const remove = () => {
    if (removeM.isPending) return;
    removeM.mutate(item.id, {
      onSuccess: () => {
        toast({ description: 'از پیگیری‌ها حذف شد.' });
        onClose();
      },
      onError: fail,
    });
  };

  const body = (
    <div className="space-y-3 p-1">
      {mode === 'menu' && (
        <>
          <p className="text-xs leading-5 text-muted-foreground">
            {FOLLOW_TARGET_LABEL[item.targetType]} در پروندهٔ «{item.folderName}»
          </p>
          <div className="space-y-1">
            <MenuRow
              icon={ArrowLeftRight}
              label="تغییر وضعیت"
              hint={`فعلی: ${FOLLOW_STATUS_MAP[item.status].label}`}
              onClick={() => setMode('status')}
            />
            <MenuRow icon={NotebookPen} label="یادداشت جدید" onClick={() => setMode('note')} />
            <MenuRow icon={FolderInput} label="انتقال به پروندهٔ دیگر" onClick={() => setMode('move')} />
            <MenuRow icon={Trash2} label="حذف از پیگیری" danger onClick={() => setMode('delete')} />
          </div>
        </>
      )}

      {mode === 'status' && (
        <>
          <p className="text-xs leading-5 text-muted-foreground">
            وضعیت جدید را انتخاب کنید — فعلی: {FOLLOW_STATUS_MAP[item.status].label}.
          </p>
          <StatusChipsRow value={item.status} onChange={changeStatus} disabled={setStatusM.isPending} />
        </>
      )}

      {mode === 'note' && (
        <NoteComposer
          onSubmit={addNote}
          disabled={noteM.isPending}
          placeholder="مثلاً: قیمت ۴۸ هزار گفت، جمعه دوباره تماس می‌گیرم."
        />
      )}

      {mode === 'move' && (
        <>
          <p className="text-xs leading-5 text-muted-foreground">
            وضعیت و یادداشت‌ها همراه خودِ مورد منتقل می‌شوند.
          </p>
          <div className="space-y-1.5">
            {(folders ?? [])
              .filter((f) => f.id !== item.folderId)
              .map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => move(f.id)}
                  disabled={moveM.isPending}
                  className="flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-card px-3 text-sm transition-colors hover:border-primary/40 disabled:opacity-60"
                >
                  <span className="truncate font-medium">{f.name}</span>
                  <span className="shrink-0 text-[10.5px] text-muted-foreground">{toFa(f.itemCount)} مورد</span>
                </button>
              ))}
            {creatingNew ? (
              <div className="flex gap-2 pt-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && createAndMove()}
                  placeholder="نام پروندهٔ جدید"
                  maxLength={60}
                  className="h-11 flex-1 rounded-md border bg-transparent px-3 text-sm outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                />
                <Button className="rounded-md" disabled={!newName.trim() || createFolder.isPending} onClick={createAndMove}>
                  {createFolder.isPending || moveM.isPending ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <FolderPlus size={15} />
                  )}
                  ساخت و انتقال
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setCreatingNew(true);
                  setNewName('');
                }}
                className="inline-flex h-11 items-center gap-1 rounded-md px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
              >
                <FolderPlus size={14} /> پروندهٔ جدید
              </button>
            )}
          </div>
        </>
      )}

      {mode === 'delete' && (
        <>
          <p className="text-xs leading-6 text-muted-foreground">
            «{targetTitle(item)}» از پروندهٔ «{item.folderName}» و همهٔ یادداشت‌هایش حذف می‌شود. این کار
            قابل بازگشت نیست.
          </p>
          <Button variant="destructive" className="w-full rounded-md" disabled={removeM.isPending} onClick={remove}>
            {removeM.isPending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
            حذف می‌کنم
          </Button>
        </>
      )}
    </div>
  );

  const title =
    mode === 'menu'
      ? 'عملیات پیگیری'
      : mode === 'status'
        ? 'تغییر وضعیت'
        : mode === 'note'
          ? 'یادداشت جدید'
          : mode === 'move'
            ? 'انتقال به پروندهٔ دیگر'
            : 'حذف از پیگیری';

  return (
    <>
      {/* موبایل — بات‌شیت (قانون مودال‌های ایمچ) */}
      <BottomSheet
        open
        onClose={onClose}
        onBack={mode === 'menu' ? undefined : () => setMode('menu')}
        title={title}
      >
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
            <div className="flex items-center gap-1">
              {mode !== 'menu' && (
                <button
                  type="button"
                  onClick={() => setMode('menu')}
                  aria-label="بازگشت"
                  className="grid size-8 place-items-center rounded-lg text-foreground transition-colors hover:bg-accent"
                >
                  <ArrowRight size={20} />
                </button>
              )}
              <h2 className="text-base font-bold">{title}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="بستن"
              className="grid size-8 place-items-center rounded-lg text-foreground transition-colors hover:bg-accent"
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

/** ردیف منو — آیکون + برچسب (+ توضیح کوچک) */
function MenuRow({
  icon: Icon,
  label,
  hint,
  danger = false,
  onClick,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  hint?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-3 py-2.5 text-sm font-bold transition-colors',
        danger ? 'text-red-500 hover:bg-red-50' : 'text-foreground hover:bg-accent',
      )}
    >
      <Icon size={16} className={danger ? 'text-red-500' : 'text-primary/70'} />
      <span className="flex-1 text-start">{label}</span>
      {hint && <span className="text-[10.5px] font-medium text-muted-foreground">{hint}</span>}
    </button>
  );
}
