'use client';

/**
 * قطعات مشترک «پیگیری‌ها» (CRM کوچک ایمچ):
 * چیپ وضعیت، ردیف انتخاب وضعیت، فهرست یادداشت‌ها و افزودن یادداشت.
 * هم در دیالوگ ذخیره (SaveFollowButton) و هم صفحه جزئیات پرونده استفاده می‌شود.
 */

import { useState } from 'react';
import { Check, NotebookPen, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FOLLOW_STATUSES, FOLLOW_STATUS_MAP } from '@/lib/follow';
import { dateFa, parseServerDate, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { FollowNote, FollowStatus } from '@/lib/types';

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
    <div role="radiogroup" aria-label="وضعیت پیگیری" className="flex flex-wrap gap-2">
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
