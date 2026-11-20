'use client';

/**
 * آپدیت قیمت‌ها + کاربران جدید باسکول — صفحهٔ «دیتا ایمپورت → آپدیت»
 * (خواستهٔ مالک ۲۱-۱۱: «یک تیر برای دو نشان»).
 *
 * یک دکمه = یک پاس کامل روی N هزار آگهی آخرِ باسکول (بدون کوکی، sort_by=RD):
 *   • هر بچ ۱۰۰۰تایی با یک فراخوانی به بک‌اند می‌رود (سرورلس‌پسند — هر تکه
 *     ≪ تایم‌اوت ۶۰ث) و همان‌جا: قیمت/موجودی/حداقل‌سفارش آگهی‌های موجود در
 *     ایمچ مقایسه و فقط متفاوت‌ها آپدیت می‌شوند + کاربران تازه‌ثبت‌نامِ غایب
 *     شناسایی می‌شوند (از همان user_info آیتم‌ها).
 *   • بین بچ‌ها ۵ ثانیه وقفه (خواستهٔ مالک: «باسکول تشخیص ندهد ماشین هست») —
 *     شمارش معکوس روی دکمه + گارد سرور؛ حتی دابل‌کلیک/دو تب فاصله را نمی‌شکند.
 *   • گزارش زندهٔ هر بچ: گرفته‌شده / در ایمچ / آپدیت‌شده / بدون تغییر / آگهی
 *     جدید + جمع کل.
 *   • «کاربران جدید باسکول»: لیست یونیکِ بین بچ‌ها (تازه‌ثبت‌نام‌تر اول) با
 *     دکمهٔ «ایمپورت» روی هر کاربر: اول شمارهٔ موبایل (get_seller_phone_number
 *     با کوکی — هر کوکی ۲۰ شماره؛ شمارندهٔ سهمیه روی صفحه) بعد همان ایمپورت
 *     تک‌کاربرهٔ همیشگی با جاب و پیشرفت زنده. اگر کاربر از قبل وارد ایمچ
 *     شده بود، بدون گرفتن شماره رد می‌شود.
 *   • «استخراج تک‌کاربر»: یوزرنیم باسکول → چک bUserName در ایمچ → غایب =
 *     شماره + ایمپورت کامل (پروفایل/آگهی‌ها/تصاویر/کامنت‌ها) همان همیشه.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  CheckCircle2,
  CircleAlert,
  Database,
  Loader2,
  Play,
  RefreshCw,
  Search,
  Square,
  UserPlus,
  Users,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { JobPanel } from '@/components/importer/job-panel';
import {
  ADMIN_PHONE,
  importerApi,
  updateApi,
  type ImportJob,
  type ScanNewUser,
  type ScanResult,
} from '@/lib/importer/client';
import { dateFa, timeAgoFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

/** اندازهٔ هر بچ — همان سقف سرویس */
const BATCH = 1000;
/** فاصلهٔ بین بچ‌ها (میلی‌ثانیه) — خواستهٔ مالک */
const GAP_MS = 5_000;
/** سقف ایمنی تعداد بچ در یک پاس */
const MAX_BATCHES = 30;

type RunStatus = 'idle' | 'running' | 'pausing' | 'done' | 'stopped' | 'error';

interface BatchRow {
  index: number;
  from: number;
  to: number;
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  res?: ScanResult;
  error?: string;
}

/** وضعیت هر کاربر جدید در لیست (دکمهٔ ایمپورت) */
type UserState =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'phone' }
  | { kind: 'importing'; jobId: string }
  | { kind: 'done' }
  | { kind: 'exists'; imachUserName: string }
  | { kind: 'error'; message: string };

const runStatusLabel: Record<RunStatus, string> = {
  idle: 'آماده',
  running: 'در حال اجرا',
  pausing: 'وقفهٔ ۵ ثانیه‌ای…',
  done: 'تمام شد',
  stopped: 'متوقف شد',
  error: 'خطا',
};

// ═══════════════════════════ صفحه ═══════════════════════════

