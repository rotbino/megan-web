'use client';

/**
 * آپدیت قیمت‌ها + «کاربران در انتظار ایمپورت» — صفحهٔ «دیتا ایمپورت → آپدیت»
 * (خواستهٔ مالک ۲۱-۱۱: «یک تیر برای دو نشان»؛ نوسازی ۲۲-۱۱: لیست ماندگار).
 *
 * یک دکمه = یک پاس کامل روی N هزار آگهی آخرِ پاسکال (بدون کوکی، sort_by=RD):
 *   • هر بچ ۱۰۰۰تایی با یک فراخوانی به بک‌اند می‌رود (سرورلس‌پسند — هر تکه
 *     ≪ تایم‌اوت ۶۰ث) و همان‌جا: قیمت/موجودی/حداقل‌سفارش آگهی‌های موجود در
 *     ایمچ مقایسه و فقط متفاوت‌ها آپدیت می‌شوند + کاربران تازه‌ثبت‌نامِ غایب
 *     «همان‌جا در دیتابیس ثبت می‌شوند» (خواستهٔ مالک ۲۲-۱۱: یک بار که پیدا
 *     شدیم دیگر توی دیتابیس داریمش — بدون موبایل).
 *   • بین بچ‌ها ۵ ثانیه وقفه (خواستهٔ مالک: «پاسکال تشخیص ندهد ماشین هست») —
 *     شمارش معکوس روی دکمه + گارد سرور؛ حتی دابل‌کلیک/دو تب فاصله را نمی‌شکند.
 *   • گزارش زندهٔ هر بچ: گرفته‌شده / در ایمچ / آپدیت‌شده / بدون تغییر / آگهی
 *     جدید + جمع کل.
 *
 * «کاربران در انتظار ایمپورت» (۲۲-۱۱):
 *   • جدول از دیتابیس خوانده می‌شود (اندپوینت pending) — ماندگار بین
 *     جلسه‌ها/ریفرش‌ها؛ رکوردهای ایمپورت‌شدهٔ کامل موقع خواندن خودکار از
 *     لیست خارج می‌شوند (خودترمیمی).
 *   • دکمهٔ «گرفتن موبایل»: فقط شماره را از پاسکال می‌گیرد (کوکی — هر کوکی
 *     ۲۰ شماره؛ شمارندهٔ سهمیه روی صفحه) و روی رکورد همان کاربر ذخیره
 *     می‌کند.
 *   • دکمهٔ «ایمپورت»: اول رکورد کاربر را نگاه می‌کند — موبایل گرفته شده →
 *     مستقیم ایمپورت کامل (دادهٔ کاربر، آگهی‌ها، کامنت‌ها و بقیه)؛ نگرفته →
 *     اول موبایل از پاسکال گرفته و ذخیره می‌شود و بلافاصله ایمپورت کامل
 *     شروع می‌شود. با موفقیت، کاربر از لیست خارج می‌شود.
 *
 * نوسازی ۲۴-۱۱ (خواستهٔ مالک — «به هر دلیل»): اگر رکورد موبایل ندارد و
 * گرفتن خودکار از پاسکال هم نشد (کوکی/سهمیه/قفل/خطا — هر چه)، «مودال ورود
 * دستی شماره» باز می‌شود؛ مالک شماره را خودش از باسکول می‌گیرد و وارد
 * می‌کند؛ شماره اول در دیتابیس (رکورد انتظار) ذخیره می‌شود و بعد بلافاصله
 * ایمپورت شروع می‌شود — بدون مصرف سهمیهٔ کوکی. مسیر رفع کوکی هم داخل
 * همان مودال دکمهٔ جداگانه دارد.
 *
 * نوسازی ۲۳-۱۱ (خواستهٔ مالک): لیست «در انتظار ایمپورت» صفحه‌بندی ۵۰تایی +
 * فیلتر روزِ ثبت‌نام (امروز / دیروز / ۲ و ۳ روز پیش / «سایر» با عدد دلخواه /
 * همه) دارد؛ ریشه‌یابی خطای «کوکی لاگین نیست» هم انجام شد — ظرف کوکی زنده:
 * Set-Cookie پاسخ‌های پاسکال پذیرفته و ارسال می‌شود (مثل مرورگر) تا سشنِ
 * ۲ساعتهٔ laravel_session زنده بماند.
 *
 *   • «استخراج تک‌کاربر»: یوزرنیم پاسکال → موجود = توست با یوزرنیم آیمچ بدون
 *     تماس با پاسکال؛ غایب = شماره + ایمپورت کامل.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BadgeCheck,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  Database,
  KeyRound,
  Loader2,
  Phone,
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
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { JobPanel } from '@/components/importer/job-panel';
import {
  ADMIN_PHONE,
  importerApi,
  updateApi,
  isPascalCookieError,
  type ImportJob,
  type PendingImportUser,
  type ScanResult,
  type SetPascalCookieResult,
} from '@/lib/importer/client';
import { dateFa, timeAgoFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

/** اندازهٔ هر بچ — همان سقف سرویس */
const BATCH = 1000;
/** فاصلهٔ بین بچ‌ها (میلی‌ثانیه) — خواستهٔ مالک */
const GAP_MS = 5_000;
/** سقف ایمنی تعداد بچ در یک پاس */
const MAX_BATCHES = 30;
/** تعداد ردیف هر صفحهٔ لیست «در انتظار ایمپورت» — خواستهٔ مالک ۲۳-۱۱ */
const PENDING_PAGE_SIZE = 50;
/** تعداد شماره‌هایی که دکمهٔ «ایمپورت» (گرفتن گروهی — ۲۶-۱۱) می‌گیرد:
 *  ۲۰ کاربرِ اولِ لیست که هنوز شماره ندارند — یکی‌یکی با وقفهٔ ۵ ثانیه‌ای
 *  (سقف سهمیهٔ هر کوکی پاسکال هم ۲۰ شماره است) */
const BULK_PHONE_TAKE = 20;

/** برچسب روز برای فیلتر لیست «در انتظار ایمپورت» — N=0 امروز، ۱ دیروز، … */
function dayLabelFa(days: number): string {
  if (days === 0) return 'امروز';
  if (days === 1) return 'دیروز';
  return `${toFa(days)} روز پیش`;
}

/** شماره‌های دکمه‌های صفحه — تا ۷ صفحه همه؛ بیشتر: اول و آخر + همسایه‌های جاری */
function pageNumbers(current: number, pages: number): (number | '…')[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const set = new Set<number>([1, 2, current - 1, current, current + 1, pages - 1, pages]);
  const nums = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  let prev = 0;
  for (const n of nums) {
    if (n - prev > 1) out.push('…');
    out.push(n);
    prev = n;
  }
  return out;
}

type RunStatus = 'idle' | 'running' | 'pausing' | 'done' | 'stopped' | 'error';

interface BatchRow {
  index: number;
  from: number;
  to: number;
  status: 'pending' | 'running' | 'done' | 'error' | 'skipped';
  res?: ScanResult;
  error?: string;
}

