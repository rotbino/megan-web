'use client';

/**
 * پنل پیشرفت جاب ایمپورتر — چک‌لیست مراحل + شمارنده‌ها + لاگ زنده + دکمهٔ توقف.
 * هر ۱.۵ ثانیه از بک‌اند وضعیت را می‌گیرد (جاب در پس‌زمینهٔ سرور اجرا می‌شود
 * و با refresh شدن صفحه هم از دست نمی‌رود).
 */

import { useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Check,
  CircleDashed,
  Loader2,
  OctagonX,
  SkipForward,
  XCircle,
} from 'lucide-react';
import type { ImportJob, LogLine } from '@/lib/importer/client';
import { cn } from '@/lib/utils';

const LEVEL_STYLE: Record<LogLine['level'], string> = {
  info: 'text-muted-foreground',
  success: 'text-emerald-600',
  warn: 'text-amber-600',
  error: 'text-red-600',
};

function StepIcon({ status }: { status: ImportJob['steps'][number]['status'] }) {
  switch (status) {
    case 'done':
      return <Check size={15} className="mt-0.5 shrink-0 text-emerald-600" />;
    case 'active':
      return <Loader2 size={15} className="mt-0.5 shrink-0 animate-spin text-primary" />;
    case 'failed':
      return <XCircle size={15} className="mt-0.5 shrink-0 text-red-600" />;
    case 'skipped':
      return <SkipForward size={15} className="mt-0.5 shrink-0 text-muted-foreground/60" />;
    default:
      return <CircleDashed size={15} className="mt-0.5 shrink-0 text-muted-foreground/40" />;
  }
}

export function JobPanel({
  job,
  onStop,
}: {
  job: ImportJob;
  onStop: (id: string) => void;
}) {
  const logRef = useRef<HTMLDivElement>(null);

  // اسکرول خودکار لاگ به پایین
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [job.log.length]);

  const elapsed = Math.max(0, ((job.finishedAt ?? Date.now()) - job.startedAt) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = Math.floor(elapsed % 60);

  const counterEntries = Object.entries(job.counters).filter(([k]) => !k.startsWith('buskool'));

  return (
    <div className="mt-4 rounded-lg border bg-card">
      {/* هدر جاب */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
          {job.status === 'running' && <Loader2 size={16} className="animate-spin text-primary" />}
          {job.status === 'done' && <Check size={16} className="text-emerald-600" />}
          {job.status === 'failed' && <XCircle size={16} className="text-red-600" />}
          {job.status === 'stopped' && <OctagonX size={16} className="text-amber-600" />}
          <span>
            {job.kind === 'single' ? 'ایمپورت تک‌کاربره' : 'ایمپورت لیستی'}
            {job.userName ? ` — ${job.userName}` : ''}
          </span>
          <span className="font-mono text-xs font-normal text-muted-foreground">#{job.id}</span>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span dir="ltr" className="font-mono">
            {minutes}:{String(seconds).padStart(2, '0')}
          </span>
          {job.status === 'running' && (
            <button
              type="button"
              onClick={() => onStop(job.id)}
              className="flex items-center gap-1 rounded-md border border-red-200 bg-red-50 px-2 py-1 font-bold text-red-700 transition-colors hover:bg-red-100"
            >
              <OctagonX size={14} />
              توقف
            </button>
          )}
        </div>
      </div>

      {/* پیشرفت لیستی */}
      {job.kind === 'list' && typeof job.totalUsers === 'number' && job.totalUsers > 0 && (
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              کاربر {job.currentUserIndex ?? 0} از {job.totalUsers}
              {job.currentUser ? ` — در حال پردازش: ${job.currentUser}` : ''}
            </span>
            <span>
              {job.usersDone ?? 0} موفق / {job.usersFailed ?? 0} خطا
              {job.counters.usersSkipped ? ` / ${job.counters.usersSkipped.toLocaleString('fa-IR')} ردشده` : ''}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, ((job.currentUserIndex ?? 0) / job.totalUsers) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="grid gap-0 md:grid-cols-[280px_1fr]">
        {/* مراحل + شمارنده‌ها */}
        <div className="border-b p-4 md:border-b-0 md:border-l">
          <ul className="space-y-1.5 text-sm">
            {job.steps.map((s) => (
              <li key={s.key} className="flex items-center gap-2">
                <StepIcon status={s.status} />
                <span className={cn(s.status === 'pending' && 'text-muted-foreground/60')}>{s.label}</span>
              </li>
            ))}
          </ul>
          {counterEntries.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {counterEntries.map(([k, v]) => (
                <div key={k} className="rounded-md border bg-muted/30 p-2 text-center">
                  <div className="text-lg font-extrabold text-primary">{v.toLocaleString('fa-IR')}</div>
                  <div className="text-[11px] text-muted-foreground">{COUNTER_LABELS[k] ?? k}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* لاگ */}
        <div className="p-4">
          <div
            ref={logRef}
            dir="rtl"
            className="h-64 overflow-y-auto rounded-md border bg-slate-950 p-3 font-mono text-[12.5px] leading-6"
            role="log"
            aria-label="گزارش زندهٔ ایمپورت"
          >
            {job.log.map((l, i) => (
              <div key={i} className="flex gap-2">
                <span className="shrink-0 text-slate-600" dir="ltr">
                  {new Date(l.t).toLocaleTimeString('fa-IR', { hour12: false })}
                </span>
                <span
                  className={cn(
                    'whitespace-pre-wrap break-words',
                    l.level === 'success' && 'text-emerald-400',
                    l.level === 'info' && 'text-slate-300',
                    l.level === 'warn' && 'text-amber-400',
                    l.level === 'error' && 'text-red-400',
                  )}
                >
                  {l.msg}
                </span>
              </div>
            ))}
            {job.status === 'running' && <span className="animate-pulse text-slate-500">…</span>}
          </div>
          {job.error && (
            <div className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700">
              <AlertTriangle size={15} className="mt-0.5 shrink-0" />
              <span className="whitespace-pre-wrap">{job.error}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const COUNTER_LABELS: Record<string, string> = {
  products: 'آگهی ثبت‌شده',
  productsTotal: 'آگهی در صف',
  reviews: 'کامنت ثبت‌شده',
  imagesDownloaded: 'تصویر دانلودشده',
  imagesFailed: 'تصویر ناموفق',
  usersDone: 'کاربر موفق',
  usersFailed: 'کاربر خطادار',
  usersSkipped: 'ردشده (قبلاً)',
  stubUsers: 'کاربر کمکی',
};
