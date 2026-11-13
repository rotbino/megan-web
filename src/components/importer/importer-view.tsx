'use client';

/**
 * ایمپورتر باسکول — ابزار ادمین (بخش «دیتا ایمپورت»، /data-import/buskool)
 * برای مهاجرت داده از buskool.com به ایمچ. کاملاً جدا از پنل ادمین است؛
 * عملیات‌های مخرب سمت بک‌اند هم پشت IMPORTER_ADMIN_PHONE گارد می‌شوند.
 *
 * بخش‌ها:
 *   ۱. نوار وضعیت (اتصال بک‌اند / دیتابیس منبع / تاخیر / کوکی)
 *   ۲. آمار فعلی دیتابیس
 *   ۳. پاک‌سازی کامل (فقط حساب ادمین 09196421264 نگه داشته می‌شود؛
 *      بایت‌های ذخیره‌سازی و پوشهٔ قدیمی buskool هم بهترین‌حال پاک می‌شوند)
 *   ۴. تستر ایمپورت تک‌کاربره — یوزرنیم باسکول را بدهید، شروع کنید،
 *      پیشرفت زنده + پیش‌نمایش نتیجه را ببینید؛ عکس‌ها در همان مسیر
 *      آگهی‌های معمولی (پوشهٔ خود کاربر) ذخیره می‌شوند
 *   ۵. ایمپورت لیستی (فاز ۲ — پس از تأیید تست تک‌کاربره)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  Ban,
  Cable,
  Database,
  DatabaseZap,
  Eraser,
  Gauge,
  HardDrive,
  KeyRound,
  Loader2,
  Play,
  RefreshCcw,
  ShieldAlert,
  Timer,
  UserSearch,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { fetchAdminMe } from '@/lib/admin/api';
import {
  ADMIN_PHONE,
  importerApi,
  type CleanupResult,
  type DbStats,
  type ImportJob,
  type ImportPreview,
  type NextUnimported,
  type PingInfo,
  type SourceInfo,
} from '@/lib/importer/client';
import { JobPanel } from './job-panel';
import { PreviewPanel } from './preview-panel';
import { cn } from '@/lib/utils';

const JOB_STORAGE_KEY = 'imach:importer:jobId';

// ═══════════════════════════════════════════════════════════

export function ImporterView() {
  // گارد پنل ادمین: نشست ادمین را می‌خوانیم و فقط مدیر ارشد ادامه می‌دهد.
  // (پوستهٔ AdminShell ورود را چک می‌کند؛ نقش ارشد این‌جا دوباره گارد می‌شود)
  const { data: me, isLoading } = useQuery({ queryKey: ['admin-me'], queryFn: fetchAdminMe });

  if (isLoading || !me) {
    return (
      <div className="grid place-items-center py-24 text-muted-foreground">
        <Loader2 className="size-7 animate-spin" />
      </div>
    );
  }
  if (me.role !== 'SUPER_ADMIN') return <AdminOnly />;

  return <ImporterHome adminPhone={ADMIN_PHONE} />;
}

// ═════════════════════════════ گیت ادمین ═════════════════════════════

function AdminOnly() {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-lg border bg-card p-8 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-600">
        <ShieldAlert size={26} />
      </span>
      <h1 className="mt-4 text-lg font-extrabold">فقط مدیر ارشد</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        ایمپورتر باسکول فقط برای حساب‌های مدیر ارشد (SUPER_ADMIN) قابل استفاده است.
      </p>
    </div>
  );
}

// ═════════════════════════════ صفحهٔ اصلی ═════════════════════════════

function ImporterHome({ adminPhone }: { adminPhone: string }) {
  // وضعیت اتصال‌ها
  const [ping, setPing] = useState<PingInfo | null>(null);
  const [pingError, setPingError] = useState<string | null>(null);
  const [source, setSource] = useState<SourceInfo | null>(null);
  const [stats, setStats] = useState<DbStats | null>(null);

  // جاب فعال
  const [job, setJob] = useState<ImportJob | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [previewUser, setPreviewUser] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollJobId = useRef<string | null>(null);

  const refreshStatus = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([importerApi.ping(), importerApi.stats().catch(() => null)]);
      setPing(p);
      setPingError(null);
      setStats(s);
      importerApi
        .sourceInfo()
        .then(setSource)
        .catch(() => setSource(null));
    } catch (err) {
      setPing(null);
      setPingError((err as Error).message);
    }
  }, []);

  const loadPreview = useCallback(async (userName: string) => {
    setPreviewLoading(true);
    setPreviewUser(userName);
    setPreviewError(null);
    setPreview(null);
    try {
      setPreview(await importerApi.preview(userName));
    } catch (err) {
      setPreviewError((err as Error).message);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  // پول جاب فعال (زنجیره‌ای؛ با refresh صفحه هم از localStorage ادامه می‌یابد)
  const pollJob = useCallback(
    (id: string) => {
      if (pollJobId.current === id && pollTimer.current) return; // در حال پول همین جاب
      pollJobId.current = id;
      const tick = async () => {
        try {
          const j = await importerApi.job(id);
          setJob(j);
          if (j.status === 'running') {
            pollTimer.current = setTimeout(tick, 1500);
          } else {
            pollTimer.current = null;
            pollJobId.current = null;
            void refreshStatus();
            if (j.kind === 'single' && j.userName && (j.status === 'done' || j.status === 'stopped')) {
              void loadPreview(j.userName);
            }
          }
        } catch {
          pollTimer.current = setTimeout(tick, 4000);
        }
      };
      void tick();
    },
    [refreshStatus, loadPreview],
  );

  useEffect(() => {
    void refreshStatus();
    // اتصال مجدد به جاب قبلی (مثلاً بعد از refresh صفحه)
    const saved = localStorage.getItem(JOB_STORAGE_KEY);
    if (saved) {
      importerApi
        .job(saved)
        .then((j) => {
          setJob(j);
          if (j.status === 'running') pollJob(saved);
          else if (j.kind === 'single' && j.userName) void loadPreview(j.userName);
        })
        .catch(() => localStorage.removeItem(JOB_STORAGE_KEY));
    }
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [refreshStatus, pollJob, loadPreview]);

  const startJob = (id: string) => {
    localStorage.setItem(JOB_STORAGE_KEY, id);
    setPreview(null);
    setPreviewError(null);
    setJob(null);
    pollJob(id);
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ─── هدر + نوار وضعیت ─── */}
      <header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-extrabold">ایمپورتر باسکول</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              مهاجرت کاربران، آگهی‌ها، کامنت‌ها و تصاویر از buskool.com به دیتابیس ایمچ
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void refreshStatus()} className="gap-2">
            <RefreshCcw size={14} />
            بروزرسانی وضعیت
          </Button>
        </div>
        <StatusChips ping={ping} pingError={pingError} source={source} />
        {pingError && (
          <div className="mt-2 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-800">
            <AlertTriangle size={15} className="mt-0.5 shrink-0" />
            <span>
              بک‌اند در دسترس نیست ({pingError}). برای اجرا در پوشهٔ <b dir="ltr">megan-back</b> دستور{' '}
              <b dir="ltr">bun run start</b> را بزنید (پورت ۴۰۰۰).
            </span>
          </div>
        )}
      </header>

      {/* ─── آمار دیتابیس ─── */}
      {stats && <StatsGrid stats={stats} />}

      {/* ─── پاک‌سازی ─── */}
      <CleanupCard adminPhone={adminPhone} onDone={refreshStatus} />

      {/* ─── تستر تک‌کاربره ─── */}
      <SingleTesterCard
        adminPhone={adminPhone}
        source={source}
        onJobStarted={startJob}
        job={job?.kind === 'single' ? job : null}
        onStop={(id) => void importerApi.stopJob(id, adminPhone)}
        onPreview={loadPreview}
        previewLoading={previewLoading}
      />

      {/* ─── پیش‌نمایش نتیجه ─── */}
      {(preview || previewLoading || previewError) && previewUser && (
        <section className="rounded-lg border bg-card p-4">
          <h3 className="text-sm font-extrabold">
            نتیجهٔ ایمپورت در دیتابیس ایمچ — @{previewUser}
          </h3>
          {previewLoading && (
            <div className="mt-6 grid place-items-center text-muted-foreground">
              <Loader2 className="size-6 animate-spin" />
            </div>
          )}
          {previewError && (
            <p className="mt-3 text-xs text-red-600">{previewError}</p>
          )}
          {preview && <PreviewPanel preview={preview} />}
        </section>
      )}

      {/* ─── ایمپورت لیستی (فاز ۲) ─── */}
      <ListImportCard
        adminPhone={adminPhone}
        source={source}
        job={job?.kind === 'list' ? job : null}
        onJobStarted={startJob}
        onStop={(id) => void importerApi.stopJob(id, adminPhone)}
      />
    </div>
  );
}

