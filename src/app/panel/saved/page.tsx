'use client';

/**
 * نشان شده ها — لیست‌های نام‌دار خریداران (CRM — B7 واقعی).
 * دکمه «لیست جدید» + کارت هر لیست با تعداد نشان‌شده → صفحه جزئیات (CRM).
 */

import { useState } from 'react';
import Link from 'next/link';
import { Bookmark, FolderPlus, Loader2, Trash2 } from 'lucide-react';
import { useCreateSavedList, useDeleteSavedList, useSavedLists } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { toFa } from '@/lib/format';
import type { SavedList } from '@/lib/types';

export default function SavedListsPage() {
  const { data: lists, isLoading } = useSavedLists();
  const createList = useCreateSavedList();
  const deleteList = useDeleteSavedList();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const all: SavedList[] = lists ?? [];

  const submitList = () => {
    const name = newName.trim();
    if (!name || createList.isPending) return;
    createList.mutate(name, {
      onSuccess: () => {
        setNewName('');
        setCreating(false);
        toast({ description: `لیست «${name}» ساخته شد.` });
      },
      onError: (err) => toast({ description: err instanceof Error ? err.message : 'ساخت لیست ناموفق بود.' }),
    });
  };

  const removeList = (list: SavedList) => {
    setBusyId(list.id);
    deleteList.mutate(list.id, {
      onSuccess: () => toast({ description: `لیست «${list.name}» حذف شد.` }),
      onError: (err) => toast({ description: err instanceof Error ? err.message : 'حذف ناموفق بود.' }),
      onSettled: () => setBusyId(null),
    });
  };

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg border bg-card" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PanelCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-base font-extrabold sm:text-lg">نشان شده ها</h1>
          <Button size="sm" className="rounded-md" onClick={() => setCreating((c) => !c)}>
            <FolderPlus size={15} /> لیست جدید
          </Button>
        </div>

        {creating && (
          <div className="mt-4 flex gap-2">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitList()}
              placeholder="نام لیست (مثلاً: سیب زمینی)"
              className="rounded-md"
            />
            <Button className="rounded-md" onClick={submitList} disabled={createList.isPending}>
              {createList.isPending && <Loader2 size={14} className="ml-1 animate-spin" />}
              ساختن
            </Button>
          </div>
        )}
      </PanelCard>

      {all.length === 0 ? (
        <PanelEmptyState
          icon={Bookmark}
          title="هنوز لیستی نساخته‌اید."
          hint="از صفحه «خریداران» با دکمه «نشان کردن»، خریداران را در لیست‌های نام‌دار ذخیره کنید و پیگیری‌تان را سازماندهی نمایید."
          actionLabel="رفتن به خریداران"
          actionHref="/panel/buyers"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {all.map((l) => (
            <div key={l.id} className="group relative rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <Link href={`/panel/saved/${l.id}`} className="block">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <Bookmark size={19} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold">{l.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{toFa(l.cnt)} نشان شده</p>
                  </div>
                </div>
              </Link>
              <button
                type="button"
                aria-label="حذف لیست"
                disabled={busyId === l.id}
                onClick={() => removeList(l)}
                className="absolute left-3 top-3 hidden text-muted-foreground transition-colors hover:text-red-500 group-hover:block"
              >
                {busyId === l.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
