'use client';

/**
 * جزئیات لیست نشان‌شده — CRM کوچک باسکول:
 * چیپ‌های وضعیت (در حال پیگیری/فعلا نیاز نداشت/…) + کارت هر خریدار +
 * وضعیت جدید + یادداشت‌های زمان‌دار + افزودن به لیست دیگر.
 */

import { use, useState } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowRight, NotebookPen, Settings2, StickyNote } from 'lucide-react';
import { useSavedListUsers, useSavedLists } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { PanelCard } from '@/components/panel/panel-parts';
import { SAVED_USER_STATUS_LABELS } from '@/lib/mock/data';
import { dateFa } from '@/lib/format';
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
  const listId = Number(id);
  const { data: lists } = useSavedLists();
  const { data: initialUsers, isLoading } = useSavedListUsers(listId);
  const { toast } = useToast();

  const [users, setUsers] = useState<SavedUserItem[] | null>(null);
  const [filter, setFilter] = useState<SavedUserStatusKey | 'all'>('all');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [noteFor, setNoteFor] = useState<number | null>(null);
  const [noteText, setNoteText] = useState('');

  const list = lists?.find((l) => l.id === listId);
  const current = users ?? initialUsers ?? [];

  const shown = filter === 'all' ? current : current.filter((u) => u.status === filter);

  const setStatus = (userId: number, status: SavedUserStatusKey) => {
    setUsers(
      current.map((u) =>
        u.id === userId
          ? { ...u, status, notes: u.notes }
          : u,
      ),
    );
    toast({ description: 'وضعیت کاربر به‌روزرسانی شد.' });
  };

  const addNote = () => {
    if (!noteText.trim() || noteFor === null) return;
    setUsers(
      current.map((u) =>
        u.id === noteFor
          ? { ...u, notes: [...u.notes, { id: Date.now(), text: noteText.trim(), createdAt: new Date().toISOString() }] }
          : u,
      ),
    );
    setNoteText('');
    setNoteFor(null);
    toast({ description: 'یادداشت ثبت شد.' });
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
                  onClick={() => toast({ description: 'به لیست دیگری اضافه شد. (نمونه)' })}
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

      {/* مودال تنظیمات لیست */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="rounded-lg sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-start">تنظیمات لیست</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p className="text-xs text-muted-foreground">«{list?.name}» — {current.length} نشان شده</p>
            <Button
              variant="outline"
              className="w-full justify-start rounded-md text-xs"
              onClick={() => toast({ description: 'تغییر نام لیست در نسخه بعدی فعال می‌شود. (نمونه)' })}
            >
              تغییر نام لیست
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start rounded-md text-xs text-red-500 hover:bg-red-50"
              onClick={() => toast({ description: 'حذف لیست در نسخه بعدی فعال می‌شود. (نمونه)' })}
            >
              حذف لیست
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