// ═════════════════════════════ نوار وضعیت ═════════════════════════════

function StatusChips({
  ping,
  pingError,
  source,
}: {
  ping: PingInfo | null;
  pingError: string | null;
  source: SourceInfo | null;
}) {
  const items: { label: string; ok: boolean | null; hint: string; icon: React.ReactNode }[] = [
    {
      label: ping ? 'بک‌اند متصل' : 'بک‌اند قطع',
      ok: pingError ? false : ping ? true : null,
      hint: ping ? `پورت ۴۰۰۰ • تاخیر ${(ping.delayMs / 1000).toLocaleString('fa-IR')} ثانیه بین هر درخواست` : 'megan-back را اجرا کنید',
      icon: <Cable size={13} />,
    },
    {
      label: source?.connected
        ? `منبع: ${source.total?.toLocaleString('fa-IR') ?? '—'} کاربر باسکول`
        : 'کالکشن منبع قطع',
      ok: source ? source.connected : null,
      hint: source?.connected
        ? `${source.table} • ${source.imported?.toLocaleString('fa-IR') ?? '۰'} ایمپورت‌شده${source.failed ? ` • ${source.failed.toLocaleString('fa-IR')} ناقص` : ''}`
        : (source?.reason ?? 'کالکشن user-buskool در دیتابیس فعلی یافت نشد'),
      icon: <Database size={13} />,
    },
    {
      label: ping?.storageDriver === 'local' ? 'عکس‌ها → دیسک لوکال' : 'عکس‌ها → ابرآروان',
      ok: ping?.storageDriver === 'local' ? true : null,
      hint:
        ping?.storageDriver === 'local'
          ? `ذخیره در همان مسیر آپلود عادی (uploads/users/{id}/…)`
          : 'عکس‌های باسکول دقیقاً در همان مسیر آگهی‌های معمولی ذخیره می‌شوند — پوشهٔ خود کاربر در باکت (users/{userId}/…)',
      icon: <HardDrive size={13} />,
    },
    {
      label: ping?.cookieSet ? 'کوکی باسکول فعال' : 'بدون کوکی باسکول',
      ok: ping?.cookieSet ? true : null,
      hint: ping?.cookieSet
        ? 'متن کامل کامنت‌ها دریافت می‌شود'
        : 'عمومی کار می‌کند؛ برای متن کامنت‌ها BUSKOOL_COOKIE را در .env بگذارید',
      icon: <KeyRound size={13} />,
    },
    {
      label: ping?.busy ? 'ایمپورت در حال اجرا' : 'بیکار',
      ok: ping ? !ping.busy : null,
      hint: ping?.busy ? 'یک جاب در پس‌زمینه در حال اجراست' : 'آمادهٔ شروع',
      icon: <Gauge size={13} />,
    },
  ];

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {items.map((it) => (
        <div
          key={it.label}
          title={it.hint}
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-bold',
            it.ok === true && 'border-emerald-200 bg-emerald-50 text-emerald-700',
            it.ok === false && 'border-red-200 bg-red-50 text-red-700',
            it.ok === null && 'border-amber-200 bg-amber-50 text-amber-700',
          )}
        >
          {it.icon}
          {it.label}
        </div>
      ))}
    </div>
  );
}

