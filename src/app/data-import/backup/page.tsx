'use client';

/**
 * بک‌آپ دیتابیس (تسک ۳۳ — ۲۱-۱۱): کپی کامل و دقیق دیتابیس‌های سرور ابری
 * (Atlas) به مونگوی لوکالِ همان ماشینی که بک‌اند رویش اجرا می‌شود.
 *
 *  • فهرست دیتابیس‌های Atlas خودکار خوانده می‌شود (غیرسیستمی)
 *  • یک دکمه = انتقال کامل: همهٔ اسناد با همان _id و انواع BSON + همهٔ
 *    ایندکس‌ها + ویوها؛ در پایان شمار رکوردهای دو طرف راستی‌آزمایی می‌شود
 *  • دیتابیس هم‌نام در لوکال (اگر باشد) کامل حذف و از نو ساخته می‌شود —
 *    «عین هم» شدن دو طرف؛ سرور ابری فقط خوانده می‌شود و دست نمی‌خورد
 *
 * نکتهٔ مهم استقرار: مقصد «لوکال» یعنی ماشینِ بک‌اند. اگر این صفحه از
 * بک‌اند ورسل سرو شود، هشدار متناظر نشان داده می‌شود — انتقال واقعی باید
 * از بک‌اندِ روی سیستم مالک (مثلاً D:\…\megan-back) انجام شود.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Database,
  HardDrive,
  Loader2,
  RefreshCw,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  fetchBackupInfo,
  fetchBackupJob,
  startBackupTransfer,
  type BackupDatabaseInfo,
  type BackupInfo,
  type BackupJob,
} from '@/lib/admin/api';
import { cn } from '@/lib/utils';

const POLL_MS = 1500;

function faNum(n: number | null | undefined): string {
  if (n == null) return '—';
  return n.toLocaleString('fa-IR');
}

function fmtBytes(bytes: number): string {
  if (!bytes || bytes < 0) return '۰';
  if (bytes < 1024 * 1024) return `${faNum(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`;
  if (bytes < 1024 * 1024 * 1024) return `${faNum(Math.round(bytes / (1024 * 1024)))} مگابایت`;
  return `${(bytes / (1024 * 1024 * 1024)).toLocaleString('fa-IR', { maximumFractionDigits: 1 })} گیگابایت`;
}

function dbDocCount(db: BackupDatabaseInfo): number {
  return db.collections.reduce((s, c) => s + (c.count ?? 0), 0);
}

/** وضعیت آینهٔ لوکال یک دیتابیس ابری — بر اساس شمار رکوردها (تقریبی) */
function mirrorStatus(db: BackupDatabaseInfo, local: BackupDatabaseInfo[] | undefined) {
  const m = local?.find((x) => x.name === db.name);
  if (!m) return { label: 'در لوکال موجود نیست', tone: 'muted' as const };
  const src = dbDocCount(db);
  const dst = dbDocCount(m);
  if (dst === 0) return { label: 'لوکال خالی است', tone: 'amber' as const };
  if (src === 0) return { label: 'موجود در لوکال', tone: 'green' as const };
  if (dst === src) return { label: `مطابق با ابر (${faNum(dst)} رکورد)`, tone: 'green' as const };
  return { label: `ناقص — ${faNum(dst)} از ${faNum(src)} رکورد`, tone: 'amber' as const };
}

const TONE_CLASS = {
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  muted: 'bg-secondary text-muted-foreground',
} as const;