/** وضعیت هر کاربر در لیست (دکمه‌های موبایل/ایمپورت) */
type UserState =
  | { kind: 'idle' }
  | { kind: 'phone' }
  | { kind: 'importing'; jobId: string }
  | { kind: 'done' }
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

  // ── مودال کوکی پاسکال (۲۳-۱۱ عصر) — خواستهٔ مالک: به‌جای ویرایش .env و
  // ری‌استارت، خطای کوکی خودش مودال «تنظیم کوکی» را باز می‌کند؛ بعد از ذخیرهٔ
  // موفق، همان دکمه‌ای که خطا داد خودکار دوباره اجرا می‌شود ──
  const [cookieDialog, setCookieDialog] = useState<{
    open: boolean;
    reason?: string;
    retry?: { kind: 'phone' | 'import'; user: PendingImportUser };
  }>({ open: false });

  // ── مودال ورود دستی شمارهٔ موبایل (۲۴-۱۱ — خواستهٔ مالک): رکورد موبایل
  // ندارد و گرفتن خودکار از پاسکال هم به هر دلیلی نشد → این مودال باز
  // می‌شود؛ شمارهٔ دستی اول در دیتابیس ذخیره و بعد (در حالت ایمپورت)
  // بلافاصله ایمپورت شروع می‌شود ──
  const [manualPhone, setManualPhone] = useState<{
    open: boolean;
    mode: 'phone' | 'import';
    user: PendingImportUser | null;
    reason?: string;
  }>({ open: false, mode: 'phone', user: null });

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

  // ── کاربران در انتظار ایمپورت (لیست ماندگار از دیتابیس) ──
  const [pendingUsers, setPendingUsers] = useState<PendingImportUser[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [userStates, setUserStates] = useState<Record<number, UserState>>({});
  const [budget, setBudget] = useState<{ limit: number; used: number; remaining: number } | null>(null);

  // ── فیلتر روز + صفحه‌بندی ۵۰تایی (خواستهٔ مالک ۲۳-۱۱) ──
  /** روزِ فیلتر ثبت‌نام — null یعنی همهٔ روزها؛ 0=امروز، ۱=دیروز، … */
  const [pendingDay, setPendingDay] = useState<number | null>(null);
  const [pendingPage, setPendingPage] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [pendingPages, setPendingPages] = useState(1);
  /** ورودی عددیِ فیلتر «سایر» (N روز پیش) */
  const [customDayOpen, setCustomDayOpen] = useState(false);
  const [customDayText, setCustomDayText] = useState('');

  // ── جاب ایمپورت در جریان (کاربر لیست یا تک‌کاربر) ──
  const [job, setJob] = useState<ImportJob | null>(null);

  // ── گرفتن گروهی موبایل (۲۶-۱۱ — خواستهٔ مالک): دکمهٔ «ایمپورت» ۲۰ کاربرِ
  // اولِ لیستِ بدون‌شماره را یکی‌یکی با وقفهٔ ۵ ثانیه‌ای شماره می‌گیرد ──
  const [bulkPhone, setBulkPhone] = useState<{ running: boolean; done: number; total: number; countdown: number }>({
    running: false,
    done: 0,
    total: 0,
    countdown: 0,
  });
  const bulkStopRef = useRef(false);
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** جاب در حال اجراست؟ — دکمه‌های ایمپورت دیگر ردیف‌ها قفل می‌شوند */
  const importBusy = job?.status === 'running';

  // شمارش معکوس وقفهٔ بین بچ‌ها
  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1_000);
    return () => clearTimeout(t);
  }, [countdown]);

  // شمارش معکوس وقفهٔ ۵ ثانیه‌ای گرفتن گروهی موبایل (۲۶-۱۱)
  useEffect(() => {
    if (bulkPhone.countdown <= 0) return;
    const t = setTimeout(() => setBulkPhone((b) => ({ ...b, countdown: b.countdown - 1 })), 1_000);
    return () => clearTimeout(t);
  }, [bulkPhone.countdown]);

  useEffect(
    () => () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    },
    [],
  );

  // ── لیست «در انتظار ایمپورت» — با فیلتر روز و صفحهٔ جاری (۲۳-۱۱) ──
  const loadPending = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) setPendingLoading(true);
      try {
        const res = await updateApi.pending({
          adminPhone: ADMIN_PHONE,
          page: pendingPage,
          pageSize: PENDING_PAGE_SIZE,
          days: pendingDay,
        });
        setPendingUsers(res.users);
        setPendingTotal(res.total);
        setPendingPages(res.pages);
        // سرور صفحهٔ درخواستی را محدود می‌کند (مثلاً بعد از حذف ردیف‌ها) —
        // همان را روی UI هم بگذار تا «صفحهٔ خالی» نداشته باشیم
        if (res.page !== pendingPage) setPendingPage(res.page);
      } catch (err) {
        toast({
          title: 'خواندن لیست «در انتظار ایمپورت» ناموفق بود',
          description: err instanceof Error ? err.message : 'خطای نامشخص',
          variant: 'destructive',
        });
      } finally {
        setPendingLoading(false);
      }
    },
    [pendingDay, pendingPage, toast],
  );

  useEffect(() => {
    void loadPending();
  }, [loadPending]);

  // ── فیلتر «سایر»: عدد روز با تأخیر کوتاه اعمال می‌شود (تا حین تایپینگ عدد،
  // به‌ازای هر رقم درخواست نزنیم) ──
  useEffect(() => {
    if (!customDayOpen) return;
    const t = customDayText.trim();
    const n = Number(t);
    if (!t || !Number.isFinite(n) || n < 0 || n > 3650) return;
    const timer = setTimeout(() => {
      setPendingDay(Math.floor(n));
      setPendingPage(1);
    }, 600);
    return () => clearTimeout(timer);
  }, [customDayOpen, customDayText]);

  /** انتخاب فیلتر روز — همیشه به صفحهٔ ۱ برمی‌گردد */
  const pickDay = useCallback((days: number | null) => {
    setPendingDay(days);
    setPendingPage(1);
  }, []);

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
          // کاربر جدیدی پیدا و در دیتابیس ثبت شد؟ لیست ماندگار را بی‌صدا تازه کن
          // (خودترمیمی هم همین‌جا انجام می‌شود: ایمپورت‌شده‌ها خارج می‌شوند)
          if (res.newUsers.length) void loadPending({ silent: true });
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
    [loadPending, recentDays, toast],
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

  /** شروع ایمپورت کامل یک کاربر پاسکالی — پول با فراخواننده */
  const startImport = useCallback(
    async (userName: string, phone?: string) => {
      const { jobId } = await importerApi.startSingle({ adminPhone: ADMIN_PHONE, userName, phone });
      return jobId;
    },
    [],
  );

  /** به‌روزرسانی موبایل یک ردیف پس از «گرفتن موبایل» (بدون تازه‌کردن کل لیست) */
  const patchPendingPhone = useCallback((bUserId: number, phone: string, phoneTakenAt: string) => {
    setPendingUsers((prev) =>
      prev.map((u) => (u.bUserId === bUserId ? { ...u, phone, phoneTakenAt } : u)),
    );
  }, []);

  // ── دکمهٔ «ایمپورت گروهی» (۲۶-۱۱ — خواستهٔ مالک): همهٔ «در انتظار»هایی
  // که موبایل دارند را در یک جاب پشت‌سرهم ایمپورت کامل می‌کند (دادهٔ کاربر،
  // آگهی‌ها، تصاویر، کامنت‌ها) — قدیمی‌ترین اول؛ پیشرفت در پنل جاب ──
  const startGroupImport = useCallback(async () => {
    try {
      const { jobId } = await importerApi.startPendingImport({ adminPhone: ADMIN_PHONE });
      pollJob(jobId);
      toast({
        title: 'ایمپورت گروهی شروع شد',
        description: 'کاربران «در انتظار» که موبایل دارند، قدیمی‌ترین اول، پشت‌سرهم کامل ایمپورت می‌شوند — پیشرفت در پنل زیر',
      });
    } catch (err) {
      toast({
        title: 'شروع ایمپورت گروهی ناموفق بود',
        description: err instanceof Error ? err.message : 'خطای نامشخص',
        variant: 'destructive',
      });
    }
  }, [pollJob, toast]);

  // ── دکمهٔ «ایمپورت» (۲۶-۱۱ — خواستهٔ مالک): گرفتن شمارهٔ موبایل ۲۰ کاربرِ
  // اولِ لیست که هنوز شماره ندارند — یکی‌یکی با وقفهٔ ۵ ثانیه‌ای بین هر دو
  // گرفتن (هر کوکی پاسکال ۲۰ شماره؛ سهمیه با هر پاسخ تازه می‌شود) ──
  const runBulkPhones = useCallback(async () => {
    const targets = pendingUsers.filter((u) => !u.phone).slice(0, BULK_PHONE_TAKE);
    if (!targets.length) {
      toast({
        title: 'کاربرِ بدون‌شماره‌ای در این لیست نیست',
        description: 'فیلتر روز را عوض کنید یا «همه» را ببینید',
      });
      return;
    }
    bulkStopRef.current = false;
    setBulkPhone({ running: true, done: 0, total: targets.length, countdown: 0 });
    let ok = 0;
    let fail = 0;
    let consecFails = 0;
    for (let i = 0; i < targets.length; i++) {
      if (bulkStopRef.current) break;
      const u = targets[i];
      setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'phone' } }));
      try {
        const res = await updateApi.fetchPhone({
          adminPhone: ADMIN_PHONE,
          sId: u.bUserId,
          pId: u.sampleProductId,
          bUserName: u.bUserName,
        });
        setBudget(res.budget);
        patchPendingPhone(u.bUserId, res.phone, new Date().toISOString());
        ok++;
        consecFails = 0;
        setBulkPhone((b) => ({ ...b, done: b.done + 1 }));
      } catch (err) {
        fail++;
        consecFails++;
        setBulkPhone((b) => ({ ...b, done: b.done + 1 }));
        const msg = err instanceof Error ? err.message : 'خطای نامشخص';
        toast({
          title: `گرفتن شمارهٔ @${u.bUserName} ناموفق بود`,
          description: msg,
          variant: 'destructive',
        });
        // دو خطای پیاپی = احتمالاً کوکی/سهمیه تمام شده — ادامه بی‌فایده است
        if (consecFails >= 2) {
          toast({
            title: 'گرفتن گروهی متوقف شد',
            description: 'دو خطای پیاپی — احتمالاً کوکی منقضی یا سهمیهٔ ۲۰تایی تمام شده؛ کوکی را تازه کنید و دوباره بزنید',
            variant: 'destructive',
          });
          break;
        }
      } finally {
        setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'idle' } }));
      }
      // وقفهٔ ۵ ثانیه‌ای بین هر دو گرفتن — به‌جز بعد از آخری
      if (i < targets.length - 1 && !bulkStopRef.current) {
        setBulkPhone((b) => ({ ...b, countdown: Math.ceil(GAP_MS / 1_000) }));
        const until = Date.now() + GAP_MS;
        while (Date.now() < until && !bulkStopRef.current) {
          await new Promise((r) => setTimeout(r, 250));
        }
        setBulkPhone((b) => ({ ...b, countdown: 0 }));
      }
    }
    setBulkPhone((b) => ({ ...b, running: false, countdown: 0 }));
    void loadPending({ silent: true });
    if (ok > 0) {
      toast({
        title: 'گرفتن گروهی موبایل تمام شد',
        description: `${toFa(ok)} شماره گرفته و روی رکوردها ذخیره شد${fail ? ` — ${toFa(fail)} خطا` : ''}؛ حالا «ایمپورت گروهی» را بزنید تا کامل ایمپورت شوند`,
      });
    }
  }, [loadPending, patchPendingPhone, pendingUsers, toast]);

  const stopBulkPhones = () => {
    bulkStopRef.current = true;
    setBulkPhone((b) => ({ ...b, countdown: 0 }));
  };

  /** کاربرانِ بدون شماره در صفحهٔ جاری — دکمهٔ «ایمپورت» وقتی صفر است خاموش می‌ماند */
  const phonelessCount = useMemo(() => pendingUsers.filter((u) => !u.phone).length, [pendingUsers]);

  // ── دکمهٔ «گرفتن موبایل»: فقط شماره می‌گیرد و روی رکورد ذخیره می‌کند ──
  const takePhone = useCallback(
    async (u: PendingImportUser) => {
      setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'phone' } }));
      try {
        const res = await updateApi.fetchPhone({
          adminPhone: ADMIN_PHONE,
          sId: u.bUserId,
          pId: u.sampleProductId,
          bUserName: u.bUserName,
        });
        setBudget(res.budget);
        patchPendingPhone(u.bUserId, res.phone, new Date().toISOString());
        setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'idle' } }));
        toast({
          title: `موبایل @${u.bUserName} گرفته شد`,
          description: `${res.phone} — روی رکوردش در دیتابیس ذخیره شد؛ دکمهٔ ایمپورت دیگر سهمیه نمی‌سوزاند`,
        });
      } catch (err) {
        // (۲۴-۱۱ — خواستهٔ مالک، «به هر دلیل»): گرفتن خودکار نشد → مودال ورود
        // دستی شماره؛ مسیر رفع کوکی هم داخل همان مودال دکمهٔ جداگانه دارد
        const msg = err instanceof Error ? err.message : 'خطای نامشخص';
        setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'idle' } }));
        setManualPhone({ open: true, mode: 'phone', user: u, reason: msg });
      }
    },
    [patchPendingPhone, toast],
  );

  // ── دکمهٔ «ایمپورت»: موبایل داشت → مستقیم؛ نداشت → موبایل + بلافاصله ایمپورت ──
  const importUser = useCallback(
    async (u: PendingImportUser) => {
      try {
        // ۱) موبایلِ قبلاً گرفته‌شده؟ — مستقیم سراغ ایمپورت کامل (بدون پاسکال‌زدن برای شماره)
        let phone = u.phone ?? undefined;
        if (!phone) {
          setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'phone' } }));
          try {
            const res = await updateApi.fetchPhone({
              adminPhone: ADMIN_PHONE,
              sId: u.bUserId,
              pId: u.sampleProductId,
              bUserName: u.bUserName,
            });
            setBudget(res.budget);
            patchPendingPhone(u.bUserId, res.phone, new Date().toISOString());
            phone = res.phone;
          } catch (err) {
            // (۲۴-۱۱ — خواستهٔ مالک، «به هر دلیل»): گرفتن خودکار نشد → مودال
            // ورود دستی؛ بعد از ثبت، شماره در دیتابیس ذخیره و ایمپورت
            // بلافاصله شروع می‌شود
            const msg = err instanceof Error ? err.message : 'خطای نامشخص';
            setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'idle' } }));
            setManualPhone({ open: true, mode: 'import', user: u, reason: msg });
            return;
          }
        }
        // ۲) ایمپورت کامل — دادهٔ کاربر، آگهی‌ها، کامنت‌ها و بقیه
        setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'importing', jobId: '' } }));
        const jobId = await startImport(u.bUserName, phone);
        pollJob(jobId);
        setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'importing', jobId } }));
      } catch (err) {
        // خطای خودِ ایمپورت (نه گوشی‌گیری) — روی ردیف
        const msg = err instanceof Error ? err.message : 'خطای نامشخص';
        setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'error', message: msg } }));
      }
    },
    [patchPendingPhone, pollJob, startImport, toast],
  );

  // ── (۲۴-۱۱) ثبت شمارهٔ دستی مودال: اول در دیتابیس (رکورد انتظار) ذخیره،
  // بعد — اگر حالت ایمپورت بود — بلافاصله شروع ایمپورت کامل ──
  const submitManualPhone = useCallback(
    async (u: PendingImportUser, phone: string, mode: 'phone' | 'import') => {
      const res = await updateApi.setPhone({
        adminPhone: ADMIN_PHONE,
        bUserName: u.bUserName,
        phone,
      });
      patchPendingPhone(u.bUserId, res.phone, res.at);
      if (mode === 'import') {
        setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'importing', jobId: '' } }));
        const jobId = await startImport(u.bUserName, res.phone);
        pollJob(jobId);
        setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'importing', jobId } }));
        toast({
          title: `موبایل @${u.bUserName} ثبت شد — ایمپورت شروع شد`,
          description: `${res.phone} — روی رکوردش در دیتابیس ذخیره شد؛ ایمپورت کامل در حال اجراست`,
        });
      } else {
        setUserStates((s) => ({ ...s, [u.bUserId]: { kind: 'idle' } }));
        toast({
          title: `موبایل @${u.bUserName} ثبت شد`,
          description: `${res.phone} — روی رکوردش در دیتابیس ذخیره شد (بدون مصرف سهمیهٔ کوکی)`,
        });
      }
    },
    [patchPendingPhone, pollJob, startImport, toast],
  );

  // وقتی جاب تمام شد، وضعیت کاربر مربوط را به‌روز کن و از لیست خارجش کن
  useEffect(() => {
    if (!job || job.status === 'running') return;
    // جاب گروهی «در انتظارها» (۲۶-۱۱): ردیفِ خاصی در حالت importing نیست —
    // پایانش فقط لیست را تازه می‌کند (رکوردهای ایمپورت‌شده خودشان خارج می‌شوند)
    if (job.kind === 'pending') {
      if (job.status === 'done') {
        toast({
          title: 'ایمپورت گروهی تمام شد',
          description: `${toFa(job.usersDone ?? 0)} کاربر موفق / ${toFa(job.usersFailed ?? 0)} خطا`,
        });
        void loadPending({ silent: true });
      }
      // خطا/توقف: پیام روی پنل جاب دیده می‌شود
      return;
    }
    const entry = Object.entries(userStates).find(([, v]) => v.kind === 'importing');
    if (!entry) return;
    const [uid] = entry;
    const id = Number(uid);
    if (job.status === 'done') {
      setUserStates((s) => ({ ...s, [id]: { kind: 'done' } }));
      setPendingUsers((prev) => prev.filter((u) => u.bUserId !== id));
      toast({ title: `@${job.userName} کامل ایمپورت شد`, description: 'از لیست «در انتظار ایمپورت» خارج شد' });
      // خودترمیمی: هر رکورد دیگری که در همین حین ایمپورت شده باشد هم خارج شود
      void loadPending({ silent: true });
    }
    // خطا/توقف: پیام روی پنل جاب دیده می‌شود — دکمه برای تلاش مجدد برمی‌گردد
    else setUserStates((s) => ({ ...s, [id]: { kind: 'idle' } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job?.status, loadPending]);

  /** بعد از ذخیرهٔ موفقِ کوکی: سهمیه تازه + تکرار خودکار همان دکمه‌ای که خطا داد */
  const onCookieSaved = useCallback(
    (r: SetPascalCookieResult) => {
      if (r.budget) setBudget(r.budget);
      const retry = cookieDialog.retry;
      setCookieDialog({ open: false });
      if (retry?.kind === 'phone') void takePhone(retry.user);
      else if (retry?.kind === 'import') void importUser(retry.user);
    },
    [cookieDialog.retry, takePhone, importUser],
  );

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
            آپدیت قیمت/موجودی/حداقل‌سفارش آخرین آگهی‌های پاسکال در ایمچ + شناسایی و ثبت کاربران جدید — از
            همان یک لیست، بدون کوکی و با وقفهٔ ۵ ثانیه‌ای بین هر ۱٬۰۰۰تا
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
            {toFa(batchCount)} بچ = تا {(batchCount * BATCH).toLocaleString('fa-IR')} آگهی آخر پاسکال
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
                آگهی جدید پاسکال: <b className="tabular-nums text-foreground">{toFa(totals.notInImach)}</b>
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
            ایمپورت در جریان
            {job.userName ? ` — @${job.userName}` : job.kind === 'pending' ? ' — گروهی (در انتظارها)' : ''}
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

      {/* ─── کاربران در انتظار ایمپورت ─── */}
      <section className="rounded-lg border bg-card p-4">
        <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="flex items-center gap-2 text-sm font-extrabold">
            <Users size={15} className="text-primary" />
            کاربران در انتظار ایمپورت
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary tabular-nums">
              {toFa(pendingTotal)}
            </span>
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <p className="hidden xl:block text-[11px] text-muted-foreground">
              تازه‌ثبت‌نام‌های پاسکال — «بدون موبایل» ثبت و ماندگارند؛ «ایمپورت» شماره می‌گیرد، «ایمپورت گروهی» کامل ایمپورت می‌کند
            </p>
            {/* دکمهٔ «ایمپورت» (۲۶-۱۱): گرفتن گروهی شماره — ۲۰ کاربرِ اولِ
                لیستِ بدون‌شماره، یکی‌یکی با وقفهٔ ۵ ثانیه‌ای */}
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 rounded-md px-2 text-[11px]"
              onClick={() => void runBulkPhones()}
              disabled={bulkPhone.running || pendingLoading || phonelessCount === 0}
              title={`گرفتن شمارهٔ موبایل ${toFa(Math.min(BULK_PHONE_TAKE, phonelessCount))} کاربرِ اولِ این لیست که هنوز شماره ندارند — یکی‌یکی با وقفهٔ ۵ ثانیه‌ای (هر کوکی پاسکال ۲۰ شماره)${pendingDay != null ? '؛ فیلتر روز فعالی است' : ''}`}
            >
              {bulkPhone.running ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  {toFa(bulkPhone.done)}/{toFa(bulkPhone.total)}
                </>
              ) : (
                <>
                  <Phone size={12} />
                  ایمپورت{phonelessCount > 0 ? ` (${toFa(Math.min(BULK_PHONE_TAKE, phonelessCount))})` : ''}
                </>
              )}
            </Button>
            {/* دکمهٔ «ایمپورت گروهی» (۲۶-۱۱): همهٔ در انتظارهایی که موبایل
                دارند در یک جاب پشت‌سرهم کامل ایمپورت می‌شوند */}
            <Button
              size="sm"
              className="h-7 gap-1.5 rounded-md px-2 text-[11px]"
              onClick={() => void startGroupImport()}
              disabled={importBusy || bulkPhone.running || pendingLoading}
              title="ایمپورت کامل همهٔ «در انتظار»هایی که موبایل دارند — دادهٔ کاربر، آگهی‌ها، تصاویر و کامنت‌ها؛ قدیمی‌ترین اول؛ پیشرفت در پنل جاب"
            >
              <UserPlus size={12} />
              ایمپورت گروهی
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 rounded-md px-2 text-[11px]"
              onClick={() => setCookieDialog({ open: true })}
              title="کوکی مرورگرِ لاگین‌شدهٔ باسکول را همین‌جا بچسبانید — ذخیره و تست، بدون ری‌استارت"
            >
              <KeyRound size={12} />
              تنظیم کوکی
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 rounded-md px-2 text-[11px] text-muted-foreground"
              onClick={() => void loadPending()}
              disabled={pendingLoading}
            >
              {pendingLoading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
              تازه‌سازی
            </Button>
          </div>
        </header>

        {/* ── نوار پیشرفت گرفتن گروهی موبایل (۲۶-۱۱) ── */}
        {bulkPhone.running && (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-md border border-primary/30 bg-primary/5 p-2.5 text-xs">
            <Loader2 size={14} className="animate-spin text-primary" />
            <span className="font-bold">گرفتن گروهی موبایل</span>
            <span className="tabular-nums text-muted-foreground">
              {toFa(bulkPhone.done)} از {toFa(bulkPhone.total)}
            </span>
            {bulkPhone.countdown > 0 && (
              <span className="tabular-nums text-muted-foreground">— بعدی در {toFa(bulkPhone.countdown)} ثانیه</span>
            )}
            <Button
              size="sm"
              variant="destructive"
              className="mr-auto h-7 gap-1 rounded-md px-2 text-[11px]"
              onClick={stopBulkPhones}
            >
              <Square size={12} />
              توقف
            </Button>
          </div>
        )}

        {/* ── فیلتر روزِ ثبت‌نام (خواستهٔ مالک ۲۳-۱۱): امروز / دیروز / ۲ و ۳ روز
            پیش / سایر (عدد دلخواه) / همه ── */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <CalendarDays size={14} className="text-muted-foreground" />
          {([null, 0, 1, 2, 3] as (number | null)[]).map((d) => {
            const label = d === null ? 'همه' : dayLabelFa(d);
            return (
              <button
                key={String(d)}
                type="button"
                onClick={() => {
                  if (d !== null && d >= 4) return;
                  if (d === null) setCustomDayOpen(false);
                  pickDay(d);
                }}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors',
                  pendingDay === d
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
                )}
              >
                {label}
              </button>
            );
          })}
          {/* «سایر» — دکمه + اینپوت عدد (مثلا ۸ روز پیش) */}
          <button
            type="button"
            onClick={() => {
              setCustomDayOpen(true);
              if (pendingDay != null && pendingDay >= 4) setCustomDayText(String(pendingDay));
            }}
            className={cn(
              'rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors',
              customDayOpen || (pendingDay != null && pendingDay >= 4)
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
            )}
          >
            سایر{pendingDay != null && pendingDay >= 4 ? ` (${dayLabelFa(pendingDay)})` : ''}
          </button>
          {customDayOpen && (
            <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Input
                dir="ltr"
                type="number"
                min={0}
                max={3650}
                placeholder="مثلا ۸"
                value={customDayText}
                onChange={(e) => setCustomDayText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    const n = Number(customDayText);
                    if (customDayText.trim() && Number.isFinite(n) && n >= 0 && n <= 3650) {
                      setPendingDay(Math.floor(n));
                      setPendingPage(1);
                    }
                  }
                }}
                className="h-7 w-24 rounded-md text-center text-left"
              />
              روز پیش
            </span>
          )}
        </div>

        {pendingLoading && pendingUsers.length === 0 ? (
          <div className="grid place-items-center rounded-md border border-dashed p-6 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : pendingUsers.length === 0 ? (
          <p className="rounded-md border border-dashed p-6 text-center text-xs leading-6 text-muted-foreground">
            {pendingDay != null
              ? `در «${dayLabelFa(pendingDay)}» کاربری در انتظار ایمپورت نیست — فیلتر روز را عوض کنید یا «همه» را ببینید.`
              : 'هنوز کاربری در انتظار ایمپورت نیست — «شروع آپدیت» را بزنید؛ کاربران تازه‌ثبت‌نامِ پاسکال که آگهی دارند و در ایمچ نیستند، همان‌جا در دیتابیس ثبت و همین‌جا فهرست می‌شوند.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b text-[10px] text-muted-foreground">
                  <th className="px-2 py-2 font-medium">کاربر پاسکال</th>
                  <th className="px-2 py-2 font-medium">نام</th>
                  <th className="px-2 py-2 font-medium">ثبت‌نام</th>
                  <th className="px-2 py-2 font-medium">موبایل</th>
                  <th className="px-2 py-2 font-medium">نمونه آگهی</th>
                  <th className="px-2 py-2 font-medium">آگهی‌ها</th>
                  <th className="px-2 py-2 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((u) => {
                  const st = userStates[u.bUserId] ?? { kind: 'idle' };
                  return (
                    <tr key={u.bUserId} className="border-b last:border-0 hover:bg-secondary/40">
                      <td className="px-2 py-2.5">
                        <span className="font-bold" dir="ltr">
                          @{u.bUserName}
                        </span>
                        {u.isVerified && (
                          <span className="mr-1.5 inline-flex items-center gap-0.5 text-amber-600" title="احراز پاسکال — فقط دادهٔ رفتاری">
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
                      <td className="px-2 py-2.5">
                        {u.phone ? (
                          <span
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 font-bold text-emerald-700"
                            dir="ltr"
                            title={
                              u.phoneTakenAt
                                ? `گرفته‌شده ${dateFa(u.phoneTakenAt)} (${timeAgoFa(u.phoneTakenAt)}) — روی رکورد ذخیره است`
                                : 'روی رکورد ذخیره است'
                            }
                          >
                            <Phone size={11} />
                            {u.phone}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="max-w-[200px] px-2 py-2.5">
                        <p className="truncate" title={u.sampleProductName}>
                          {u.sampleProductName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">{u.sampleCategory ?? ''}</p>
                      </td>
                      <td className="px-2 py-2.5 tabular-nums text-muted-foreground">{toFa(u.adsSeen)}</td>
                      <td className="px-2 py-2.5">
                        <UserRowActions
                          user={u}
                          state={st}
                          importBusy={importBusy}
                          onTakePhone={() => void takePhone(u)}
                          onImport={() => void importUser(u)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── صفحه‌بندی ۵۰تایی (خواستهٔ مالک ۲۳-۱۱) ── */}
        {pendingPages > 1 && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
            <p className="text-[11px] text-muted-foreground">
              {pendingDay != null ? `ثبت‌نام ${dayLabelFa(pendingDay)} — ` : ''}
              {toFa(pendingTotal)} کاربر • صفحهٔ {toFa(pendingPage)} از {toFa(pendingPages)}
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 rounded-md px-2 text-[11px]"
                onClick={() => setPendingPage((p) => Math.max(1, p - 1))}
                disabled={pendingLoading || pendingPage <= 1}
              >
                <ChevronRight size={13} />
                قبلی
              </Button>
              {pageNumbers(pendingPage, pendingPages).map((p, i) =>
                p === '…' ? (
                  <span key={`gap-${i}`} className="px-1 text-[10px] text-muted-foreground">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPendingPage(p)}
                    className={cn(
                      'grid size-7 place-items-center rounded-md text-[11px] font-bold tabular-nums',
                      p === pendingPage ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-secondary',
                    )}
                  >
                    {toFa(p)}
                  </button>
                ),
              )}
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1 rounded-md px-2 text-[11px]"
                onClick={() => setPendingPage((p) => Math.min(pendingPages, p + 1))}
                disabled={pendingLoading || pendingPage >= pendingPages}
              >
                بعدی
                <ChevronLeft size={13} />
              </Button>
            </div>
          </div>
        )}
        {pendingPages === 1 && pendingTotal > 0 && (
          <p className="mt-3 border-t pt-3 text-[11px] text-muted-foreground">
            {pendingDay != null ? `ثبت‌نام ${dayLabelFa(pendingDay)} — ` : ''}
            {toFa(pendingTotal)} کاربر در یک صفحه
          </p>
        )}
        <p className="mt-3 text-[10px] leading-5 text-muted-foreground">
          «ایمپورت» (گروهی): ۲۰ کاربرِ اولِ همین لیست که هنوز شماره ندارند، یکی‌یکی با وقفهٔ ۵ ثانیه‌ای شماره‌شان
          گرفته و روی رکوردشان ذخیره می‌شود — هر کوکی پاسکال ۲۰ شماره؛ سهمیهٔ باقی‌مانده بالای صفحه است. «ایمپورت
          گروهی»: همهٔ «در انتظار»هایی که موبایل دارند در یک جاب پشت‌سرهم کامل ایمپورت می‌شوند (دادهٔ کاربر، آگهی‌ها،
          تصاویر، کامنت‌ها) — قدیمی‌ترین اول؛ با توقف/ادامه کنترل می‌شود و کاربر ایمپورت‌شده از این لیست خارج می‌شود.
          «گرفتن موبایل» هر ردیف فقط شمارهٔ همان کاربر را می‌گیرد و ذخیره می‌کند. «ایمپورت» هر ردیف اول رکورد را
          نگاه می‌کند: موبایل داشته باشد مستقیم ایمپورت کامل شروع می‌شود؛ نداشته باشد اول موبایل گرفته و ذخیره
          می‌شود و بلافاصله ایمپورت کامل انجام می‌شود. اگر گرفتن خودکار شماره به هر دلیل نشد (کوکی/سهمیه/قفل و…)،
          مودال «ورود دستی شماره» باز می‌شود — شماره را از پروفایل باسکول خودتان بگیرید و وارد کنید؛ اول در
          دیتابیس ذخیره می‌شود و بعد بلافاصله ایمپورت شروع می‌شود (بدون مصرف سهمیهٔ کوکی). رفع مشکل کوکی هم داخل
          همان مودال دکمهٔ جداگانه دارد.
        </p>
      </section>

      <SingleUserExtract
        onPhone={(b) => setBudget(b)}
        onStartImport={startImport}
        pollJob={pollJob}
        onCookieError={(msg) => setCookieDialog({ open: true, reason: msg })}
      />

      {/* مودال «ورود دستی شماره» (۲۴-۱۱) — گرفتن خودکار به هر دلیل نشد */}
      <ManualPhoneDialog
        open={manualPhone.open}
        mode={manualPhone.mode}
        user={manualPhone.user}
        reason={manualPhone.reason}
        onOpenChange={(o) => setManualPhone((d) => ({ ...d, open: o }))}
        onSubmit={(u, phone) => submitManualPhone(u, phone, manualPhone.mode)}
        onOpenCookie={(reason) => {
          // از داخل مودال دستی: رفع کوکی → بعد از ذخیرهٔ موفق، همان دکمه دوباره
          setManualPhone((d) => ({ ...d, open: false }));
          setCookieDialog({
            open: true,
            reason,
            retry: manualPhone.user
              ? { kind: manualPhone.mode, user: manualPhone.user }
              : undefined,
          });
        }}
      />

      {/* مودال «تنظیم کوکی» — با خطای کوکی خودکار باز می‌شود؛ دکمهٔ «تنظیم کوکی» هم دارد */}
      <PascalCookieDialog
        open={cookieDialog.open}
        onOpenChange={(o) => setCookieDialog((d) => ({ ...d, open: o }))}
        reason={cookieDialog.reason}
        retryLabel={
          cookieDialog.retry ? (cookieDialog.retry.kind === 'phone' ? 'گرفتن موبایل' : 'ایمپورت') : undefined
        }
        onSaved={onCookieSaved}
      />
    </div>
  );
}

/** جمع کل برای توست پایان */
function totalsLabel(bs: BatchRow[]) {
  const t = { updated: 0 };
  for (const b of bs) if (b.res) t.updated += b.res.updated;
  return t;
}

// ═══════════════════ مودال «تنظیم کوکی پاسکال» (۲۳-۱۱ عصر) ═══════════════════

/**
 * خواستهٔ مالک: «اگر خطا داد یه مدال با تکست‌ایریا باز کن و از من بخوای
 * کوکی یا هر چیزی که لازمه رو اونجا پیست کنم. و اوکی کنم و خودت پشت صحنه
 * ست کنی. تا حد امکان کار منو راحت کن».
 *
 * • کوکی مرورگرِ لاگین‌شدهٔ باسکول همین‌جا بچسبد (هر سبک کپی: هدر کامل،
 *   خط‌به‌خط، با Cookie:، حتی رمزگشایی‌شده از پنل Cookies — بک‌اند همه را
 *   به یک شکل استاندارد می‌رساند).
 * • «ذخیره و آزمایش» → بک‌اند همان لحظه ست می‌کند (بدون ری‌استارت)، در
 *   .env ذخیره می‌کند و سنجش زندهٔ لاگین (/api/user) برمی‌گرداند.
 * • نتیجه همان‌جا نمایش داده می‌شود؛ اگر لاگین بود و این مودال به‌خاطر
 *   خطای «گرفتن موبایل / ایمپورت» باز شده باشد، همان کار «خودکار دوباره»
 *   امتحان می‌شود.
 */
function PascalCookieDialog({
  open,
  onOpenChange,
  reason,
  retryLabel,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** پیام خطایی که مودال را باز کرد (خواندنش لازم نیست — فقط برای مرور) */
  reason?: string;
  /** اگر مودال به‌خاطر خطای یک دکمه باز شده، نام همان کار — بعد از ذخیرهٔ
   *  موفق خودکار تکرار می‌شود */
  retryLabel?: string;
  /** loggedIn=true → فرانت عملِ شکست‌خورده را تکرار کند */
  onSaved?: (r: SetPascalCookieResult) => void;
}) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SetPascalCookieResult | null>(null);

  const save = useCallback(async () => {
    const cookie = text.trim();
    if (!cookie) return;
    setSaving(true);
    setResult(null);
    try {
      const r = await updateApi.setPascalCookie({ adminPhone: ADMIN_PHONE, cookie });
      setResult(r);
      if (r.loggedIn === true) {
        toast({
          title: 'کوکی پاسکال ذخیره شد',
          description: `${r.message}${r.persisted ? ' — در .env هم ذخیره شد؛ ری‌استارت لازم نیست' : ''}`,
        });
        onSaved?.(r);
        onOpenChange(false);
        setText('');
      } else {
        toast({
          title: 'کوکی ذخیره شد ولی هنوز مهمان شناخته می‌شود',
          description: r.message,
          variant: 'destructive',
        });
      }
    } catch (err) {
      toast({
        title: 'ذخیرهٔ کوکی نشد',
        description: err instanceof Error ? err.message : 'خطای نامشخص',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  }, [text, toast, onSaved, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound size={17} className="text-primary" />
            تنظیم کوکی پاسکال
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-right">
              {reason && (
                <p className="rounded-md border border-red-200 bg-red-50 p-2.5 text-[11px] leading-5 text-red-700">
                  دلیل باز شدن: {reason.slice(0, 220)}
                  {reason.length > 220 ? '…' : ''}
                </p>
              )}
              <div className="rounded-md border bg-secondary/40 p-3 text-[11px] leading-6 text-muted-foreground">
                <b className="text-foreground">کوکی را این‌طور بگیرید:</b>
                <br />
                ۱. در باسکول لاگین هستید؟ همین مرورگر را باز نگه دارید
                <br />
                ۲. کلید <b>F12</b> → زبانهٔ <b>Network</b> → روی سایت هر درخواستی کلیک کنید
                <br />
                ۳. در <b>Request Headers</b> ردیف <b dir="ltr">cookie</b> را پیدا کنید → روی مقدارش
                راست‌کلیک → <b>Copy value</b> (کل مقدار؛ سه جفت: user_phone و user_password و
                laravel_session)
                <br />
                ۴. همین‌جا بچسبانید و «ذخیره و آزمایش» را بزنید — ذخیره می‌شود، همین‌جا تست
                می‌شود و {retryLabel ? <b className="text-foreground">«{retryLabel}» خودکار دوباره امتحان می‌شود</b> : 'نیازی به ری‌استارت نیست'}
                <br />
                <span className="text-[10px]">
                  ⚠️ از پنل Application→Cookies کپی نکنید (مقدارهایش رمزگشایی‌اند) — اگر باز کپی
                  کنید، خودکار اصلاح می‌شود. جفت‌های user_phone و user_password یادآورِ لاگین‌اند و
                  تا ماه‌ها کار می‌کنند؛ laravel_session فقط ۲ ساعت عمر دارد و خودش تمدید می‌شود.
                </span>
              </div>
              <Textarea
                dir="ltr"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="user_phone=eyJ…%3D%3D; user_password=eyJ…%3D%3D; laravel_session=…"
                className="min-h-[88px] rounded-md font-mono text-[11px] leading-5"
                spellCheck={false}
              />
              {result && (
                <div
                  className={cn(
                    'rounded-md border p-2.5 text-[11px] leading-6',
                    result.loggedIn === true
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800',
                  )}
                >
                  <b>{result.loggedIn === true ? '✓ سشن لاگین شناخته شد' : '✗ هنوز مهمان'}</b>
                  {' — '}
                  {result.message}
                  <br />
                  جفت‌ها: user_phone {result.hints.hasRemember ? '✓' : '✗'} · user_password{' '}
                  {result.hints.hasRemember ? '✓' : '✗'} · laravel_session{' '}
                  {result.hints.hasSession ? '✓' : '✗'}
                  {result.budget != null && (
                    <>
                      {' '}· سهمیهٔ شماره‌ها: {toFa(result.budget.remaining)} از {toFa(result.budget.limit)}
                    </>
                  )}
                </div>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button onClick={() => void save()} disabled={saving || !text.trim()} className="gap-2">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
            ذخیره و آزمایش
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            بستن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════ مودال «ورود دستی شمارهٔ موبایل» (۲۴-۱۱) ═══════════════════

/**
 * خواستهٔ مالک: «برای ایمپورت دیتای کاربران منتظر ایمپورت، به هر دلیل اگر
 * در رکورد کاربر شمارهٔ موبایلش نبود و با کد هم نتونستی شماره رو بگیری،
 * مودال باز کن و بگو شمارهٔ موبایل رو وارد کن؛ بعد من دستی از باسکول
 * می‌گیرم و وارد می‌کنم؛ بعد تو اول شماره رو اینزت کن توی دیتابیس و بعد
 * بلافاصله شروع کن به ایمپورت».
 *
 * • reason = همان خطای گرفتن خودکار (خواندنش لازم نیست — فقط برای مرور)
 * • mode=import → دکمهٔ «ذخیره و شروع ایمپورت»؛ mode=phone → «ذخیره شماره»
 * • شماره اول در دیتابیس (رکورد انتظار) ذخیره می‌شود بعد ایمپورت شروع
 * • مسیر رفع کوکی هم داخل همین مودال دکمهٔ جداگانه دارد
 */
function ManualPhoneDialog({
  open,
  onOpenChange,
  mode,
  user,
  reason,
  onSubmit,
  onOpenCookie,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  /** import = بعد از ذخیره بلافاصله ایمپورت شروع می‌شود؛ phone = فقط ذخیره */
  mode: 'phone' | 'import';
  user: PendingImportUser | null;
  /** پیام خطای گرفتن خودکار که مودال را باز کرد */
  reason?: string;
  /** ثبت شماره — resolve یعنی موفق (مودال بسته می‌شود)؛ reject داخل مودال نمایش داده می‌شود */
  onSubmit: (user: PendingImportUser, phone: string) => Promise<void>;
  /** باز کردن مودال «تنظیم کوکی» از داخل همین مودال */
  onOpenCookie: (reason: string) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // با هر بار باز شدن، کادر تمیز شروع می‌کند
  useEffect(() => {
    if (open) {
      setText('');
      setError(null);
      setBusy(false);
    }
  }, [open]);

  /** نرمال‌سازی ورودی: ارقام فارسی/عربی → لاتین؛ فقط ۱۱رقمیِ ۰۹… */
  const normalizeInput = (raw: string): string | null => {
    const s = raw
      .replace(/[\u06F0-\u06F9\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) & 0xf))
      .replace(/[\s\-()]/g, '');
    if (/^0098/.test(s)) return `0${s.slice(4)}`.length === 11 ? `0${s.slice(4)}` : null;
    if (/^98(9\d{9})$/.test(s)) return `0${s.slice(2)}`;
    if (/^9\d{9}$/.test(s)) return `0${s}`;
    return /^09\d{9}$/.test(s) ? s : null;
  };

  const save = async () => {
    if (!user || busy) return;
    setError(null);
    const phone = normalizeInput(text.trim());
    if (!phone) {
      setError('شماره را ۱۱ رقم و با ۰۹ وارد کنید (مثل ۰۹۱۲۳۴۵۶۷۸۹) — ارقام فارسی هم پذیرفته است');
      return;
    }
    setBusy(true);
    try {
      await onSubmit(user, phone);
      // موفق — والد خودش مودال را می‌بندد/وضعیت ردیف را به‌روز می‌کند
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ثبت شماره ناموفق بود');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone size={17} className="text-primary" />
            ورود دستی شمارهٔ موبایل
            {user && <span dir="ltr" className="font-bold">@{user.bUserName}</span>}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 text-right">
              {reason && (
                <p className="rounded-md border border-red-200 bg-red-50 p-2.5 text-[11px] leading-5 text-red-700">
                  گرفتن خودکار نشد: {reason.slice(0, 220)}
                  {reason.length > 220 ? '…' : ''}
                </p>
              )}
              <div className="rounded-md border bg-secondary/40 p-3 text-[11px] leading-6 text-muted-foreground">
                <b className="text-foreground">شماره را این‌طور بگیرید:</b>
                <br />
                در باسکول پروفایل همین فروشنده را باز کنید (@
                <span dir="ltr">{user?.bUserName ?? ''}</span>) → دکمهٔ «نمایش شمارهٔ تماس» را بزنید →
                شماره را کپی و همین‌جا وارد کنید.
                <br />
                ثبت شماره <b className="text-foreground">سهمیهٔ ۲۰تایی کوکی را مصرف نمی‌کند</b> و
                {mode === 'import' ? (
                  <>
                    {' '}
                    بعد از ذخیره در دیتابیس، <b className="text-foreground">ایمپورت کامل بلافاصله شروع می‌شود</b>
                  </>
                ) : (
                  ' روی رکورد ذخیره می‌شود'
                )}
                .
              </div>
              <Input
                dir="ltr"
                inputMode="numeric"
                placeholder="09123456789"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void save();
                }}
                disabled={busy}
                className="h-10 text-left font-bold tracking-wider"
                autoFocus
              />
              {error && (
                <p className="flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 p-2 text-[11px] leading-5 text-red-700">
                  <CircleAlert size={13} className="shrink-0" />
                  {error}
                </p>
              )}
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button onClick={() => void save()} disabled={busy || !text.trim()} className="gap-2">
            {busy ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
            {mode === 'import' ? 'ذخیره و شروع ایمپورت' : 'ذخیره شماره'}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenCookie(reason ?? 'گرفتن خودکار شماره از پاسکول ناموفق بود')}
            disabled={busy}
            className="gap-2"
            title="کوکی مرورگرِ لاگین‌شدهٔ باسکول را در مودال جداگانه تنظیم می‌کنید"
          >
            <KeyRound size={14} />
            رفع مشکل کوکی
          </Button>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            بستن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ═══════════════════ دکمه‌های هر ردیف ═══════════════════

/** پیام خطای ردیف — کوتاه در جدول، با کلیک دیالوگ کامل (پیام‌های خود-تشخیصِ
 *  گوشی‌گیری ۲۳-۱۱ بلندند: هر دو اندپوینت + وضعیت کوکی + سنجش زنده) */
function UserRowError({ message }: { message: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="max-w-[240px] truncate text-right text-[10px] text-red-600 underline decoration-dotted underline-offset-2"
        title="کلیک: جزئیات خطا"
        onClick={() => setOpen(true)}
      >
        {message}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <CircleAlert size={16} /> خطای گوشی‌گیری / ایمپورت
            </DialogTitle>
            <DialogDescription asChild>
              <p className="whitespace-pre-wrap break-words text-right text-[12px] leading-6 text-foreground">
                {message}
              </p>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </>
  );
}

function UserRowActions({
  user,
  state,
  importBusy,
  onTakePhone,
  onImport,
}: {
  user: PendingImportUser;
  state: UserState;
  importBusy: boolean;
  onTakePhone: () => void;
  onImport: () => void;
}) {
  switch (state.kind) {
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
    case 'error':
      return (
        <div className="flex flex-col items-end gap-1">
          <div className="flex gap-1.5">
            {!user.phone && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 rounded-md text-[11px]"
                onClick={onTakePhone}
              >
                <Phone size={13} /> گرفتن موبایل
              </Button>
            )}
            <Button size="sm" variant="outline" className="h-7 gap-1.5 rounded-md text-[11px]" onClick={onImport}>
              <UserPlus size={13} /> تلاش مجدد
            </Button>
          </div>
          <UserRowError message={state.message} />
        </div>
      );
    default:
      return (
        <div className="flex gap-1.5">
          {!user.phone && (
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1.5 rounded-md text-[11px]"
              onClick={onTakePhone}
            >
              <Phone size={13} /> گرفتن موبایل
            </Button>
          )}
          <Button
            size="sm"
            className="h-7 gap-1.5 rounded-md text-[11px]"
            onClick={onImport}
            disabled={importBusy}
            title={importBusy ? 'یک جاب ایمپورت در حال اجراست' : undefined}
          >
            <UserPlus size={13} /> ایمپورت
          </Button>
        </div>
      );
  }
}

// ═══════════════════ استخراج تک‌کاربر ═══════════════════

function SingleUserExtract({
  onPhone,
  onStartImport,
  pollJob,
  onCookieError,
}: {
  onPhone: (b: { limit: number; used: number; remaining: number }) => void;
  onStartImport: (userName: string, phone?: string) => Promise<string>;
  pollJob: (id: string) => void;
  /** خطای کوکی → مودال «تنظیم کوکی» باز شود (کوکبک والد) */
  onCookieError?: (message: string) => void;
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
      const msg = err instanceof Error ? err.message : 'خطای نامشخص';
      if (isPascalCookieError(err) && onCookieError) {
        // کوکی → مودال باز شود؛ یوزرنیم در کادر مانده و کاربر دوباره «استخراج» می‌زند
        onCookieError(msg);
        return;
      }
      toast({
        title: 'استخراج ناموفق بود',
        description: msg,
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
          یوزرنیم پاسکال → چک دیتابیس → شمارهٔ موبایل → ایمپورت کامل
        </p>
      </header>
      <div className="flex flex-wrap gap-2">
        <Input
          dir="ltr"
          placeholder="یوزرنیم پاسکال (مثل sajjaddourbin)"
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
        قبل از هر تماس با پاسکال، یوزرنیم با کلید پاسکالی (bUserName) در دیتابیس چک می‌شود — کاربر موجود
        هیچ درخواستی به پاسکال نمی‌دهد و شماره‌اش هم گرفته نمی‌شود. شماره‌گیری موبایل با کوکی انجام
        می‌شود و هر کوکی فقط ۲۰ شماره می‌دهد. اگر خطای «کوکی لاگین نیست» آمد، مودال «تنظیم کوکی» خودش
        باز می‌شود — کل هدر cookie مرورگرِ لاگین‌شده (هر سه جفت user_phone و user_password و
        laravel_session) را همان‌جا بچسبانید؛ ذخیره و تست هم همان‌جا انجام می‌شود و ری‌استارت لازم نیست.
        سشنِ laravel_session فقط ۲ ساعت بی‌کار می‌ماند ولی بک‌اند مثل مرورگر هر تمدیدش را نگه می‌دارد
        و جفت‌های یادآور (user_phone/user_password) سشن مرده را خودشان ترمیم می‌کنند — برای همین
        برنامهٔ قدیمی با کوکی‌های ماه‌ها قدیمی هم کار می‌کرد.
      </p>
    </section>
  );
}