// ═════════════════════════════ آمار دیتابیس ═════════════════════════════

function StatsGrid({ stats }: { stats: DbStats }) {
  const items: [string, number][] = [
    ['کاربران', stats.users],
    ['آگهی‌ها', stats.products],
    ['عکس‌ها', stats.photos],
    ['کامنت‌ها', stats.reviews],
    ['درخواست خرید', stats.buyRequests],
    ['گفتگوها', stats.chats],
  ];
  return (
    <section className="grid grid-cols-3 gap-3 sm:grid-cols-6">
      {items.map(([label, value]) => (
        <div key={label} className="rounded-lg border bg-card p-3 text-center">
          <div className="text-xl font-extrabold text-primary">{value.toLocaleString('fa-IR')}</div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div>
        </div>
      ))}
    </section>
  );
}

// ═════════════════════════════ پاک‌سازی ═════════════════════════════

function CleanupCard({ adminPhone, onDone }: { adminPhone: string; onDone: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CleanupResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await importerApi.cleanup(adminPhone));
      onDone();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <section className="rounded-lg border-2 border-red-200 bg-red-50/40 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-red-100 text-red-600">
            <Eraser size={19} />
          </span>
          <div>
            <h2 className="text-sm font-extrabold text-red-900">پاک‌سازی کامل دیتابیس برای شروع مهاجرت</h2>
            <p className="mt-1 max-w-2xl text-xs leading-5 text-red-800/80">
              تمام کاربران (به‌جز حساب ادمین {adminPhone})، آگهی‌ها، کامنت‌ها، گفتگوها، لیست‌ها و تصاویر سرور حذف
              می‌شوند. حتی آگهی‌ها و داده‌های خود ادمین پاک می‌شود و فقط حساب کاربری‌اش می‌ماند. این عمل قابل بازگشت
              نیست.
            </p>
          </div>
        </div>
        {!confirming ? (
          <Button variant="destructive" size="sm" onClick={() => setConfirming(true)} className="shrink-0">
            پاک‌سازی کامل
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="destructive" size="sm" disabled={busy} onClick={() => void run()}>
              {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
              بله، همه‌چیز را پاک کن
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirming(false)} disabled={busy}>
              انصراف
            </Button>
          </div>
        )}
      </div>

      {error && <p className="mt-3 text-xs text-red-700">خطا: {error}</p>}
      {result && (
        <div className="mt-3 rounded-md border bg-white p-3 text-xs leading-6">
          <b>پاک‌سازی انجام شد:</b>{' '}
          {Object.entries(result)
            .filter(([k, v]) => typeof v === 'number' && (v as number) > 0)
            .map(([k, v]) => `${TABLE_LABELS[k] ?? k}: ${Number(v).toLocaleString('fa-IR')}`)
            .join(' • ') || 'دیتابیس از قبل خالی بود'}
          <span className="mr-2 text-emerald-700">
            — حساب ادمین ({String(result.adminPhone)}) حفظ شد.
          </span>
        </div>
      )}
    </section>
  );
}

