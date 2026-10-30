'use client';

/**
 * مرحله ۱ — انتخاب دسته بندی (الگوی باسکول + جستجوی سریع):
 *  • جعبه جستجو: با تایپ (مثلا «سیب») لیستی از مسیرهای کامل باز می‌شود —
 *    «کشاورزی > میوه > سیب»، «کشاورزی > صیفی > سیب زمینی»، «مواد غذایی > کنسرو > کنسرو سیب» —
 *    و کاربر با یک کلیک دسته محصولش را انتخاب می‌کند.
 *  • دسکتاپ: سه ستون آبشاری (دسته اصلی → زیردسته → نوع کالا).
 *  • موبایل: پیمایش تک‌سطحی با چیپ مسیر + دکمه بازگشت.
 * تا «برگ» (نود بی‌فرزند) پایین می‌رویم؛ مسیر انتخابی بالای دکمه‌ها نشان داده می‌شود.
 */

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw, Search, X } from 'lucide-react';
import { useCategoryTree } from '@/lib/mock/hooks';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

function isLeaf(c: Category): boolean {
  return !c.children || c.children.length === 0;
}

/** نرمال‌سازی فارسی جستجو — ی/ک عربی، نیم‌فاصله و فاصله‌های تکراری */
function normalizeFa(s: string): string {
  return s
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/** برگ + مسیر کامل — واحد نتیجه جستجو */
interface LeafPath {
  node: Category;
  path: Category[];
}

export function CategoryCascade({
  value,
  onChange,
}: {
  value: { path: Category[]; leaf: Category | null };
  onChange: (v: { path: Category[]; leaf: Category | null }) => void;
}) {
  const { data: tree } = useCategoryTree();
  const [l1, setL1] = useState<Category | null>(value.path[0] ?? null);
  const [l2, setL2] = useState<Category | null>(value.path[1] ?? null);
  const [query, setQuery] = useState('');

  const path = useMemo(() => value.path, [value.path]);

  // ─── جستجوی سریع — همه برگ‌های درخت با مسیر کامل (flat، یک‌بار memo) ───
  const leaves = useMemo<LeafPath[]>(() => {
    const out: LeafPath[] = [];
    const walk = (nodes: Category[], trail: Category[]) => {
      for (const n of nodes) {
        const p = [...trail, n];
        if (n.children && n.children.length > 0) walk(n.children, p);
        else out.push({ node: n, path: p });
      }
    };
    walk(tree ?? [], []);
    return out;
  }, [tree]);

  const q = normalizeFa(query);
  const searching = q.length >= 2;
  const results = useMemo(
    () =>
      searching
        ? leaves
            .filter(({ path: p }) => p.some((c) => normalizeFa(c.categoryName).includes(q)))
            .slice(0, 20)
        : [],
    [leaves, q, searching],
  );

  const pickSearchResult = (r: LeafPath) => {
    setL1(r.path[0] ?? null);
    setL2(r.path[1] ?? null);
    onChange({ path: r.path, leaf: r.node });
    setQuery('');
  };

  const pickL1 = (c: Category) => {
    setL1(c);
    setL2(null);
    onChange({ path: [c], leaf: null });
  };

  const pickL2 = (c: Category) => {
    setL2(c);
    if (isLeaf(c)) {
      onChange({ path: [l1!, c], leaf: c });
    } else {
      onChange({ path: [l1!, c], leaf: null });
    }
  };

  const pickLeaf = (c: Category) => {
    onChange({ path: [l1!, l2!, c], leaf: c });
  };

  const reset = () => {
    setL1(null);
    setL2(null);
    setQuery('');
    onChange({ path: [], leaf: null });
  };

  if (!tree) {
    return <div className="grid h-40 place-items-center text-sm text-muted-foreground">در حال بارگذاری دسته‌بندی‌ها…</div>;
  }

  const roots = tree;
  const l2Items = l1?.children ?? [];
  const l3Items = l2?.children ?? [];

  // ─── موبایل: پیمایش تک‌سطحی ───
  const mobileLevel: 0 | 1 | 2 = !l1 ? 0 : !l2 ? 1 : 2;
  const mobileItems = mobileLevel === 0 ? roots : mobileLevel === 1 ? l2Items : l3Items;
  const mobileTitle = mobileLevel === 0 ? 'دسته بندی' : mobileLevel === 1 ? 'زیردسته' : 'نوع کالا';

  return (
    <div>
      {/* ─── جعبه جستجوی دسته — مشترک دسکتاپ/موبایل (خواسته مالک) ─── */}
      <div className="mb-3">
        <div className="relative">
          <Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="جستجوی سریع دسته بندی — مثلا «سیب»"
            className="h-11 w-full rounded-lg border bg-card pe-9 ps-9 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-primary"
            aria-label="جستجوی دسته بندی"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="پاک کردن جستجو"
            >
              <X size={15} />
            </button>
          ) : (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground/60">
              یا انتخاب دستی
            </span>
          )}
        </div>

        {/* لیست نتایج — مسیر کامل هر برگ: «کشاورزی > میوه > سیب» */}
        {searching && (
          <div className="mt-2 overflow-hidden rounded-lg border bg-card">
            {results.length === 0 ? (
              <p className="px-4 py-6 text-center text-xs leading-6 text-muted-foreground">
                دسته‌ای مطابق «{query}» پیدا نشد — املای عبارت را بررسی کنید
                <br />
                یا از انتخاب دستی (ستون‌های پایین) استفاده کنید.
              </p>
            ) : (
              <ul className="max-h-80 divide-y divide-border/60 overflow-y-auto">
                {results.map((r) => (
                  <li key={r.node.id}>
                    <button
                      type="button"
                      onClick={() => pickSearchResult(r)}
                      className="flex w-full items-center gap-1 px-3.5 py-2.5 text-start text-[13px] transition-colors hover:bg-secondary/70"
                    >
                      <Search size={13} className="shrink-0 text-muted-foreground/50" />
                      <span className="flex flex-wrap items-center gap-0.5 leading-6">
                        {r.path.map((c, i) => {
                          const last = i === r.path.length - 1;
                          return (
                            <span key={c.id} className="flex items-center gap-0.5">
                              {i > 0 && <ChevronLeft size={11} className="text-muted-foreground/40" aria-hidden />}
                              <span className={last ? 'font-bold text-primary' : 'text-muted-foreground'}>
                                {c.categoryName}
                              </span>
                            </span>
                          );
                        })}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* دسکتاپ — سه ستون آبشاری (فقط وقتی جستجو فعال نیست) */}
      {!searching && (
        <div className="hidden gap-3 lg:grid lg:grid-cols-3">
          <Column title="دسته اصلی" active>
            {roots.map((c) => (
              <ListButton key={c.id} active={l1?.id === c.id} onClick={() => pickL1(c)}>
                {c.categoryName}
              </ListButton>
            ))}
          </Column>
          <Column title="زیردسته" active={Boolean(l1)}>
            {!l1 ? (
              <Empty>ابتدا دسته اصلی را انتخاب کنید</Empty>
            ) : l2Items.length === 0 ? (
              <Empty>زیردسته‌ای ثبت نشده است</Empty>
            ) : (
              l2Items.map((c) => (
                <ListButton key={c.id} active={l2?.id === c.id} onClick={() => pickL2(c)}>
                  {c.categoryName}
                </ListButton>
              ))
            )}
          </Column>
          <Column title="نوع کالا" active={Boolean(l2)}>
            {!l2 ? (
              <Empty>زیردسته را انتخاب کنید</Empty>
            ) : isLeaf(l2) ? (
              <Empty>{`«${l2.categoryName}» خودش نوع کالاست`}</Empty>
            ) : (
              l3Items.map((c) => (
                <ListButton key={c.id} active={value.leaf?.id === c.id} onClick={() => pickLeaf(c)} leaf>
                  {c.categoryName}
                </ListButton>
              ))
            )}
          </Column>
        </div>
      )}

      {/* موبایل — سطح به سطح (فقط وقتی جستجو فعال نیست) */}
      {!searching && (
        <div className="lg:hidden">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground">{mobileTitle}</p>
            {(l1 || path.length > 0) && (
              <button type="button" onClick={reset} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <RotateCcw size={13} /> پاک کردن
              </button>
            )}
          </div>
          {mobileLevel > 0 && (
            <button
              type="button"
              onClick={() => (mobileLevel === 1 ? reset() : setL2(null))}
              className="mb-2 flex items-center gap-1 rounded-md bg-secondary px-2.5 py-1.5 text-xs font-bold text-muted-foreground"
            >
              <ChevronRight size={14} /> {mobileLevel === 1 ? 'همه دسته ها' : l1?.categoryName}
            </button>
          )}
          <ul className="divide-y divide-border/70 overflow-hidden rounded-lg border bg-card">
            {mobileItems.length === 0 && <li className="px-4 py-6 text-center text-xs text-muted-foreground">موردی نیست</li>}
            {mobileItems.map((c) => {
              const selected =
                mobileLevel === 0 ? l1?.id === c.id : mobileLevel === 1 ? l2?.id === c.id : value.leaf?.id === c.id;
              const clickable = mobileLevel < 2 || isLeaf(c);
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => (mobileLevel === 0 ? pickL1(c) : mobileLevel === 1 ? pickL2(c) : pickLeaf(c))}
                    className={cn(
                      'flex w-full items-center justify-between px-4 py-3 text-sm transition-colors',
                      selected ? 'font-bold text-primary' : 'hover:bg-secondary/70',
                      !clickable && 'cursor-not-allowed opacity-60',
                    )}
                  >
                    {c.categoryName}
                    {!isLeaf(c) && <ChevronLeft size={16} className="text-muted-foreground" />}
                    {isLeaf(c) && mobileLevel === 2 && selected && <span className="text-[11px]">انتخاب شد</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* مسیر انتخابی — «دسته بندی انتخابی شما:» (عین باسکول) */}
      {path.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-md border border-dashed bg-secondary/50 p-3">
          <span className="text-xs font-bold text-muted-foreground">دسته بندی انتخابی شما:</span>
          {path.map((c) => (
            <span key={c.id} className="flex items-center gap-1 text-xs font-bold text-primary">
              {c.categoryName}
              {c.id !== path[path.length - 1].id && <ChevronLeft size={12} className="text-muted-foreground" />}
            </span>
          ))}
          <button type="button" onClick={reset} className="ms-auto flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500">
            <RotateCcw size={13} /> پاک کردن
          </button>
        </div>
      )}
    </div>
  );
}

function Column({ title, active, children }: { title: string; active: boolean; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-lg border bg-card', !active && 'opacity-70')}>
      <p className="border-b border-border/70 px-3 py-2 text-xs font-bold text-muted-foreground">{title}</p>
      <ul className="max-h-72 overflow-y-auto p-1.5">{children}</ul>
    </div>
  );
}

function ListButton({
  active,
  onClick,
  children,
  leaf,
  disabled,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  leaf?: boolean;
  disabled?: boolean;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
          'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-sm transition-colors',
          active ? 'font-bold text-primary' : 'hover:bg-secondary',
          disabled && 'cursor-not-allowed',
        )}
      >
        {children}
        {!leaf && <ChevronLeft size={15} className={active ? '' : 'text-muted-foreground/60'} />}
      </button>
    </li>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <li className="px-3 py-6 text-center text-xs leading-5 text-muted-foreground">{children}</li>;
}
