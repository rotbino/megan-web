'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

/** آکاردئون راهنما — مطالب پیشنهادی و پرسش‌های همیشگی */
export function HelpAccordion({
  title,
  subtitle,
  body,
}: {
  title: string;
  subtitle?: string;
  body: string;
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
      {open && <p className="px-4 pb-4 text-[11px] leading-6 text-muted-foreground">{body}</p>}
    </div>
  );
}
