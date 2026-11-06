'use client';

/**
 * پیگیری‌ها — پرونده‌های CRM کوچک ایمچ (خواسته مالک ۶-۱۱).
 * هر پرونده یک موضوع پیگیری است (مثل «خرید سیب زمینی»)؛ موارد ذخیره‌شده
 * با وضعیت قیف تماس و یادداشت داخل آن سازمان‌دهی می‌شوند.
 * جریان ذخیره از دکمهٔ «ذخیره» روی کارت خریداران/آگهی‌ها شروع می‌شود.
 */

import { useState } from 'react';
import Link from 'next/link';
import { Bookmark, FolderPlus, Loader2, Pencil, Trash2 } from 'lucide-react';
import {
  useCreateFollowFolder,
  useDeleteFollowFolder,
  useFollowFolders,
  useRenameFollowFolder,
} from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { FOLLOW_STATUSES } from '@/lib/follow';
import { timeAgoFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { FollowFolder } from '@/lib/types';

export default function FollowFoldersPage() {
  const { data: folders, isLoading } = useFollowFolders();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [renaming, setRenaming] = useState<FollowFolder | null>(null);
  const [renameText, setRenameText] = useState('');
  const [deleting, setDeleting] = useState<FollowFolder | null>(null);

  const createFolder = useCreateFollowFolder();
  const renameFolder = useRenameFollowFolder();
  const deleteFolder = useDeleteFollowFolder();

  const fail = (err: unknown) =>
    toast({
      description: err instanceof Error ? err.message : 'خطای غیرمنتظره — دوباره تلاش کنید.',
      variant: 'destructive',
    });

  const submitCreate = () => {
    const name = newName.trim();
    if (!name || createFolder.isPending) return;
    createFolder.mutate({ name }, {
      onSuccess: (f) => {
        setNewName('');
        setCreating(false);
        toast({ description: `پروندهٔ «${f.name}» ساخته شد.` });
      },
      onError: fail,
    });
  };

  const submitRename = () => {
    if (!renaming) return;
    const name = renameText.trim();
    if (!name || renameFolder.isPending) return;
    renameFolder.mutate(
      { folderId: renaming.id, name },
      {
        onSuccess: () => {
          toast({ description: 'نام پرونده تغییر کرد.' });
          setRenaming(null);
        },
        onError: fail,
      },
    );
  };

  const submitDelete = () => {
    if (!deleting || deleteFolder.isPending) return;
    deleteFolder.mutate(deleting.id, {
      onSuccess: () => {
        toast({ description: `پروندهٔ «${deleting.name}» حذف شد.` });
        setDeleting(null);
      },
      onError: fail,
    });
  };

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-lg border bg-card" />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <PanelCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-base font-extrabold sm:text-lg">پیگیری‌ها</h1>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              درخواست‌های خرید و آگهی‌هایی که ذخیره کرده‌اید — با وضعیت تماس و یادداشت، در پرونده‌های موضوعی.
            </p>
          </div>
          <Button size="sm" className="rounded-md" onClick={() => setCreating((c) => !c)}>
            <FolderPlus size={15} /> پروندهٔ جدید
          </Button>
        </div>

        {creating && (
          <div className="mt-4 flex gap-2">
            <Input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitCreate()}
              placeholder="نام پرونده (مثلاً: خرید سیب زمینی)"
              className="rounded-md"
              maxLength={60}
            />
            <Button className="rounded-md" disabled={!newName.trim() || createFolder.isPending} onClick={submitCreate}>
              {createFolder.isPending ? <Loader2 size={15} className="animate-spin" /> : 'ساختن'}
            </Button>
          </div>
        )}
      </PanelCard>

      {(folders ?? []).length === 0 ? (
        <PanelEmptyState
          icon={Bookmark}
          title="هنوز چیزی را پیگیری نمی‌کنید."
          hint="روی دکمهٔ «ذخیره» در کارت خریداران یا آگهی‌ها بزنید تا در یک پروندهٔ موضوعی نگه داشته شود؛ وضعیت تماس و یادداشت‌هایتان همان‌جا جمع می‌شود."
          actionLabel="مشاهده درخواست‌های خرید"
          actionHref="/panel/buyers"
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {(folders ?? []).map((f) => {
            const active = FOLLOW_STATUSES.filter((s) => (f.statusCounts[s.key] ?? 0) > 0);
            return (
              <div
                key={f.id}
                className="group relative rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:border-primary/40"
              >
                <Link href={`/panel/saved/${f.id}`} className="block pe-14">
                  <div className="flex items-center gap-3">
                    <span className="grid size-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                      <Bookmark size={19} />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold">{f.name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {toFa(f.itemCount)} مورد · {timeAgoFa(f.updatedAt)}
                      </p>
                    </div>
                  </div>
                </Link>

                {active.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 pe-14">
                    {active.map((s) => (
                      <span
                        key={s.key}
                        className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold', s.tone)}
                      >
                        <span className={cn('size-1 rounded-full', s.dot)} />
                        {s.label} {toFa(f.statusCounts[s.key] ?? 0)}
                      </span>
                    ))}
                  </div>
                )}

                <div className="absolute left-3 top-3 flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                  <button
                    type="button"
                    aria-label="تغییر نام پرونده"
                    onClick={() => {
                      setRenaming(f);
                      setRenameText(f.name);
                    }}
                    className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    type="button"
                    aria-label="حذف پرونده"
                    onClick={() => setDeleting(f)}
                    className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* مودال تغییر نام */}
      <Dialog open={renaming !== null} onOpenChange={(o) => !o && setRenaming(null)}>
        <DialogContent className="rounded-lg sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-start">تغییر نام پرونده</DialogTitle>
          </DialogHeader>
          <Input
            autoFocus
            value={renameText}
            onChange={(e) => setRenameText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitRename()}
            className="rounded-md"
            placeholder="نام جدید پرونده"
            maxLength={60}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-md" onClick={() => setRenaming(null)}>
              انصراف
            </Button>
            <Button className="rounded-md" disabled={renameFolder.isPending || !renameText.trim()} onClick={submitRename}>
              {renameFolder.isPending ? <Loader2 size={15} className="animate-spin" /> : 'ذخیره'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* مودال حذف پرونده */}
      <Dialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="rounded-lg sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-start">حذف پرونده</DialogTitle>
            <DialogDescription className="text-start leading-6">
              پروندهٔ «{deleting?.name}» با {toFa(deleting?.itemCount ?? 0)} مورد ذخیره‌شده و همهٔ یادداشت‌هایش حذف می‌شود. این کار قابل بازگشت نیست.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" className="rounded-md" onClick={() => setDeleting(null)}>
              انصراف
            </Button>
            <Button variant="destructive" className="rounded-md" disabled={deleteFolder.isPending} onClick={submitDelete}>
              {deleteFolder.isPending ? <Loader2 size={15} className="animate-spin" /> : 'حذف پرونده'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