// ═════════════════════════════ تستر تک‌کاربره ═════════════════════════════

function SingleTesterCard({
  adminPhone,
  source,
  job,
  onJobStarted,
  onStop,
  onPreview,
  previewLoading,
}: {
  adminPhone: string;
  source: SourceInfo | null;
  job: ImportJob | null;
  onJobStarted: (id: string) => void;
  onStop: (id: string) => void;
  onPreview: (userName: string) => void;
  previewLoading: boolean;
}) {
  const [userName, setUserName] = useState('');
  const [phone, setPhone] = useState('');
  const [maxProducts, setMaxProducts] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const un = userName.trim();
    if (!un) {
      setError('یوزرنیم باسکول را وارد کنید (مثل il2016n)');
      return;
    }
    if (phone && !/^09\d{9}$/.test(phone.trim())) {
      setError('شماره موبایل باید مثل 09123456789 باشد یا خالی بماند.');
      return;
    }
    setBusy(true);
    importerApi
      .startSingle({
        adminPhone,
        userName: un,
        phone: phone.trim() || undefined,
        maxProducts: maxProducts ? Number(maxProducts) : undefined,
      })
      .then((r) => {
        onJobStarted(r.jobId);
        setBusy(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setBusy(false);
      });
  };

  return (
    <section className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
          <UserSearch size={19} />
        </span>
        <div>
          <h2 className="text-sm font-extrabold">تستر ایمپورت تک‌کاربره</h2>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            یوزرنیم پروفایل باسکول را وارد کنید؛ پروفایل، آمار، کامنت‌ها و تک‌تک آگهی‌ها (با فاصلهٔ ۵ ثانیه‌ای)
            گرفته و در ایمچ ثبت می‌شود. عکس‌ها هم در پوشهٔ uploads بک‌اند ذخیره می‌شوند.
          </p>
        </div>
      </div>

      <form onSubmit={start} className="mt-4 grid gap-3 sm:grid-cols-[1.2fr_1fr_0.7fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="bk-username">یوزرنیم باسکول *</Label>
          <Input
            id="bk-username"
            dir="ltr"
            placeholder="il2016n"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            className="text-left font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bk-phone" className="flex items-center justify-between">
            شماره موبایل
            <span className="text-[10px] font-normal text-muted-foreground">
              {source?.connected ? 'خالی = از جدول User-buskool' : 'دیتابیس منبع قطع — دستی وارد کنید'}
            </span>
          </Label>
          <Input
            id="bk-phone"
            dir="ltr"
            placeholder="09…"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="text-left font-mono"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="bk-max" className="flex items-center gap-1">
            <Timer size={12} />
            حداکثر آگهی
          </Label>
          <Input
            id="bk-max"
            dir="ltr"
            inputMode="numeric"
            placeholder="همه"
            value={maxProducts}
            onChange={(e) => setMaxProducts(e.target.value.replace(/[^0-9]/g, ''))}
            className="text-left font-mono"
          />
        </div>
        <div className="flex items-end gap-2">
          <Button type="submit" disabled={busy} className="gap-2">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
            شروع ایمپورت
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!userName.trim() || previewLoading}
            onClick={() => onPreview(userName.trim())}
            className="gap-2"
            title="نمایش دادهٔ قبلاً ایمپورت‌شدهٔ این کاربر در دیتابیس ایمچ"
          >
            {previewLoading ? <Loader2 size={15} className="animate-spin" /> : <DatabaseZap size={15} />}
            پیش‌نمایش
          </Button>
        </div>
      </form>

      {error && (
        <p className="mt-3 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">{error}</p>
      )}

      {job && <JobPanel job={job} onStop={onStop} />}

      {job && job.status !== 'running' && job.userName && (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPreview(job.userName as string)}
            disabled={previewLoading}
            className="gap-2"
          >
            {previewLoading ? <Loader2 size={14} className="animate-spin" /> : <DatabaseZap size={14} />}
            پیش‌نمایش دادهٔ ثبت‌شده در ایمچ
          </Button>
          <a
            href={`/profile/${job.userName}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center rounded-md border bg-background px-3 text-xs font-bold shadow-sm transition-colors hover:bg-accent"
          >
            صفحهٔ عمومی پروفایل ↗
          </a>
        </div>
      )}
    </section>
  );
}

// ═════════════════════════════ ایمپورت لیستی ═════════════════════════════

function ListImportCard({
  adminPhone,
  source,
  job,
  onJobStarted,
  onStop,
}: {
  adminPhone: string;
  source: SourceInfo | null;
  job: ImportJob | null;
  onJobStarted: (id: string) => void;
  onStop: (id: string) => void;
}) {
  const [offset, setOffset] = useState('0');
  const [limit, setLimit] = useState('5');
  const [maxPerUser, setMaxPerUser] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [next, setNext] = useState<NextUnimported | null>(null);
  const [nextLoading, setNextLoading] = useState(false);

  const disabled = !source?.connected;

  // اولین کاربر ایمپورت‌نشده — «از ردیف» خودکار پر می‌شود (خواستهٔ مالک ۱۳-۱۱:
  // ادامهٔ ایمپورت از همان‌جا که مانده، بدون نگهداری جداگانه)
  const findNext = useCallback(async () => {
    setNextLoading(true);
    try {
      const n = await importerApi.nextUnimported();
      setNext(n);
      if (n.found) setOffset(String(n.offset));
    } catch {
      /* بی‌صدا — با دکمه دوباره قابل تلاش است */
    } finally {
      setNextLoading(false);
    }
  }, []);

  useEffect(() => {
    if (source?.connected) void findNext();
  }, [source?.connected, findNext]);

  const start = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    importerApi
      .startList({
        adminPhone,
        offset: Number(offset) || 0,
        limit: Number(limit) || 5,
        maxProductsPerUser: maxPerUser ? Number(maxPerUser) : 0,
      })
      .then((r) => {
        onJobStarted(r.jobId);
        setBusy(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setBusy(false);
      });
  };

  return (
    <section className={cn('rounded-lg border bg-card p-4', disabled && 'opacity-80')}>
      <div className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600">
          <DatabaseZap size={19} />
        </span>
        <div>
          <h2 className="text-sm font-extrabold">
            ایمپورت لیستی از کالکشن user-buskool{' '}
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
              فاز ۲ — بعد از تأیید تست تک‌کاربره
            </span>
          </h2>
          <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
            کاربران کالکشن منبع {source?.connected ? `(${source.total?.toLocaleString('fa-IR')} کاربر)` : ''} را
            دنباله‌دنباله ایمپورت می‌کند — هر کاربر با همان جریان تستر (پروفایل، آگهی‌ها، عکس‌ها، کامنت‌ها).
            کاربران ایمپورت‌شده به‌طور خودکار رد می‌شوند؛ کاربر شکست‌خورده با پرچم «ایمپورت ناقص» برای
            رسیدگی بعدی می‌ماند و پس از ۳ شکست پیاپی (قطعی/بلاک) جاب متوقف می‌شود.
          </p>
        </div>
      </div>

      <form onSubmit={start} className="mt-4 grid gap-3 sm:grid-cols-[0.8fr_0.8fr_1fr_auto]">
        <div className="space-y-1.5">
          <Label htmlFor="li-offset">از ردیف (offset)</Label>
          <div className="flex gap-1.5">
            <Input
              id="li-offset"
              dir="ltr"
              inputMode="numeric"
              value={offset}
              onChange={(e) => setOffset(e.target.value.replace(/[^0-9]/g, ''))}
              className="text-left font-mono"
              disabled={disabled}
            />
            <Button
              type="button"
              variant="outline"
              className="shrink-0 gap-1.5 px-2.5"
              onClick={() => void findNext()}
              disabled={disabled || nextLoading}
              title="پیدا کردن اولین کاربری که هنوز ایمپورت نشده"
            >
              {nextLoading ? <Loader2 size={15} className="animate-spin" /> : <UserSearch size={15} />}
              <span className="hidden whitespace-nowrap sm:inline">ایمپورت‌نشدهٔ بعدی</span>
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="li-limit">تعداد کاربر</Label>
          <Input
            id="li-limit"
            dir="ltr"
            inputMode="numeric"
            value={limit}
            onChange={(e) => setLimit(e.target.value.replace(/[^0-9]/g, ''))}
            className="text-left font-mono"
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="li-max" className="flex items-center gap-1">
            <Timer size={12} />
            حداکثر آگهی هر کاربر (خالی = همه)
          </Label>
          <Input
            id="li-max"
            dir="ltr"
            inputMode="numeric"
            placeholder="همه"
            value={maxPerUser}
            onChange={(e) => setMaxPerUser(e.target.value.replace(/[^0-9]/g, ''))}
            className="text-left font-mono"
            disabled={disabled}
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" disabled={busy || disabled} className="w-full gap-2 sm:w-auto">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Play size={15} />}
            شروع لیست
          </Button>
        </div>
      </form>

      {next && source?.connected && (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">
          {next.found ? (
            <>
              ادامه از <b dir="ltr">@{next.userName}</b> (ردیف {next.offset.toLocaleString('fa-IR')}) —{' '}
              {next.importedCount.toLocaleString('fa-IR')} کاربر ایمپورت‌شده •{' '}
              {next.remaining.toLocaleString('fa-IR')} باقی‌مانده از {next.total.toLocaleString('fa-IR')}
            </>
          ) : (
            (next.reason ?? 'همهٔ کاربران منبع ایمپورت شده‌اند')
          )}
        </p>
      )}

      {disabled && (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5 text-xs leading-5 text-amber-800">
          <Ban size={14} className="mt-0.5 shrink-0" />
          دیتابیس منبع متصل نیست —{' '}
          {source?.reason ?? 'کالکشن user-buskool در دیتابیس فعلی یافت نشد'}
        </p>
      )}
      {error && <p className="mt-3 text-xs text-red-600">{error}</p>}

      {job && <JobPanel job={job} onStop={onStop} />}
    </section>
  );
}

// ═════════════════════════════ برچسب‌ها ═════════════════════════════

const TABLE_LABELS: Record<string, string> = {
  users: 'کاربران',
  products: 'آگهی‌ها',
  files: 'فایل‌ها',
  storageObjectsQueued: 'آبجکت‌های در صف حذف ذخیره‌سازی',
  legacyBuskoolObjects: 'آبجکت‌های قدیمی پوشهٔ buskool',
  reviews: 'کامنت‌ها',
  buyRequests: 'درخواست‌های خرید',
  chats: 'گفتگوها',
  chatMessages: 'پیام‌ها',
  contacts: 'مخاطبین',
  followFolders: 'پوشه‌های پیگیری',
  followItems: 'فروشنده‌های نشان‌شده',
  followNotes: 'یادداشت‌ها',
  favorites: 'علاقه‌مندی آگهی',
  favoriteSellers: 'علاقه‌مندی فروشنده',
  productViews: 'بازدید آگهی',
  productEditHistory: 'تاریخچه ویرایش',
  supplyOffers: 'پیشنهاد تأمین',
  serviceSignups: 'ثبت‌نام سرویس‌ها',
  buyerCategories: 'دسته‌های خریدار',
  verificationOrders: 'احراز هویت',
  chargeOrders: 'شارژ',
  packageOrders: 'بسته‌ها',
  ladderOrders: 'نردبان‌ها',
  walletAdjustments: 'تنظیم کیف پول',
  feedbackItems: 'بازخوردها',
  feedbackUpvotes: 'رأی بازخوردها',
  adminMessages: 'پیام‌های ادمین',
  supportMessages: 'پشتیبانی',
  callLogs: 'تماس‌ها',
  pushSubscriptions: 'اشتراک نوتیف',
  activityLogs: 'لاگ فعالیت',
  otpCodes: 'کدها',
  refreshTokens: 'نشست‌ها',
  counters: 'شمارنده‌ها',
};
