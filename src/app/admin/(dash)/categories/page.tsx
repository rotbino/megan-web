'use client';

/**
 * مدیریت دسته‌بندی‌ها (فاز A2) — درخت قابل گسترش + جستجو + دیالوگ ایجاد/ویرایش
 * و حذف فقط بدون فرزند/ارجاع (خطای دقیق سرور نمایش داده می‌شود).
 * تم سفیدِ فلت — آبی فقط در دکمه‌ها/لهجه‌ها.
 */

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Network,
  Package,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  deleteAdminCategory,
  deleteAdminGood,
  fetchAdminCategoryTree,
  fetchAdminGoods,
  upsertCategory,
  type AdminCategoryNode,
  type AdminGood,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { dateFa, toFa } from '@/lib/format';

// ─── ردیف تخت درخت ──────────────────────────────────────────────────────────

interface FlatRow {
  node: AdminCategoryNode;
  depth: number;
  hasChildren: boolean;
}

function flatten(nodes: AdminCategoryNode[], depth = 0, out: FlatRow[] = []): FlatRow[] {
  for (const n of nodes) {
    out.push({ node: n, depth, hasChildren: n.children.length > 0 });
    if (n.children.length > 0) flatten(n.children, depth + 1, out);
  }
  return out;
}

/** شناسه‌های منطبق با جستجو + مسیر اجدادشان (برای نمایش شاخه کامل) */
function collectMatchIds(nodes: AdminCategoryNode[], q: string, hit: Set<number>): boolean {
  let self = false;
  for (const n of nodes) {
    const childHit = n.children.length > 0 ? collectMatchIds(n.children, q, hit) : false;
    if (n.categoryName.includes(q) || childHit) {
      hit.add(n.id);
      self = true;
    }
  }
  return self;
}

// ─── دیالوگ فرم دسته ────────────────────────────────────────────────────────

interface FormState {
  id?: number;
  categoryName: string;
  parentId: number | null;
  parentName: string | null;
  unit: string;
  min: string;
  example: string;
  score: string;
}

const EMPTY_FORM: FormState = {
  categoryName: '',
  parentId: null,
  parentName: null,
  unit: 'کیلوگرم',
  min: '100',
  example: '',
  score: '0',
};

function CategoryDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: FormState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState('');
  const isEdit = form.id != null;

  // فرم تازه هر بار دیالوگ باز می‌شود (الگوی state-during-render)
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setForm(initial);
      setError('');
    }
  }

  const save = useMutation({
    mutationFn: () =>
      upsertCategory({
        id: form.id,
        categoryName: form.categoryName.trim(),
        parentId: form.parentId,
        unit: form.unit.trim() || undefined,
        min: form.min ? Number(form.min) : undefined,
        example: form.example.trim() || undefined,
        score: form.score ? Number(form.score) : undefined,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast({ description: isEdit ? 'دسته به‌روزرسانی شد.' : 'دسته جدید ایجاد شد.' });
      onSaved();
    },
    onError: (err: Error) => setError(err.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.categoryName.trim().length < 2) {
      setError('نام دسته باید حداقل ۲ نویسه باشد.');
      return;
    }
    save.mutate();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={isEdit ? 'ویرایش دسته' : 'افزودن دسته'}>
      <button type="button" aria-label="بستن" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-lg"
      >
        <div>
          <h2 className="text-sm font-extrabold">
            {isEdit ? `ویرایش «${initial.categoryName}»` : `دسته جدید${form.parentName ? ` زیر «${form.parentName}»` : ' (ریشه)'}`}
          </h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            نام یکتا در هر سطح؛ واحد و حداقل سفارش پیش‌فرض فرم‌ها را تعیین می‌کنند.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="cat-name">نام دسته</Label>
          <Input
            id="cat-name"
            value={form.categoryName}
            onChange={(e) => setForm({ ...form, categoryName: e.target.value })}
            maxLength={80}
            autoFocus
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cat-unit">واحد فروش</Label>
            <Input
              id="cat-unit"
              value={form.unit}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              maxLength={30}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-min">حداقل سفارش</Label>
            <Input
              id="cat-min"
              type="number"
              min={0}
              value={form.min}
              onChange={(e) => setForm({ ...form, min: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="cat-example">نمونه «نوع کالا»</Label>
            <Input
              id="cat-example"
              value={form.example}
              onChange={(e) => setForm({ ...form, example: e.target.value })}
              placeholder="مثلاً: اکبری"
              maxLength={60}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="cat-score">امتیاز مرتب‌سازی</Label>
            <Input
              id="cat-score"
              type="number"
              min={0}
              value={form.score}
              onChange={(e) => setForm({ ...form, score: e.target.value })}
            />
          </div>
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="submit" className="flex-1 rounded-md" disabled={save.isPending}>
            {save.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
            {isEdit ? 'ذخیره تغییرات' : 'ایجاد دسته'}
          </Button>
          <Button type="button" variant="outline" className="rounded-md" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </form>
    </div>
  );
}

// ─── صفحه ─────────────────────────────────────────────────────────────────────

export default function AdminCategoriesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: tree, isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: fetchAdminCategoryTree,
  });

  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; initial: FormState }>({ open: false, initial: EMPTY_FORM });
  const [deleteTarget, setDeleteTarget] = useState<AdminCategoryNode | null>(null);
  const [deleteError, setDeleteError] = useState('');

  // ─── تب انواع کالا (Good) — جدول جدا از درخت (خواسته مالک ۳۰-۱۰) ────────
  const [tab, setTab] = useState<'categories' | 'goods'>('categories');
  const [goodSearch, setGoodSearch] = useState('');
  const [goodPage, setGoodPage] = useState(1);
  const [goodDelete, setGoodDelete] = useState<AdminGood | null>(null);
  const [goodDeleteError, setGoodDeleteError] = useState('');

  const goodsQuery = useQuery({
    queryKey: ['admin-goods', goodSearch, goodPage],
    queryFn: () => fetchAdminGoods({ q: goodSearch.trim() || undefined, page: goodPage, perPage: 20 }),
    enabled: tab === 'goods',
  });

  const removeGood = useMutation({
    mutationFn: (id: number) => deleteAdminGood(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-goods'] });
      toast({ description: 'نوع کالا حذف شد.' });
      setGoodDelete(null);
      setGoodDeleteError('');
    },
    onError: (err: Error) => setGoodDeleteError(err.message),
  });

  const rows = useMemo(() => {
    if (!tree) return [] as FlatRow[];
    const q = search.trim();
    if (!q) return flatten(tree);
    const hits = new Set<number>();
    collectMatchIds(tree, q, hits);
    const out: FlatRow[] = [];
    const walk = (nodes: AdminCategoryNode[], depth: number): void => {
      for (const n of nodes) {
        if (hits.has(n.id)) {
          out.push({ node: n, depth, hasChildren: n.children.length > 0 });
          walk(n.children, depth + 1);
        }
      }
    };
    walk(tree, 0);
    return out;
  }, [tree, search]);

  const remove = useMutation({
    mutationFn: (id: number) => deleteAdminCategory(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      toast({ description: 'دسته حذف شد.' });
      setDeleteTarget(null);
      setDeleteError('');
    },
    onError: (err: Error) => setDeleteError(err.message),
  });

  const toggle = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = (parent: AdminCategoryNode | null) => {
    setDialog({
      open: true,
      initial: {
        ...EMPTY_FORM,
        parentId: parent?.id ?? null,
        parentName: parent?.categoryName ?? null,
        unit: parent?.unit || 'کیلوگرم',
        min: parent ? String(parent.min || 100) : '100',
      },
    });
  };

  const openEdit = (node: AdminCategoryNode) => {
    setDialog({
      open: true,
      initial: {
        id: node.id,
        categoryName: node.categoryName,
        parentId: node.parentId,
        parentName: node.parentName,
        unit: node.unit || 'کیلوگرم',
        min: String(node.min ?? 100),
        example: node.example ?? '',
        score: String(node.score ?? 0),
      },
    });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Network size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">مدیریت دسته‌بندی‌ها و انواع کالا</h1>
            <p className="text-[11px] text-muted-foreground">
              درخت سه‌سطحی دسته‌ها + انواع کالای کاربران — تغییر نام بلافاصله روی همه آگهی‌ها اعمال می‌شود (join)
            </p>
          </div>
        </div>
        {tab === 'categories' && (
          <Button className="rounded-md" onClick={() => openCreate(null)}>
            <Plus size={16} /> دسته ریشه جدید
          </Button>
        )}
      </div>

      {/* تب‌ها — دسته‌ها | انواع کالا */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab('categories')}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-bold transition-colors',
            tab === 'categories'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:border-primary/40',
          )}
        >
          <Network size={14} /> دسته‌بندی‌ها
        </button>
        <button
          type="button"
          onClick={() => setTab('goods')}
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-md border px-3.5 py-2 text-xs font-bold transition-colors',
            tab === 'goods'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:border-primary/40',
          )}
        >
          <Package size={14} /> انواع کالا {goodsQuery.data ? `(${toFa(goodsQuery.data.total)})` : ''}
        </button>
      </div>

      {tab === 'goods' ? (
        <>
          {/* جستجوی نوع کالا */}
          <div className="relative">
            <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              value={goodSearch}
              onChange={(e) => {
                setGoodSearch(e.target.value);
                setGoodPage(1);
              }}
              placeholder="جستجوی نام نوع کالا…"
              className="rounded-md pe-9"
            />
          </div>

          {/* جدول انواع کالا */}
          <div className="overflow-hidden rounded-lg border bg-card">
            {goodsQuery.isLoading ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-11 rounded-md" />
                ))}
              </div>
            ) : !goodsQuery.data || goodsQuery.data.items.length === 0 ? (
              <p className="p-10 text-center text-sm text-muted-foreground">
                {goodSearch.trim() ? 'نوع کالایی با این نام پیدا نشد.' : 'هنوز نوع کالایی توسط کاربران وارد نشده است.'}
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-secondary/40 text-[11px] text-muted-foreground">
                    <th className="px-3 py-2.5 text-right font-medium">نام نوع</th>
                    <th className="px-2 py-2.5 text-right font-medium">مسیر دسته</th>
                    <th className="hidden px-2 py-2.5 text-right font-medium sm:table-cell">دفعات استفاده</th>
                    <th className="hidden px-2 py-2.5 text-right font-medium md:table-cell">درخواست فعال</th>
                    <th className="hidden px-2 py-2.5 text-right font-medium lg:table-cell">تاریخ ایجاد</th>
                    <th className="px-3 py-2.5 text-left font-medium">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {goodsQuery.data.items.map((g) => (
                    <tr key={g.id} className="border-b last:border-0 hover:bg-secondary/30">
                      <td className="px-3 py-2.5">
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">نوع کالا</span>
                        <span className="ms-2 font-bold">{g.name}</span>
                      </td>
                      <td className="px-2 py-2.5 text-xs text-muted-foreground">{g.categoryPath}</td>
                      <td className="hidden px-2 py-2.5 text-xs tabular-nums sm:table-cell">{toFa(g.usageCount)}</td>
                      <td className="hidden px-2 py-2.5 text-xs tabular-nums text-muted-foreground md:table-cell">
                        {g.requestCount > 0 ? toFa(g.requestCount) : '—'}
                      </td>
                      <td className="hidden px-2 py-2.5 text-xs text-muted-foreground lg:table-cell">{dateFa(g.createdAt)}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setGoodDeleteError('');
                              setGoodDelete(g);
                            }}
                            title="حذف"
                            className="grid size-7 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* صفحه‌بندی انواع کالا */}
          {goodsQuery.data && goodsQuery.data.pageCount > 1 && (
            <div className="flex items-center justify-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={goodPage <= 1}
                onClick={() => setGoodPage((p) => p - 1)}
                aria-label="صفحه قبل"
              >
                <ChevronRight size={16} />
              </Button>
              <span className="font-num px-2 text-xs text-muted-foreground">
                {toFa(goodPage)} از {toFa(goodsQuery.data.pageCount)}
              </span>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={goodPage >= goodsQuery.data.pageCount}
                onClick={() => setGoodPage((p) => p + 1)}
                aria-label="صفحه بعد"
              >
                <ChevronLeft size={16} />
              </Button>
            </div>
          )}

          <p className="text-[11px] leading-5 text-muted-foreground">
            «نوع کالا» ورودی آزاد کاربران است (مثل: اکبری، فندقی) و جدولی جدا از دسته‌بندی‌ها دارد؛
            در سایدبار و فیلتر لیست محصولات هرگز نمایش داده نمی‌شود. حذف فقط زمانی ممکن است که درخواستی به آن ارجاع نداشته باشد.
          </p>

          {/* دیالوگ حذف نوع کالا */}
          {goodDelete ? (
            <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="حذف نوع کالا">
              <button type="button" aria-label="بستن" className="absolute inset-0 bg-black/40" onClick={() => setGoodDelete(null)} />
              <div className="relative w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-lg">
                <h2 className="text-sm font-extrabold">حذف نوع کالای «{goodDelete.name}»</h2>
                <p className="text-xs leading-6 text-muted-foreground">
                  این عملیات قابل بازگشت نیست. نوع کالایی که درخواستی به آن ارجاع دارد حذف نمی‌شود.
                </p>
                {goodDeleteError && (
                  <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">{goodDeleteError}</p>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    className="flex-1 rounded-md"
                    disabled={removeGood.isPending}
                    onClick={() => removeGood.mutate(goodDelete.id)}
                  >
                    {removeGood.isPending ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={15} />}
                    حذف قطعی
                  </Button>
                  <Button variant="outline" className="rounded-md" onClick={() => setGoodDelete(null)}>
                    انصراف
                  </Button>
                </div>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <>
      {/* جستجو */}
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="جستجوی نام دسته…"
          className="rounded-md pe-9"
        />
      </div>

      {/* جدول درخت */}
      <div className="overflow-hidden rounded-lg border bg-card">
        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-11 rounded-md" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="p-10 text-center text-sm text-muted-foreground">
            {search.trim() ? 'دسته‌ای با این نام پیدا نشد.' : 'هنوز دسته‌ای ثبت نشده است.'}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-secondary/40 text-[11px] text-muted-foreground">
                <th className="px-3 py-2.5 text-right font-medium">نام</th>
                <th className="hidden px-2 py-2.5 text-right font-medium md:table-cell">واحد</th>
                <th className="hidden px-2 py-2.5 text-right font-medium md:table-cell">حداقل</th>
                <th className="hidden px-2 py-2.5 text-right font-medium lg:table-cell">امتیاز</th>
                <th className="px-2 py-2.5 text-right font-medium">آگهی</th>
                <th className="hidden px-2 py-2.5 text-right font-medium sm:table-cell">درخواست</th>
                <th className="px-3 py-2.5 text-left font-medium">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ node, depth, hasChildren }) => {
                const open = expanded.has(node.id) || !!search.trim();
                return (
                  <tr key={node.id} className="border-b last:border-0 hover:bg-secondary/30">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5" style={{ paddingInlineStart: depth * 20 }}>
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggle(node.id)}
                            aria-label={open ? 'جمع کردن' : 'باز کردن'}
                            className="grid size-6 shrink-0 place-items-center rounded-sm text-muted-foreground hover:bg-secondary"
                          >
                            {open ? <ChevronDown size={15} /> : <ChevronLeft size={15} />}
                          </button>
                        ) : (
                          <span className="inline-block size-6 shrink-0" aria-hidden />
                        )}
                        <span className="truncate font-bold">{node.categoryName}</span>
                      </div>
                    </td>
                    <td className="hidden px-2 py-2.5 text-xs text-muted-foreground md:table-cell">{node.unit || '—'}</td>
                    <td className="hidden px-2 py-2.5 text-xs text-muted-foreground md:table-cell">
                      {node.min ? toFa(node.min) : '—'}
                    </td>
                    <td className="hidden px-2 py-2.5 text-xs text-muted-foreground lg:table-cell">
                      {toFa(node.score || 0)}
                    </td>
                    <td className="px-2 py-2.5 text-xs tabular-nums">
                      {node.productCount > 0 ? toFa(node.productCount) : '—'}
                    </td>
                    <td className="hidden px-2 py-2.5 text-xs tabular-nums text-muted-foreground sm:table-cell">
                      {node.requestCount > 0 ? toFa(node.requestCount) : '—'}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center justify-end gap-1">
                        {depth < 2 ? (
                          <button
                            type="button"
                            onClick={() => openCreate(node)}
                            title={`زیرمجموعه جدید زیر «${node.categoryName}»`}
                            className="grid size-7 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                          >
                            <Plus size={15} />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => openEdit(node)}
                          title="ویرایش"
                          className="grid size-7 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError('');
                            setDeleteTarget(node);
                          }}
                          title="حذف"
                          className="grid size-7 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-[11px] leading-5 text-muted-foreground">
        حذف دسته فقط زمانی ممکن است که فرزند یا ارجاعی (آگهی/درخواست خرید) نداشته باشد.
      </p>
        </>
      )}

      <CategoryDialog
        open={dialog.open}
        initial={dialog.initial}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        onSaved={() => setDialog((d) => ({ ...d, open: false }))}
      />

      {/* دیالوگ حذف */}
      {deleteTarget ? (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label="حذف دسته">
          <button type="button" aria-label="بستن" className="absolute inset-0 bg-black/40" onClick={() => setDeleteTarget(null)} />
          <div className="relative w-full max-w-sm space-y-4 rounded-xl border bg-card p-6 shadow-lg">
            <h2 className="text-sm font-extrabold">حذف «{deleteTarget.categoryName}»</h2>
            <p className="text-xs leading-6 text-muted-foreground">
              این عملیات قابل بازگشت نیست. دسته‌ای که فرزند یا ارجاع دارد حذف نمی‌شود.
            </p>
            {deleteError && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs leading-5 text-destructive">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <Button
                variant="destructive"
                className="flex-1 rounded-md"
                disabled={remove.isPending}
                onClick={() => remove.mutate(deleteTarget.id)}
              >
                {remove.isPending ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={15} />}
                حذف قطعی
              </Button>
              <Button variant="outline" className="rounded-md" onClick={() => setDeleteTarget(null)}>
                انصراف
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
