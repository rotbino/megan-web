'use client';

/**
 * مرحله ۱ — انتخاب دسته بندی (الگوی باسکول):
 * دسکتاپ: سه ستون آبشاری (دسته اصلی → زیردسته → نوع کالا).
 * موبایل: پیمایش تک‌سطحی با چیپ مسیر + دکمه بازگشت.
 * تا «برگ» (نود بی‌فرزند) پایین می‌رویم؛ مسیر انتخابی بالای دکمه‌ها نشان داده می‌شود.
 */

import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { useCategoryTree } from '@/lib/mock/hooks';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

function isLeaf(c: Category): boolean {
  return !c.children || c.children.length === 0;
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

  const path = useMemo(() => value.path, [value.path]);

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
      {/* دسکتاپ — سه ستون آبشاری */}
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

      {/* موبایل — سطح به سطح */}
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
                    selected ? 'bg-primary/10 font-bold text-primary' : 'hover:bg-secondary/70',
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
          active ? 'bg-primary font-bold text-primary-foreground' : 'hover:bg-secondary',
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
