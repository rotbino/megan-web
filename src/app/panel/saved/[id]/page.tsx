'use client';

/**
 * جزئیات لیست نشان‌شده — CRM کوچک باسکول:
 * چیپ‌های وضعیت (در حال پیگیری/فعلا نیاز نداشت/…) + کارت هر خریدار +
 * وضعیت جدید + یادداشت‌های زمان‌دار + افزودن به لیست دیگر.
 */

import { use, useState } from 'react';
import Link from 'next/link';
import { notFound, useRouter } from 'next/navigation';
import { ArrowRight, Loader2, NotebookPen, Settings2, StickyNote } from 'lucide-react';
import {
  useAddSavedUserNote,
  useMoveSavedUser,
  useSavedListUsers,
  useSavedLists,
  useSetSavedUserStatus,
  useUpdateSavedList,
  useDeleteSavedList,
} from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PanelCard } from '@/components/panel/panel-parts';
import { SAVED_USER_STATUS_LABELS } from '@/lib/mock/data';
import { dateFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { SavedUserItem, SavedUserStatusKey } from '@/lib/types';

const STATUS_KEYS = Object.keys(SAVED_USER_STATUS_LABELS) as SavedUserStatusKey[];

const STATUS_TONE: Record<SavedUserStatusKey, string> = {
  following: 'bg-sky-50 text-sky-600 border-sky-200',
  not_needed: 'bg-secondary text-muted-foreground border-border',
  unresponsive: 'bg-red-50 text-red-600 border-red-200',
  out_of_stock: 'bg-amber-50 text-amber-600 border-amber-200',
  priority_high: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  priority_medium: 'bg-teal-50 text-teal-600 border-teal-200',
  priority_low: 'bg-secondary text-muted-foreground border-border',
};

export default function SavedListDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const listId = id; // ObjectId رشته‌ای
  const router = useRouter();
  const routerPush = router.push.bind(router);
  const { data: lists } = useSavedLists();
  const { data: initialUsers, isLoading } = useSavedListUsers(listId);
  const setStatusMutation = useSetSavedUserStatus();
  const addNoteMutation = useAddSavedUserNote();
  const moveMutation = useMoveSavedUser();
  const updateListMutation = useUpdateSavedList();
  const deleteListMutation = useDeleteSavedList();
  const { toast } = useToast();

  const [filter, setFilter] = useState<SavedUserStatusKey | 'all'>('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteText, setNoteText] = useState('');
  const [moveFor, setMoveFor] = useState<SavedUserItem | null>(null);

  const list = lists?.find((l) => l.id === listId);
  const current: SavedUserItem[] = initialUsers ?? [];

  const shown = filter === 'all' ? current : current.filter((u) => u.status === filter);

  const setStatus = (userId: string, status: SavedUserStatusKey) => {
    setStatusMutation.mutate(
      { savedUserId: userId, status },
      {
        onSuccess: () => toast({ description: 'وضعیت کاربر به‌روزرسانی شد.' }),
        onError: (err) => toast({ description: err instanceof Error ? err.message : 'به‌روزرسانی ناموفق بود.' }),
      },
    );
  };

  const addNote = () => {
    if (!noteText.trim() || noteFor === null || addNoteMutation.isPending) return;
    addNoteMutation.mutate(
      { savedUserId: noteFor, text: noteText.trim() },
      {
        onSuccess: () => {
          setNoteText('');
          setNoteFor(null);
          toast({ description: 'یادداشت ثبت شد.' });
        },
        onError: (err) => toast({ description: err instanceof Error ? err.message : 'ثبت یادداشت ناموفق بود.' }),
      },
    );
  };

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg border bg-card" />;
  }
  if (!list && !initialUsers) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href="/panel/saved" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowRight size={14} /> نشان شده ها
        </Link>
        <Button size="sm" variant="outline" className="rounded-md" onClick={() => setSettingsOpen(true)}>
          <Settings2 size={14} /> تنظیمات لیست
        </Button>
      </div>

      <PanelCard>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-base font-extrabold sm:text-lg">{list?.name ?? 'لیست نشان‌شده'}</h1>
          <p className="text-xs text-muted-foreground">
            نشان شده ها — <b>{current.length}</b> نشان شده
          </p>
        </div>

        {/* چیپ‌های وضعیت — عین باسکول */}
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors',
              filter === 'all' ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-muted-foreground hover:border-primary/40',
            )}
          >
            همه
          </button>
          {STATUS_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors',
                filter === k ? 'border-primary bg-primary text-primary-foreground' : STATUS_TONE[k],
              )}
            >
              {SAVED_USER_STATUS_LABELS[k]}
            </button>
          ))}
        </div>
      </PanelCard>

      {shown.length === 0 ? (
        <PanelCard className="py-10 text-center text-sm text-muted-foreground">
          موردی با این وضعیت در لیست نیست.
        </PanelCard>
      ) : (
        <div className="space-y-3">
          {shown.map((u) => (
            <article key={u.id} className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-extrabold">{u.name}</p>
                <span className={cn('rounded-full border px-2.5 py-1 text-[11px] font-bold', STATUS_TONE[u.status])}>
                  {SAVED_USER_STATUS_LABELS[u.status]}
                </span>
              </div>

              {/* تغییر وضعیت */}
              <div className="mt-3">
                <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">وضعیت کاربر</p>
                <Select value={u.status} onValueChange={(v) => setStatus(u.id, v as SavedUserStatusKey)}>
                  <SelectTrigger className="h-9 w-full rounded-md text-xs sm:w-64" aria-label="وضعیت جدید اضافه می کنید؟">
                    <SelectValue placeholder="وضعیت جدید اضافه می کنید؟" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {SAVED_USER_STATUS_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* یادداشت‌ها */}
              <div className="mt-4">
                <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
                  <StickyNote size={12} /> یادداشت ها
                </p>
                {u.notes.length === 0 ? (
                  <p className="rounded-md bg-secondary/60 px-3 py-2 text-[11px] text-muted-foreground">یادداشتی ثبت نشده است.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {u.notes.map((n) => (
                      <li key={n.id} className="rounded-md border bg-secondary/40 px-3 py-2 text-xs leading-5">
                        <span className="block text-[10px] text-muted-foreground">
                          {dateFa(n.createdAt)} , {new Date(n.createdAt).getHours().toLocaleString('en-US', { minimumIntegerDigits: 2 })}:
                          {new Date(n.createdAt).getMinutes().toLocaleString('en-US', { minimumIntegerDigits: 2 })}
                        </span>
                        {n.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-dashed pt-3">
                <Button size="sm" variant="outline" className="rounded-md text-xs" onClick={() => setNoteFor(u.id)}>
                  <NotebookPen size={14} /> یادداشت جدید
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="rounded-md text-xs text-primary hover:bg-primary/5"
                  onClick={() => setMoveFor(u)}
                >
                  افزودن به لیست دیگر
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* مودال یادداشت جدید */}
      <Dialog open={noteFor !== null} onOpenChange={(o) => !o && setNoteFor(null)}>
        <DialogContent className="rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-start">یادداشت جدید</DialogTitle>
          </DialogHeader>
          <Textarea
            dir="rtl"
            autoFocus
            rows={4}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="resize-none text-sm leading-6"
            placeholder="مثلاً: یادم باشه زنگ بزنم"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-md" onClick={() => setNoteFor(null)}>
              انصراف
            </Button>
            <Button className="rounded-md" onClick={addNote}>
              ثبت یادداشت
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* مودال تنظیمات لیست — واقعی: تغییر نام / حذف */}
      <Dialog open={settingsOpen} onOpenChange={(o) => { setSettingsOpen(o); if (o) setRenameValue(list?.name ?? ''); }}>
        <DialogContent className="rounded-lg sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-start">تنظیمات لیست</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-xs text-muted-foreground">«{list?.name}» — {current.length} نشان شده</p>
            <div className="space-y-1.5">
              <p className="text-[11px] font-bold text-muted-foreground">تغییر نام لیست</p>
              <div className="flex gap-2">
                <Input
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  className="rounded-md text-xs"
                  placeholder="نام جدید"
                />
                <Button
                  size="sm"
                  className="rounded-md"
                  disabled={!renameValue.trim() || renameValue.trim() === list?.name || updateListMutation.isPending}
                  onClick={() =>
                    updateListMutation.mutate(
                      { listId, name: renameValue.trim() },
                      {
                        onSuccess: () => {
                          setSettingsOpen(false);
                          toast({ description: 'نام لیست تغییر کرد.' });
                        },
                        onError: (err) => toast({ description: err instanceof Error ? err.message : 'تغییر نام ناموفق بود.' }),
                      },
                    )
                  }
                >
                  {updateListMutation.isPending && <Loader2 size={13} className="ml-1 animate-spin" />}
                  ذخیره
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-md text-xs text-red-500 hover:bg-red-50"
              disabled={deleteListMutation.isPending}
              onClick={() =>
                deleteListMutation.mutate(listId, {
                  onSuccess: () => routerPush('/panel/saved'),
                  onError: (err) => toast({ description: err instanceof Error ? err.message : 'حذف ناموفق بود.' }),
                })
              }
            >
              {deleteListMutation.isPending && <Loader2 size={13} className="ml-1 animate-spin" />}
              حذف لیست
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* مودال افزودن به لیست دیگر — واقعی */}
      <Dialog open={!!moveFor} onOpenChange={(o) => !o && setMoveFor(null)}>
        <DialogContent className="rounded-lg sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-start">افزودن به لیست دیگر</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <p className="text-xs text-muted-foreground">{moveFor?.name} به کدام لیست اضافه شود؟</p>
            {(lists ?? []).filter((l) => l.id !== listId).length === 0 ? (
              <p className="rounded-md bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
                لیست دیگری ندارید — از صفحه «نشان شده ها» لیست جدید بسازید.
              </p>
            ) : (
              (lists ?? [])
                .filter((l) => l.id !== listId)
                .map((l) => (
                  <Button
                    key={l.id}
                    variant="outline"
                    className="w-full justify-between rounded-md text-xs"
                    disabled={moveMutation.isPending}
                    onClick={() =>
                      moveFor &&
                      moveMutation.mutate(
                        { savedUserId: moveFor.id, toListId: l.id },
                        {
                          onSuccess: () => {
                            setMoveFor(null);
                            toast({ description: `به لیست «${l.name}» منتقل شد.` });
                          },
                          onError: (err) => toast({ description: err instanceof Error ? err.message : 'انتقال ناموفق بود.' }),
                        },
                      )
                    }
                  >
                    {l.name}
                    <span className="text-[10px] text-muted-foreground">{toFa(l.cnt)} نفر</span>
                  </Button>
                ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