export function UpdateManager() {
  const { toast } = useToast();

  // ── پیکربندی پاس ──
  const [batchCount, setBatchCount] = useState(10);
  const [recentDays, setRecentDays] = useState(10);

  // ── وضعیت پاس ──
  const [status, setStatus] = useState<RunStatus>('idle');
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [countdown, setCountdown] = useState(0);
  const stopRef = useRef(false);
  /** آخرین مجموع برای توست پایان (state داخل حلقه کهنه می‌شود) */
  const batchesRef = useRef<BatchRow[]>([]);
  useEffect(() => {
    batchesRef.current = batches;
  }, [batches]);

  // ── کاربران جدید (یونیک بین بچ‌ها) ──
  const [newUsers, setNewUsers] = useState<ScanNewUser[]>([]);
  const [userStates, setUserStates] = useState<Record<number, UserState>>({});
  const [budget, setBudget] = useState<{ limit: number; used: number; remaining: number } | null>(null);

  // ── جاب ایمپورت در جریان (کاربر جدید یا تک‌کاربر) ──
  const [job, setJob] = useState<ImportJob | null>(null);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // شمارش معکوس وقفهٔ بین بچ‌ها
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1_000);
    return () => clearTimeout(t);
  }, [countdown]);

  useEffect(
    () => () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    },
    [],
  );

  // ── جمع کل پاس ──
  const totals = useMemo(() => {
    const t = { fetched: 0, kept: 0, inImach: 0, updated: 0, unchanged: 0, notInImach: 0, usersSeen: 0 };
    for (const b of batches) {
      if (!b.res) continue;
      t.fetched += b.res.fetched;
      t.kept += b.res.kept;
      t.inImach += b.res.inImach;
      t.updated += b.res.updated;
      t.unchanged += b.res.unchanged;
      t.notInImach += b.res.notInImach;
      t.usersSeen += b.res.usersSeen;
    }
    return t;
  }, [batches]);

  /** ادغام یونیک کاربران جدید بین بچ‌ها — تازه‌ثبت‌نام‌تر اول */
  const mergeUsers = useCallback((incoming: ScanNewUser[]) => {
    setNewUsers((prev) => {
      const map = new Map(prev.map((u) => [u.bUserId, u]));
      for (const u of incoming) if (!map.has(u.bUserId)) map.set(u.bUserId, u);
      return [...map.values()].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
    });
  }, []);

  // ── حلقهٔ اصلی پاس — startFrom برای «تلاش مجدد از بچ خطاخورده» ──
  const runScan = useCallback(
    async (count: number, startFrom = 0) => {
      stopRef.current = false;
      setStatus('running');
      const rows: BatchRow[] = Array.from({ length: count }, (_, k) => {
        const i = startFrom + k;
        return { index: i, from: i * BATCH, to: (i + 1) * BATCH, status: 'pending' as const };
      });
      // بچ‌های قبلیِ موفق حفظ می‌شوند — بازپردازش فقط از بچ خطاخورده به بعد
      setBatches((prev) => [...prev.filter((b) => b.status === 'done'), ...rows]);

      for (let k = 0; k < count; k++) {
        const i = startFrom + k;
        if (stopRef.current) {
          setStatus('stopped');
          setBatches((bs) => bs.map((b) => (b.index >= i && b.status === 'pending' ? { ...b, status: 'skipped' } : b)));
          return;
        }
        setBatches((bs) => bs.map((b) => (b.index === i ? { ...b, status: 'running' } : b)));
        try {
          const res = await updateApi.scan({
            adminPhone: ADMIN_PHONE,
            from: i * BATCH,
            to: (i + 1) * BATCH,
            updatePrices: true,
            recentDays,
          });
          setBatches((bs) => bs.map((b) => (b.index === i ? { ...b, status: 'done', res } : b)));
          if (res.newUsers.length) mergeUsers(res.newUsers);
        } catch (err) {
          const message = err instanceof Error ? err.message : 'خطای نامشخص';
          setBatches((bs) => bs.map((b) => (b.index === i ? { ...b, status: 'error', error: message } : b)));
          setStatus('error');
          toast({
            title: `بچ ${toFa(i + 1)} خطا خورد`,
            description: message,
            variant: 'destructive',
          });
          return;
        }
        // وقفهٔ ۵ ثانیه‌ای بین بچ‌ها — به‌جز بعد از آخری
        if (k < count - 1 && !stopRef.current) {
          setStatus('pausing');
          setCountdown(Math.ceil(GAP_MS / 1_000));
          const until = Date.now() + GAP_MS;
          while (Date.now() < until && !stopRef.current) {
            await new Promise((r) => setTimeout(r, 250));
          }
          setCountdown(0);
          if (stopRef.current) {
            setStatus('stopped');
            setBatches((bs) => bs.map((b) => (b.index > i && b.status === 'pending' ? { ...b, status: 'skipped' } : b)));
            return;
          }
        }
      }
      setStatus('done');
      const t = totalsLabel(batchesRef.current);
      toast({
        title: 'پاس آپدیت تمام شد',
        description: `${toFa(t.updated)} آگهی قیمتش تازه شد`,
      });
    },
    [mergeUsers, recentDays, toast],
  );

  const stopScan = () => {
    stopRef.current = true;
    setCountdown(0);
  };

  // ── پول جاب ایمپورت ──
  const pollJob = useCallback((id: string) => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    const tick = async () => {
      try {
        const j = await importerApi.job(id);
        setJob(j);
        if (j.status === 'running') {
          pollTimer.current = setTimeout(tick, 1_500);
        } else {
          pollTimer.current = null;
        }
      } catch {
        pollTimer.current = setTimeout(tick, 4_000);
      }
    };
    void tick();
  }, []);

  /** شروع ایمپورت کامل یک کاربر باسکولی (بعد از گرفتن شماره) — پول با فراخواننده */
  const startImport = useCallback(
    async (userName: string, phone?: string) => {
      const { jobId } = await importerApi.startSingle({ adminPhone: ADMIN_PHONE, userName, phone });
      return jobId;
    },
    [],
  );

  // ── دکمهٔ ایمپورت هر کاربر جدید ──
  const importUser = useCallback(
    async (u: ScanNewUser) => {
      setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'checking' } }));
      try {
        // اگر از قبل وارد ایمچ شده، بدون گرفتن شماره رد شو (خواستهٔ مالک)
        const ex = await updateApi.extractUser({ adminPhone: ADMIN_PHONE, userName: u.bUserName });
        if (ex.exists) {
          setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'exists', imachUserName: ex.imach?.userName ?? '' } }));
          return;
        }
        setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'phone' } }));
        const { phone, budget: b } = await updateApi.fetchPhone({
          adminPhone: ADMIN_PHONE,
          sId: u.bUserId,
          pId: u.sampleProductId,
        });
        setBudget(b);
        setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'importing', jobId: '' } }));
        const jobId = await startImport(u.bUserName, phone);
        pollJob(jobId);
        setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'importing', jobId } }));
      } catch (err) {
        setUserStates((s) => ({
          ...s,
          [u.bUserId]: { kind: 'error', message: err instanceof Error ? err.message : 'خطای نامشخص' },
        }));
      }
    },
    [startImport],
  );

  // وقتی جاب تمام شد، وضعیت کاربر مربوط را به‌روز کن
  useEffect(() => {
    if (!job || job.status === 'running') return;
    const entry = Object.entries(userStates).find(([, v]) => v.kind === 'importing');
    if (!entry) return;
    const [uid] = entry;
    const id = Number(uid);
    if (job.status === 'done') {
      setUserStates((s) => ({ ...s, [id]: { kind: 'done' } }));
      setNewUsers((prev) => prev.filter((u) => u.bUserId !== id));
    }
    // خطا/توقف: پیام روی پنل جاب دیده می‌شود — دکمه برای تلاش مجدد برمی‌گردد
    else setUserStates((s) => ({ ...s, [id]: { kind: 'idle' } }));
  }, [job?.status]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* ─── هدر ─── */}
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold">
            <span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary">
              <RefreshCw size={19} />
            </span>
            آپدیت قیمت‌ها
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            آپدیت قیمت/موجودی/حداقل‌سفارش آخرین آگهی‌های باسکول در ایمچ + شناسایی کاربران جدید — از همان یک
            لیست، بدون کوکی و با وقفهٔ ۵ ثانیه‌ای بین هر ۱٬۰۰۰تا
          </p>
        </div>
        {budget && (
          <div className="rounded-lg border bg-card px-3 py-2 text-center">
            <p className="text-[10px] text-muted-foreground">سهمیهٔ شماره‌های این کوکی</p>
            <p className="text-sm font-extrabold tabular-nums">
              {toFa(budget.remaining)} / {toFa(budget.limit)}
            </p>
            <p className="text-[10px] text-muted-foreground">{toFa(budget.used)} گرفته شده</p>
          </div>
        )}
      </header>

      {/* ─── کنترل پاس ─── */}
      <section className="rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            تعداد بچ (هر بچ ۱٬۰۰۰ آگهی)
            <Input
              type="number"
              min={1}
              max={MAX_BATCHES}
              value={batchCount}
              onChange={(e) =>
                setBatchCount(Math.min(MAX_BATCHES, Math.max(1, Number(e.target.value) || 1)))
              }
              disabled={status === 'running' || status === 'pausing'}
              className="h-9 w-32"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            فقط ثبت‌نام در N روز اخیر
            <Input
              type="number"
              min={0}
              max={365}
              value={recentDays}
              onChange={(e) => setRecentDays(Math.min(365, Math.max(0, Number(e.target.value) || 0)))}
              disabled={status === 'running' || status === 'pausing'}
              className="h-9 w-32"
            />
          </label>
          <p className="flex-1 text-[11px] leading-5 text-muted-foreground">
            {toFa(batchCount)} بچ = تا {(batchCount * BATCH).toLocaleString('fa-IR')} آگهی آخر باسکول
            (جدیدترین‌ها اول) • {recentDays > 0 ? `فقط کاربرانِ ثبت‌نام‌شده در ${toFa(recentDays)} روز اخیر` : 'همهٔ کاربران غایب'} • وقفهٔ ۵ ثانیه بین بچ‌ها
          </p>
          {status === 'running' || status === 'pausing' ? (
            <Button variant="destructive" onClick={stopScan} className="gap-2">
              <Square size={14} />
              {countdown > 0 ? `ادامه در ${toFa(countdown)}…` : 'توقف'}
            </Button>
          ) : (
            <Button onClick={() => void runScan(batchCount)} className="gap-2">
              <Play size={15} />
              شروع آپدیت ({(batchCount * BATCH).toLocaleString('fa-IR')} آگهی)
            </Button>
          )}
        </div>

        {/* وضعیت پاس */}
        {batches.length > 0 && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span
                className={cn(
                  'rounded-full px-2.5 py-1 font-bold',
                  status === 'running' && 'bg-primary/10 text-primary',
                  status === 'pausing' && 'bg-amber-50 text-amber-700',
                  status === 'done' && 'bg-emerald-50 text-emerald-700',
                  status === 'stopped' && 'bg-muted text-muted-foreground',
                  status === 'error' && 'bg-red-50 text-red-700',
                  status === 'idle' && 'bg-muted text-muted-foreground',
                )}
              >
                {runStatusLabel[status]}
              </span>
              <span className="text-muted-foreground">
                گرفته‌شده: <b className="tabular-nums text-foreground">{toFa(totals.fetched)}</b>
              </span>
              <span className="text-muted-foreground">
                در ایمچ: <b className="tabular-nums text-foreground">{toFa(totals.inImach)}</b>
              </span>
              <span className="text-muted-foreground">
                آپدیت‌شده: <b className="tabular-nums text-emerald-700">{toFa(totals.updated)}</b>
              </span>
              <span className="text-muted-foreground">
                بدون تغییر: <b className="tabular-nums text-foreground">{toFa(totals.unchanged)}</b>
              </span>
              <span className="text-muted-foreground">
                آگهی جدید باسکول: <b className="tabular-nums text-foreground">{toFa(totals.notInImach)}</b>
              </span>
            </div>
            {/* ردیف بچ‌ها */}
            <div className="flex flex-wrap gap-1.5">
              {batches.map((b) => (
                <span
                  key={b.index}
                  title={
                    b.res
                      ? `آگهی ${toFa(b.res.fetched)} • در ایمچ ${toFa(b.res.inImach)} • آپدیت ${toFa(b.res.updated)} • کاربر جدید ${toFa(b.res.newUsers.length)}`
                      : b.error ?? ''
                  }
                  className={cn(
                    'grid size-7 place-items-center rounded-md text-[10px] font-bold tabular-nums',
                    b.status === 'done' && 'bg-emerald-100 text-emerald-800',
                    b.status === 'running' && 'bg-primary/15 text-primary',
                    b.status === 'pending' && 'bg-muted text-muted-foreground/50',
                    b.status === 'skipped' && 'bg-muted/60 text-muted-foreground/40',
                    b.status === 'error' && 'bg-red-100 text-red-700',
                  )}
                >
                  {b.status === 'running' ? <Loader2 size={12} className="animate-spin" /> : toFa(b.index + 1)}
                </span>
              ))}
            </div>
            {batches.some((b) => b.status === 'error') && (
              <div className="flex flex-wrap items-center gap-2 rounded-md border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
                <CircleAlert size={14} className="shrink-0" />
                <span className="flex-1">{batches.find((b) => b.status === 'error')?.error}</span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1.5 rounded-md text-[11px]"
                  onClick={() => {
                    const failed = batches.find((b) => b.status === 'error');
                    if (failed) void runScan(batchCount - failed.index);
                  }}
                >
                  تلاش مجدد از بچ خطاخورده
                </Button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* ─── جاب ایمپورت در جریان ─── */}
      {job && (
        <section className="rounded-lg border bg-card p-4">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
            <Database size={15} className="text-primary" />
            ایمپورت در جریان — @{job.userName}
          </h3>
          <JobPanel
            job={job}
            onPause={(id) => void importerApi.pauseJob(id, ADMIN_PHONE).then(() => pollJob(id))}
            onResume={(id) => void importerApi.resumeJob(id, ADMIN_PHONE).then(() => pollJob(id))}
            onStop={(id) => void importerApi.stopJob(id, ADMIN_PHONE).then(() => pollJob(id))}
            onDismiss={() => setJob(null)}
          />
        </section>
      )}

      {/* ─── کاربران جدید باسکول ─── */}
      <section className="rounded-lg border bg-card p-4">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-extrabold">
            <Users size={15} className="text-primary" />
            کاربران جدید باسکول
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary tabular-nums">
              {toFa(newUsers.length)}
            </span>
          </h3>
          <p className="text-[11px] text-muted-foreground">
            تازه‌ثبت‌نام‌هایی که در ایمچ نیستند — دکمهٔ ایمپورت: اول شمارهٔ موبایل، بعد ایمپورت کامل
          </p>
        </header>

        {newUsers.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs leading-6 text-muted-foreground">
            هنوز کاربر جدیدی شناسایی نشده — «شروع آپدیت» را بزنید؛ کاربران تازه‌ثبت‌نامِ باسکول که آگهی
            دارند و در ایمچ نیستند همین‌جا فهرست می‌شوند.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b text-[10px] text-muted-foreground">
                  <th className="px-2 py-2 font-medium">کاربر باسکول</th>
                  <th className="px-2 py-2 font-medium">نام</th>
                  <th className="px-2 py-2 font-medium">ثبت‌نام</th>
                  <th className="px-2 py-2 font-medium">نمونه آگهی</th>
                  <th className="px-2 py-2 font-medium">آگهی‌ها</th>
                  <th className="px-2 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {newUsers.map((u) => {
                  const st = userStates[u.bUserId] ?? { kind: 'idle' };
                  return (
                    <tr key={u.bUserId} className="border-b last:border-0 hover:bg-secondary/40">
                      <td className="px-2 py-2.5">
                        <span className="font-bold" dir="ltr">
                          @{u.bUserName}
                        </span>
                        {u.isVerified && (
                          <span className="mr-1.5 inline-flex items-center gap-0.5 text-amber-600" title="احراز باسکول — فقط دادهٔ رفتاری">
                            <BadgeCheck size={13} />
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-2.5">
                        {`${u.firstName} ${u.lastName}`.trim() || '—'}
                      </td>
                      <td className="px-2 py-2.5 text-muted-foreground">
                        {u.createdAt ? (
                          <>
                            {dateFa(u.createdAt)}
                            <span className="mr-1 text-[10px]">({timeAgoFa(u.createdAt)})</span>
                          </>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="max-w-[220px] px-2 py-2.5">
                        <p className="truncate" title={u.sampleProductName}>
                          {u.sampleProductName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{u.sampleCategory ?? ''}</p>
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-muted-foreground">{toFa(u.adsSeen)}</td>
                      <td className="px-2 py-2.5">
                        <UserImportButton state={st} onImport={() => void importUser(u)} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <SingleUserExtract onPhone={(b) => setBudget(b)} onStartImport={startImport} pollJob={pollJob} />
    </div>
  );
}

/** جمع کل برای توست پایان */
function totalsLabel(bs: BatchRow[]) {
  const t = { updated: 0 };
  for (const b of bs) if (b.res) t.updated += b.res.updated;
  return t;
}

// ═══════════════════ دکمهٔ ایمپورت هر کاربر ═══════════════════

function UserImportButton({ state, onImport }: { state: UserState; onImport: () => void }) {
  switch (state.kind) {
    case 'checking':
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 size={13} className="animate-spin" /> بررسی…
        </span>
      );
    case 'phone':
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 size={13} className="animate-spin" /> گرفتن شماره…
        </span>
      );
    case 'importing':
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-primary">
          <Loader2 size={13} className="animate-spin" /> در حال ایمپورت…
        </span>
      );
    case 'done':
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
          <CheckCircle2 size={14} /> ایمپورت شد
        </span>
      );
    case 'exists':
      return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <CheckCircle2 size={14} className="text-muted-foreground" /> از قبل در ایمچ
          {state.imachUserName ? (
            <b dir="ltr" className="text-foreground">
              @{state.imachUserName}
            </b>
          ) : null}
        </span>
      );
    case 'error':
      return (
        <div className="flex flex-col items-end gap-1">
          <Button size="sm" variant="outline" className="h-7 gap-1.5 rounded-md text-[11px]" onClick={onImport}>
            <UserPlus size={13} /> تلاش مجدد
          </Button>
          <span className="max-w-[220px] truncate text-[10px] text-red-600" title={state.message}>
            {state.message}
          </span>
        </div>
      );
    default:
      return (
        <Button
          size="sm"
          className="h-7 gap-1.5 rounded-md text-[11px]"
          onClick={onImport}
        >
          <UserPlus size={13} /> ایمپورت
        </Button>
      );
  }
}

// ═══════════════════ استخراج تک‌کاربر ═══════════════════

function SingleUserExtract({
  onPhone,
  onStartImport,
  pollJob,
}: {
  onPhone: (b: { limit: number; used: number; remaining: number }) => void;
  onStartImport: (userName: string, phone?: string) => Promise<string>;
  pollJob: (id: string) => void;
}) {
  const { toast } = useToast();
  const [userName, setUserName] = useState('');
  const [busy, setBusy] = useState(false);

  const run = async () => {
    const name = userName.trim().replace(/^@/, '');
    if (!name) return;
    setBusy(true);
    try {
      const res = await updateApi.extractUser({ adminPhone: ADMIN_PHONE, userName: name });
      if (res.exists) {
        toast({
          title: 'از قبل در ایمچ است',
          description: res.imach ? `یوزرنیم آیمچ: @${res.imach.userName} — شماره‌اش هم گرفته نشد` : undefined,
        });
        return;
      }
      if (res.budget) onPhone(res.budget);
      const jobId = await onStartImport(name, res.phone);
      pollJob(jobId);
      toast({ title: `ایمپورت @${name} شروع شد`, description: 'پیشرفت در پنل بالا' });
      setUserName('');
    } catch (err) {
      toast({
        title: 'استخراج ناموفق بود',
        description: err instanceof Error ? err.message : 'خطای نامشخص',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border bg-card p-4">
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-extrabold">
          <Search size={15} className="text-primary" />
          استخراج تک‌کاربر
        </h3>
        <p className="text-[11px] text-muted-foreground">
          یوزرنیم باسکول → چک دیتابیس → شمارهٔ موبایل → ایمپورت کامل
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        <Input
          dir="ltr"
          placeholder="یوزرنیم باسکول (مثل sajjaddourbin)"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !busy) void run();
          }}
          disabled={busy}
          className="h-9 max-w-xs flex-1 text-left"
        />
        <Button onClick={() => void run()} disabled={busy || !userName.trim()} className="gap-2">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
          استخراج و ایمپورت
        </Button>
      </div>
      <p className="mt-2.5 text-[10px] leading-5 text-muted-foreground">
        قبل از هر تماس با باسکول، یوزرنیم با کلید باسکولی (bUserName) در دیتابیس چک می‌شود — کاربر موجود
        هیچ درخواستی به باسکول نمی‌دهد و شماره‌اش هم گرفته نمی‌شود. شماره‌گیری موبایل با کوکی انجام
        می‌شود و هر کوکی فقط ۲۰ شماره می‌دهد.
      </p>
    </section>
  );
}
