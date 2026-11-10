'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/** آکاردئون راهنما — مطالب پیشنهادی و پرسش‌های همیشگی */
export function HelpAccordion({
  title,
  subtitle,
  body,
  href,
}: {
  title: string;
  subtitle?: string;
  body: string;
  href?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 p-4 text-start transition-colors hover:bg-secondary/40"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-extrabold leading-5">{title}</span>
          {subtitle && <span className="mt-0.5 block text-[11px] text-muted-foreground">{subtitle}</span>}
        </span>
        <span
          className={cn(
            'grid size-6 shrink-0 place-items-center rounded-full bg-secondary text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
          aria-hidden
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
      {open && (
        <div className="px-4 pb-4">
          <p className="text-[11px] leading-6 text-muted-foreground">{body}</p>
          {href && (
            <a href={href} className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
              مشاهده راهنمای کامل ↖
            </a>
          )}
        </div>
      )}
    </div>
  );
}
