'use client';

/**
 * قطعات مشترک «پیگیری‌ها» (CRM کوچک ایمچ):
 * چیپ وضعیت، ردیف انتخاب وضعیت، فهرست یادداشت‌ها و افزودن یادداشت.
 * هم در دیالوگ ذخیره (SaveFollowButton) و هم صفحه جزئیات پرونده استفاده می‌شود.
 */

import { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Minus, NotebookPen, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  FOLLOW_PRIORITIES,
  FOLLOW_PRIORITY_MAP,
  FOLLOW_STATUSES,
  FOLLOW_STATUS_MAP,
  followDueLabel,
  followPriorityOf,
} from '@/lib/follow';
import { dateFa, parseServerDate, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { FollowNote, FollowPriority, FollowStatus } from '@/lib/types';

/** ساعت و دقیقه به فرمت دو رقمی — تاریخ بک‌اند با parseServerDate نرمال می‌شود */
function hhmm(raw: string): string {
  const d = new Date(parseServerDate(raw));
  const p = (n: number) => n.toLocaleString('en-US', { minimumIntegerDigits: 2 });
  return `${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** چیپ رنگی وضعیت — فقط نمایشی */
export function StatusChip({ status, className }: { status: FollowStatus; className?: string }) {
  const meta = FOLLOW_STATUS_MAP[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold', meta.tone, className)}>
      <span className={cn('size-1.5 rounded-full', meta.dot)} />
      {meta.label}
    </span>
  );
}

/** آیکون جهت اولویت — بالا / کم / خط برای متوسط */
function PriorityArrow({ priority, size = 12 }: { priority: FollowPriority; size?: number }) {
  if (priority === 1) return <ArrowUp size={size} className="shrink-0" />;
  if (priority === 3) return <ArrowDown size={size} className="shrink-0" />;
  return <Minus size={size} className="shrink-0" />;
}

/** چیپ اولویت — نمایشی (خواسته مالک ۷-۱۱). متوسط پیش‌فرض است و فقط با
 *  showNormal دیده می‌شود تا نوار اقدام ردیف شلوغ نشود. */
export function PriorityChip({
  priority,
  showNormal = false,
  className,
}: {
  priority: FollowPriority | number | null | undefined;
  showNormal?: boolean;
  className?: string;
}) {
  const p = followPriorityOf({ priority: priority ?? null });
  const meta = FOLLOW_PRIORITY_MAP[p];
  if (p === 2 && !showNormal) return null;
  return (
    <span
      className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[10.5px] font-bold', meta.tone, className)}
      title={`اولویت: ${meta.label} — ${meta.hint}`}
    >
      <PriorityArrow priority={p} size={11} />
      {meta.label}
    </span>
  );
}

/** ردیف انتخاب اولویت — سه چیپ قابل انتخاب («تغییر اولویت»، خواسته مالک ۷-۱۱) */
export function PriorityChipsRow({
  value,
  onChange,
  disabled,
}: {
  value: FollowPriority;
  onChange: (priority: FollowPriority) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="اولویت سرنخ" className="flex flex-wrap gap-2">
      {FOLLOW_PRIORITIES.map((p) => {
        const selected = p.key === value;
        return (
          <button
            key={p.key}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            title={p.hint}
            onClick={() => onChange(p.key)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : cn(p.tone, 'hover:brightness-95'),
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            <PriorityArrow priority={p.key} size={11} />
            <span className="ms-1">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

/** یادآور «پیگیری بعدی N روز دیگر» — اینپوت عددی ساده (خواسته مالک ۷-۱۱:
 *  «لازم نیست کامپوننت تاریخ بگذاریم که کار را سخت کند — مثلاً یک نامبر اینپوت»).
 *  یادآور فعلی بالای فرم دیده می‌شود؛ ارسال 0 یعنی حذف یادآور. */
export function NextFollowComposer({
  current,
  onSubmit,
  disabled,
}: {
  /** تاریخ یادآور فعلی — null یعنی بدون یادآور */
  current: string | null | undefined;
  onSubmit: (days: number) => void;
  disabled?: boolean;
}) {
  const [text, setText] = useState('');
  const parsed = Math.min(365, Math.max(0, Math.floor(Number(text))));
  const valid = text !== '' && Number.isFinite(Number(text)) && parsed >= 0;
  const currentLabel = followDueLabel(current ?? null);

  const submit = (days: number) => {
    if (disabled) return;
    onSubmit(days);
    setText('');
  };

  return (
    <div className="space-y-1.5">
      {current ? (
        <p className="flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-[11px] font-bold text-amber-700">
          <span className="size-1.5 shrink-0 rounded-full bg-amber-500" aria-hidden />
          یادآور فعلی: {currentLabel}
        </p>
      ) : (
        <p className="text-[11px] leading-5 text-muted-foreground">
          یادآوری ثبت نشده — با یک عدد مشخص کنید چند روز دیگر پیگیری کنید.
        </p>
      )}
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-xs font-bold text-muted-foreground">پیگیری بعدی</span>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={365}
          value={text}
          disabled={disabled}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && valid) submit(parsed);
          }}
          aria-label="چند روز دیگر پیگیری شود"
          className="h-9 w-20 rounded-md text-center font-num text-sm"
          placeholder="۳"
        />
        <span className="shrink-0 text-xs text-muted-foreground">روز دیگر</span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="ms-auto shrink-0 rounded-md text-xs"
          disabled={disabled || !valid}
          onClick={() => submit(parsed)}
        >
          ثبت
        </Button>
      </div>
      {current && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => submit(0)}
          className="text-[11px] font-bold text-muted-foreground underline-offset-4 transition-colors hover:text-red-500 hover:underline disabled:opacity-50"
        >
          حذف یادآور
        </button>
      )}
    </div>
  );
}

/**
 * ردیف انتخاب وضعیت — پنج گزینه قیف به‌صورت چیپ‌های قابل انتخاب.
 * value وضعیت فعلی، onChange هنگام انتخاب.
 */
export function StatusChipsRow({
  value,
  onChange,
  disabled,
}: {
  value: FollowStatus;
  onChange: (status: FollowStatus) => void;
  disabled?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label="وضعیت سرنخ" className="flex flex-wrap gap-2">
      {FOLLOW_STATUSES.map((s) => {
        const selected = s.key === value;
        return (
          <button
            key={s.key}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={disabled}
            title={s.hint}
            onClick={() => onChange(s.key)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-[11px] font-bold transition-colors',
              selected
                ? 'border-primary bg-primary text-primary-foreground'
                : cn(s.tone, 'hover:brightness-95'),
              disabled && 'cursor-not-allowed opacity-60',
            )}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

/** فهرست یادداشت‌های زمان‌دار — جدیدترین آخر */
export function NotesList({ notes }: { notes: FollowNote[] }) {
  if (notes.length === 0) {
    return (
      <p className="rounded-md bg-secondary/60 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
        یادداشتی ثبت نشده است — قیمت توافقی، کیفیت یا قرار ملاقات را اینجا یادداشت کنید.
      </p>
    );
  }
  return (
    <ul className="space-y-1.5">
      {[...notes]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .map((n) => (
          <li key={n.id} className="rounded-md border bg-secondary/40 px-3 py-2 text-xs leading-5">
            <span className="mb-0.5 block text-[10px] text-muted-foreground">
              {dateFa(parseServerDate(n.createdAt))} — {toFa(hhmm(n.createdAt))}
            </span>
            {n.text}
          </li>
        ))}
    </ul>
  );
}

/** افزودن یادداشت — متن اجباری نیست، دکمه تا تایپ غیرفعال است */
export function NoteComposer({
  onSubmit,
  disabled,
  placeholder = 'مثلاً: قیمت ۴۸ هزار گفت، جمعه دوباره تماس می‌گیرم.',
}: {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState('');
  const submit = () => {
    if (!text.trim() || disabled) return;
    onSubmit(text.trim());
    setText('');
  };
  return (
    <div className="space-y-2">
      <Textarea
        dir="rtl"
        rows={2}
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit();
        }}
        className="resize-none text-xs leading-6"
        placeholder={placeholder}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="rounded-md text-xs"
        disabled={disabled || !text.trim()}
        onClick={submit}
      >
        <NotebookPen size={13} /> ثبت یادداشت
      </Button>
    </div>
  );
}

/** سرتیتر کوچک بخش‌ها داخل کارت/دیالوگ */
export function FollowLabel({ children }: { icon?: React.ComponentType<{ size?: number; className?: string }>; children: React.ReactNode }) {
  return (
    <p className="mb-1.5 flex items-center gap-1 text-[11px] font-bold text-muted-foreground">
      <StickyNote size={12} className="shrink-0" /> {children}
    </p>
  );
}

/** نشان انتخاب در ردیف پرونده */
export function CheckMark({ show }: { show: boolean }) {
  return show ? <Check size={16} className="shrink-0 text-primary" /> : <span className="size-4 shrink-0 rounded-full border" />;
}
