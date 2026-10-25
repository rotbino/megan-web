'use client';

/**
 * نشان شده ها — لیست‌های نام‌دار خریداران (پاسخ سرویس: {lists:[{id,name,cnt}]}).
 * دکمه «لیست جدید» + کارت هر لیست با تعداد نشان‌شده → صفحه جزئیات (CRM).
 */

import { useState } from 'react';
import Link from 'next/link';
import { Bookmark, FolderPlus, Trash2 } from 'lucide-react';
import { useSavedLists } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { toFa } from '@/lib/format';

export default function SavedListsPage() {
  const { data: lists, isLoading } = useSavedLists();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [extra, setExtra] = useState<{ id: number; name: string; cnt: number }[]>([]);
  const [removed, setRemoved] = useState<Set<number>>(new Set());

  const all = [...(lists ?? []), ...extra].filter((l) => !removed.has(l.id));

  const createList = () => {
    const name = newName.trim();
    if (!name) return;
    setExtra((e) => [...e, { id: Date.now(), name, cnt: 0 }]);
    setNewName('');
    setCreating(false);
    toast({ description: `لیست «${name}» ساخته شد.` });
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
              onKeyDown={(e) => e.key === 'Enter' && createList()}
              placeholder="نام لیست (مثلاً: سیب زمینی)"
              className="rounded-md"
            />
            <Button className="rounded-md" onClick={createList}>
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
                onClick={() => {
                  setRemoved((prev) => new Set(prev).add(l.id));
                  toast({ description: `لیست «${l.name}» حذف شد.` });
                }}
                className="absolute left-3 top-3 hidden text-muted-foreground transition-colors hover:text-red-500 group-hover:block"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
