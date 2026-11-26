'use client';

/**
 * پنل پیشرفت جاب ایمپورتر — چک‌لیست مراحل + شمارنده‌ها + لاگ زنده + دکمه‌های کنترل.
 * هر ۱.۵ ثانیه از بک‌اند وضعیت را می‌گیرد (جاب در پس‌زمینهٔ سرور اجرا می‌شود
 * و با refresh شدن صفحه هم از دست نمی‌رود).
 *
 * کنترل‌ها (خواستهٔ مالک ۱۶-۱۱ — «هر موقع خواستم پالز کنم یا پلی کنم یا استاپ کنم»):
 *   · «توقف موقت» → جاب در نخستین ایستگاه امن می‌ایستد؛ «ادامه» از همان‌جا برمی‌گردد؛
 *   · «توقف» → قطع دلسوله بین درخواست‌ها؛ اگر دیر انجام شد دکمه «توقف فوری»
 *     می‌شود — دوبار زدن جاب را همان‌جا قطع می‌کند (جاب گیرکرده/فریزشده)؛
 *   · جاب تمام‌شده (done/failed/stopped) → «بستن پنل» برای برداشتنش از صفحه؛
 *     دکمهٔ توقف روی جاب خطاخورده هم جواب می‌دهد (وضعیت نهایی را برمی‌گرداند).
 */

import { useEffect, useRef } from 'react';
import {
  AlertTriangle,
  Check,
  CircleDashed,
  Loader2,
  OctagonX,
  Pause,
  Play,
  SkipForward,
  WifiOff,
  X,
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
  onPause,
  onResume,
  onStop,
  onDismiss,
}: {
  job: ImportJob;
  onPause: (id: string) => void;
  onResume: (id: string) => void;
  onStop: (id: string) => void;
  /** جاب تمام‌شده را از صفحه بردار (لاگ‌ها لازم نیست دیگر نمایش بماند) */
  onDismiss: () => void;
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

  const counterEntries = Object.entries(job.counters).filter(([k]) => !k.startsWith('pascal'));

  // نگهبان شبکه (۱۵-۱۱ شب): جاب در انتظار بازگشت اینترنت است — توقف موقت، نه شکست
  const netWaiting = job.status === 'running' && job.netWaiting === true;
  const netWaitMin = job.netWaitSince ? Math.floor((Date.now() - job.netWaitSince) / 60000) : 0;

  // توقف موقت (۱۶-۱۱): درخواست ثبت شده یا خودِ جاب روی ایستگاه نشسته
  const paused = job.status === 'running' && (job.paused === true || job.pauseRequested === true);
  const isRunning = job.status === 'running';
  const stopPressed = job.stopRequested === true && isRunning;

  return (
    <div className="mt-4 rounded-lg border bg-card">
      {/* هدر جاب */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-2.5">
        <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
          {isRunning && !netWaiting && !paused && <Loader2 size={16} className="animate-spin text-primary" />}
          {isRunning && paused && <Pause size={16} className="text-amber-600" />}
          {job.status === 'done' && <Check size={16} className="text-emerald-600" />}
          {job.status === 'failed' && <XCircle size={16} className="text-red-600" />}
          {job.status === 'stopped' && <OctagonX size={16} className="text-amber-600" />}
          <span>
            {job.kind === 'single'
              ? 'ایمپورت تک‌کاربره'
              : job.kind === 'pending'
                ? 'ایمپورت گروهی — در انتظارها'
                : 'ایمپورت لیستی'}
            {job.userName ? ` — ${job.userName}` : ''}
          </span>
          {paused && (
            <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] text-amber-800">
              <Pause size={12} />
              متوقف موقت — با «ادامه» از همان‌جا برمی‌گردد
            </span>
          )}
          {netWaiting && (
            <span className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2.5 py-0.5 text-[11px] text-amber-800">
              <WifiOff size={12} className="animate-pulse" />
              اینترنت قطع است — ایمپورت نگه داشته شد{netWaitMin >= 1 ? ` (${netWaitMin.toLocaleString('fa-IR')} دقیقه)` : ''}
            </span>
          )}
          <span className="font-mono text-xs font-normal text-muted-foreground">#{job.id}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span dir="ltr" className="font-mono">
            {minutes}:{String(seconds).padStart(2, '0')}
          </span>
          {/* ── کنترل‌های جاب (۱۶-۱۱) — همیشه در دسترس ── */}
          {isRunning ? (
            <>
              {!stopPressed && (
                <button
                  type="button"
                  onClick={() => (paused ? onResume(job.id) : onPause(job.id))}
                  className={cn(
                    'flex items-center gap-1 rounded-md border px-2 py-1 font-bold transition-colors',
                    paused
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
                  )}
                >
                  {paused ? <Play size={14} /> : <Pause size={14} />}
                  {paused ? 'ادامه' : 'توقف موقت'}
                </button>
              )}
              <button
                type="button"
                onClick={() => onStop(job.id)}
                title={
                  stopPressed
                    ? 'توقف دلسوله ثبت شده ولی هنوز اعمال نشده — دوباره بزنید تا همین حالا قطع شود'
                    : 'قطع جاب بین درخواست‌ها — دوباره بزنید = توقف فوری'
                }
                className={cn(
                  'flex items-center gap-1 rounded-md border px-2 py-1 font-bold transition-colors',
                  stopPressed
                    ? 'border-red-300 bg-red-100 text-red-800 hover:bg-red-200'
                    : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
                )}
              >
                <OctagonX size={14} />
                {stopPressed ? 'توقف فوری' : 'توقف'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onDismiss}
              title="پنل این جاب را از صفحه بردار (جاب تمام شده است)"
              className="flex items-center gap-1 rounded-md border bg-background px-2 py-1 font-bold text-muted-foreground transition-colors hover:bg-accent"
            >
              <X size={14} />
              بستن پنل
            </button>
          )}
        </div>
      </div>

      {/* پیشرفت لیستی/گروهی */}
      {(job.kind === 'list' || job.kind === 'pending') &&
        typeof job.totalUsers === 'number' &&
        job.totalUsers > 0 && (
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {netWaiting ? (
                <span className="font-bold text-amber-700">
                  در انتظار اتصال اینترنت… بعد از وصل شدن از همین کاربر ادامه می‌یابد
                </span>
              ) : paused ? (
                <span className="font-bold text-amber-700">متوقف موقت — {job.currentUser ?? ''}</span>
              ) : (
                <>
                  کاربر {job.currentUserIndex ?? 0} از {job.totalUsers}
                  {job.currentUser ? ` — در حال پردازش: ${job.currentUser}` : ''}
                </>
              )}
            </span>
            <span>
              {job.usersDone ?? 0} موفق / {job.usersFailed ?? 0} خطا
              {job.counters.usersSkipped ? ` / ${job.counters.usersSkipped.toLocaleString('fa-IR')} ردشده` : ''}
            </span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                netWaiting || paused ? 'animate-pulse bg-amber-500' : 'bg-primary',
              )}
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
            {isRunning && !paused && <span className="animate-pulse text-slate-500">…</span>}
            {isRunning && paused && <span className="text-amber-400">متوقف موقت…</span>}
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
  relatedsDownloaded: 'تصویر کسب‌وکار',
  relatedsFailed: 'تصویر کسب‌وکار ناموفق',
  wmCleaned: 'واترمارک پاک‌شده',
  usersDone: 'کاربر موفق',
  usersFailed: 'کاربر خطادار',
  usersSkipped: 'ردشده (قبلاً)',
  stubUsers: 'کاربر کمکی',
};