export default function BackupPage() {
  const [info, setInfo] = useState<BackupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [job, setJobState] = useState<BackupJob | null>(null);
  const [starting, setStarting] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobRef = useRef<BackupJob | null>(null);
  /** شکستن وابستگی چرخشی load↔poll — آخرین تابع پذیرش جاب بیرونی */
  const adoptRef = useRef<(jobId: string) => void>(() => {});

  const setJob = useCallback((j: BackupJob | null) => {
    jobRef.current = j;
    setJobState(j);
  }, []);

  const stopPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await fetchBackupInfo();
      setInfo(data);
      // جابی که از تب/نشست دیگری در جریان است — همان را دنبال کن
      if (data.currentJobId && !jobRef.current) adoptRef.current(data.currentJobId);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  }, []);

  const pollJob = useCallback(
    (jobId: string) => {
      stopPoll();
      pollRef.current = setInterval(async () => {
        try {
          const j = await fetchBackupJob(jobId);
          setJob(j);
          if (j.status !== 'running') {
            stopPoll();
            void load();
          }
        } catch {
          /* نظرسنجی ادامه می‌یابد — خطای گذرا */
        }
      }, POLL_MS);
    },
    [load, setJob, stopPoll],
  );

  const adoptJob = useCallback(
    async (jobId: string) => {
      try {
        const j = await fetchBackupJob(jobId);
        setJob(j);
        if (j.status === 'running') pollJob(jobId);
      } catch {
        /* جاب ناشناخته — بی‌صدا رد شود */
      }
    },
    [pollJob, setJob],
  );
  adoptRef.current = adoptJob;

  useEffect(() => {
    void load();
    return stopPoll;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTransfer = async (dbName: string) => {
    const ok = window.confirm(
      `انتقال کامل «${dbName}» از سرور ابری به دیتابیس هم‌نام در مونگوی لوکال؟\n\n` +
        '• همهٔ اسناد و ایندکس‌ها کپی می‌شوند (کپی دقیق)\n' +
        '• اگر در لوکال دیتابیس هم‌نامی باشد، کامل حذف و از نو ساخته می‌شود\n' +
        '• سرور ابری فقط خوانده می‌شود و هیچ تغییری نمی‌کند',
    );
    if (!ok) return;
    try {
      setStarting(dbName);
      const { jobId } = await startBackupTransfer(dbName);
      setJob(null);
      pollJob(jobId);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'شروع انتقال ناموفق بود');
    } finally {
      setStarting(null);
    }
  };

  const jobRunning = job?.status === 'running';
  const localOk = info?.local.ok === true;
  const totalSource = job ? job.collections.reduce((s, c) => s + c.sourceCount, 0) : 0;
  const pct = job && totalSource > 0 ? Math.min(100, Math.round((job.totalCopied / totalSource) * 100)) : 0;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* سربرگ */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-extrabold">
            <Database className="size-5 text-primary" />
            بک‌آپ دیتابیس
          </h1>
          <p className="mt-1 max-w-2xl text-xs leading-6 text-muted-foreground">
            کپی کامل و دقیق دیتابیس‌های سرور ابری (Atlas) به مونگوی لوکال روی همین سیستم — با حفظ همهٔ
            اسناد، ایندکس‌ها و راستی‌آزمایی شمار رکوردها. سرور ابری فقط خوانده می‌شود و هیچ تغییری نمی‌کند.
          </p>
        </div>
        <Button size="sm" variant="outline" className="gap-1.5 rounded-md" onClick={() => void load()} disabled={loading}>
          {loading ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          به‌روزرسانی
        </Button>
      </div>

      {/* خطا */}
      {loadError && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-6 text-red-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>{loadError}</span>
          <button type="button" className="mr-auto shrink-0 font-bold underline" onClick={() => setLoadError(null)}>
            بستن
          </button>
        </div>
      )}

      {/* وضعیت دو سرور */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-md border border-border bg-card px-3.5 py-3">
          <div className="flex items-center gap-2 text-[13px] font-bold">
            <Cloud className="size-4 text-primary" />
            سرور ابری (مبدأ)
            {info?.source.ok ? (
              <span className="mr-auto flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 className="size-3.5" /> متصل
              </span>
            ) : (
              <span className="mr-auto flex items-center gap-1 text-[11px] font-bold text-red-600">
                <XCircle className="size-3.5" /> قطع
              </span>
            )}
          </div>
          <p className="mt-1.5 truncate font-mono text-[11px] text-muted-foreground" dir="ltr">
            {info?.source.url ?? '…'}
          </p>
          {info?.source.error && <p className="mt-1 text-[11px] leading-5 text-red-600">{info.source.error}</p>}
        </div>
        <div className="rounded-md border border-border bg-card px-3.5 py-3">
          <div className="flex items-center gap-2 text-[13px] font-bold">
            <HardDrive className="size-4 text-primary" />
            مونگوی لوکال (مقصد)
            {localOk ? (
              <span className="mr-auto flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                <CheckCircle2 className="size-3.5" /> متصل
              </span>
            ) : (
              <span className="mr-auto flex items-center gap-1 text-[11px] font-bold text-red-600">
                <XCircle className="size-3.5" /> در دسترس نیست
              </span>
            )}
          </div>
          <p className="mt-1.5 truncate font-mono text-[11px] text-muted-foreground" dir="ltr">
            {info?.local.url ?? 'mongodb://127.0.0.1:27017'}
          </p>
          {info?.local.error && <p className="mt-1 text-[11px] leading-5 text-red-600">{info.local.error}</p>}
        </div>
      </div>

      {/* هشدارهای استقرار */}
      {info?.server.isVercel && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-6 text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            این صفحه از بک‌اندِ ورسل سرو می‌شود — «لوکال» اینجا یعنی سرور ورسل، نه سیستم شما. برای انتقال به
            مونگوی سیستم خودتان، بک‌اند را روی سیستم خود اجرا کنید و همین صفحه را از همان‌جا باز کنید.
          </span>
        </div>
      )}
      {info && !localOk && (
        <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2.5 text-xs leading-6 text-red-700">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>
            مونگوی لوکال در دسترس نیست. سرویس mongod را روی سیستم خودتان اجرا کنید (بدون رمز، پورت پیش‌فرض
            ۲۷۰۱۷) و دوباره «به‌روزرسانی» بزنید. تا آن موقع انتقال ممکن نیست.
          </span>
        </div>
      )}

      {/* جاب در جریان / نتیجه */}
      {job && (
        <div className="rounded-md border border-border bg-card p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            {job.status === 'running' ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : job.status === 'done' ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="size-4 text-amber-600" />
            )}
            <p className="text-[13px] font-bold">
              انتقال «{job.database}» {job.status === 'running' ? 'در جریان است…' : job.status === 'done' ? 'کامل شد' : job.status === 'done_with_errors' ? 'با خطا تمام شد' : 'ناموفق بود'}
            </p>
            <span className="mr-auto text-[11px] text-muted-foreground">
              {faNum(job.totalCopied)} سند · {faNum(job.collections.filter((c) => c.status === 'done').length)} از {faNum(job.collections.length)} کالکشن
            </span>
          </div>

          {job.status === 'running' && totalSource > 0 && (
            <div className="mt-2.5">
              <div className="h-2 overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-muted-foreground">{faNum(pct)}٪ — در حال کپی…</p>
            </div>
          )}

          {job.error && <p className="mt-2 rounded-md bg-red-50 px-2.5 py-1.5 text-[11px] leading-5 text-red-700">{job.error}</p>}

          <div className="mt-3 max-h-72 overflow-y-auto rounded-md border border-border">
            <table className="w-full text-right text-[11px]">
              <thead className="sticky top-0 bg-secondary/60 backdrop-blur">
                <tr className="text-muted-foreground">
                  <th className="px-2.5 py-2 font-bold">کالکشن</th>
                  <th className="px-2 py-2 font-bold">مبدأ</th>
                  <th className="px-2 py-2 font-bold">منتقل‌شده</th>
                  <th className="px-2 py-2 font-bold">ایندکس‌ها</th>
                  <th className="px-2.5 py-2 font-bold">وضعیت</th>
                </tr>
              </thead>
              <tbody>
                {job.collections.map((c) => (
                  <tr key={c.name} className="border-t border-border/60">
                    <td className="px-2.5 py-1.5 font-mono" dir="ltr">
                      {c.name}
                      {c.type === 'view' && <span className="mr-1 font-sans text-[10px] text-muted-foreground">(ویو)</span>}
                    </td>
                    <td className="px-2 py-1.5 tabular-nums">{faNum(c.sourceCount)}</td>
                    <td className="px-2 py-1.5 tabular-nums">
                      {faNum(c.copied)}
                      {c.destCount != null && c.status === 'done' && (
                        <span className={c.verified ? 'text-emerald-600' : 'text-amber-600'}>
                          {' '}
                          / {faNum(c.destCount)} {c.verified ? '✓' : '✗'}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 tabular-nums text-muted-foreground">+{faNum(c.indexesCreated)}</td>
                    <td className="px-2.5 py-1.5">
                      {c.status === 'done' ? (
                        <span className="text-emerald-600">تکمیل</span>
                      ) : c.status === 'error' ? (
                        <span className="text-red-600" title={c.error}>
                          خطا
                        </span>
                      ) : c.status === 'copying' ? (
                        <span className="text-primary">در حال کپی…</span>
                      ) : c.status === 'indexes' ? (
                        <span className="text-primary">ایندکس‌ها…</span>
                      ) : (
                        <span className="text-muted-foreground">در صف</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* کارت دیتابیس‌های ابری */}
      <div className="space-y-3">
        {loading && !info && (
          <div className="grid place-items-center rounded-md border border-border bg-card py-10 text-xs text-muted-foreground">
            <Loader2 className="mb-2 size-5 animate-spin" />
            در حال دریافت فهرست دیتابیس‌ها…
          </div>
        )}
        {(info?.databases ?? []).map((db) => {
          const mirror = mirrorStatus(db, info?.localDatabases);
          const docs = dbDocCount(db);
          const busy = starting === db.name || jobRunning;
          return (
            <div key={db.name} className="rounded-md border border-border bg-card p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <Database className="size-4 text-muted-foreground" />
                <p className="font-mono text-[13px] font-bold" dir="ltr">
                  {db.name}
                </p>
                <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', TONE_CLASS[mirror.tone])}>
                  {mirror.label}
                </span>
                <Button
                  size="sm"
                  className="mr-auto h-8 gap-1.5 rounded-md px-3 text-[11px]"
                  disabled={!localOk || busy || !info?.source.ok}
                  onClick={() => void startTransfer(db.name)}
                >
                  {starting === db.name ? <Loader2 className="size-3.5 animate-spin" /> : <Database className="size-3.5" />}
                  {starting === db.name ? 'در حال شروع…' : 'انتقال کامل به لوکال'}
                </Button>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-muted-foreground">
                <span>{faNum(db.collections.length)} کالکشن</span>
                <span>{faNum(docs)} رکورد</span>
                <span>حجم داده: {fmtBytes(db.dataBytes)}</span>
                <span>روی دیسک: {fmtBytes(db.storageBytes)}</span>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer select-none text-[11px] text-muted-foreground hover:text-foreground">
                  کالکشن‌ها ({faNum(db.collections.length)})
                </summary>
                <div className="mt-1.5 flex max-h-40 flex-wrap gap-1 overflow-y-auto">
                  {db.collections.map((c) => (
                    <span
                      key={c.name}
                      className="rounded border border-border/70 bg-secondary/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground"
                      dir="ltr"
                    >
                      {c.name}
                      {c.count != null && <span className="font-sans"> ({faNum(c.count)})</span>}
                    </span>
                  ))}
                </div>
              </details>
            </div>
          );
        })}
        {info && info.databases.length === 0 && (
          <div className="rounded-md border border-border bg-card py-8 text-center text-xs text-muted-foreground">
            هیچ دیتابیس غیرسیستمی روی سرور ابری یافت نشد.
          </div>
        )}
      </div>

      <p className="pb-2 text-[11px] leading-6 text-muted-foreground">
        «انتقال کامل» دیتابیس هم‌نام در مونگوی لوکال را حذف و از روی نسخهٔ ابری از نو می‌سازد — نتیجه، دو
        دیتابیس با دادهٔ یکسان است. تغییر آدرس مونگوی لوکال در صورت نیاز: متغیر محیطی LOCAL_MONGO_URL در
        فایل .env بک‌اند (پیش‌فرض: mongodb://127.0.0.1:27017 بدون رمز).
      </p>
    </div>
  );
}
