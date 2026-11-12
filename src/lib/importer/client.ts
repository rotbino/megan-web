/**
 * کلاینت API ایمپورتر باسکول — ارتباط مستقیم با بک‌اند ایمچ (megan-back).
 * پیش‌فرض http://localhost:4000 (پورت بک‌اند لوکال)؛ با NEXT_PUBLIC_API_URL قابل تغییر است.
 * پاسخ‌های بک‌اند قرارداد یکنواخت اپ را دارند: { status: true, data } — اینجا باز می‌شوند.
 */

export const API_BASE = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/+$/, '');
export const ADMIN_PHONE = process.env.NEXT_PUBLIC_ADMIN_PHONE ?? '09196421264';

const BASE = `${API_BASE}/api/v1/importer`;

// ─── تایپ‌ها ───────────────────────────────────────────────

export interface PingInfo {
  ok: boolean;
  delayMs: number;
  busy: boolean;
  cookieSet: boolean;
  adminPhone: string;
  /** درایور ذخیرهٔ عکس‌ها — local یعنی دیسک ./uploads، arvan یعنی ابر */
  storageDriver?: string;
}

export interface DbStats {
  users: number;
  products: number;
  photos: number;
  reviews: number;
  buyRequests: number;
  chats: number;
  savedUsers: number;
  serviceInterests: number;
}

export interface SourceInfo {
  connected: boolean;
  reason?: string;
  table?: string;
  phoneColumn?: string;
  userNameColumn?: string;
  total?: number;
  /** تعداد کاربران منبع که ایمپورت شده‌اند (bUserName پر دارد) */
  imported?: number;
  /** ایمپورت‌های ناقص/شکست‌خورده (failedImport) */
  failed?: number;
  sample?: { phone: string; userName: string }[];
}

/** اولین کاربر منبع که هنوز ایمپورت نشده — پرکردن خودکار offset ادامه */
export interface NextUnimported {
  found: boolean;
  offset: number;
  userName?: string;
  total: number;
  importedCount: number;
  remaining: number;
  reason?: string;
}

export interface CleanupResult {
  [table: string]: number | string;
}

export type JobStatus = 'running' | 'done' | 'failed' | 'stopped';
export type StepStatus = 'pending' | 'active' | 'done' | 'failed' | 'skipped';

export interface ImportStep {
  key: string;
  label: string;
  status: StepStatus;
}

export interface LogLine {
  t: number;
  msg: string;
  level: 'info' | 'success' | 'warn' | 'error';
}

export interface ImportJob {
  id: string;
  kind: 'single' | 'list';
  status: JobStatus;
  userName?: string;
  totalUsers?: number;
  currentUserIndex?: number;
  currentUser?: string;
  usersDone?: number;
  usersFailed?: number;
  steps: ImportStep[];
  log: LogLine[];
  counters: Record<string, number>;
  result?: Record<string, unknown>;
  error?: string;
  startedAt: number;
  finishedAt?: number;
}

export interface PreviewProduct {
  id: number;
  bProductId: number | null;
  name: string;
  price: number | null;
  stock: number;
  unit: string;
  category: string | null;
  province: string | null;
  city: string | null;
  createdAt: string;
  photos: { url: string | null; localUrl: string | null }[];
}

export interface ImportPreview {
  user: {
    id: string;
    phone: string;
    userName: string;
    firstName: string;
    lastName: string;
    isVerified: boolean;
    isSeller: boolean;
    role: string;
    createdAt: string;
    bUserId: number | null;
    bActivePackageType: number | null;
    bResponseRate: number | null;
    bReputationScore: string | null;
  };
  profile: {
    address: string | null;
    companyName: string;
    description: string | null;
    confirmed: boolean;
    bRelateds: string[];
  } | null;
  avatar: { url: string | null; localUrl: string | null };
  counts: { products: number; photos: number; reviews: number; buyRequests: number };
  products: PreviewProduct[];
  reviews: {
    id: string;
    rating: number;
    comment: string;
    createdAt: string;
    reviewer: { firstName: string | null; lastName: string | null; city: string | null; isStub: boolean };
  }[];
}

// ─── کلاینت ────────────────────────────────────────────────

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body?.message ?? JSON.stringify(body).slice(0, 200);
    } catch {
      /* بدنهٔ متنی */
    }
    throw new Error(`HTTP ${res.status}${detail ? ` — ${detail}` : ''}`);
  }
  const body = (await res.json()) as { status?: boolean; data?: T };
  // قرارداد یکنواخت بک‌اند: { status: true, data } — ولی پاسخ null هم پذیرفته است
  return (body && typeof body === 'object' && 'data' in body ? body.data : (body as unknown)) as T;
}

export const importerApi = {
  ping: () => fetch(`${BASE}/ping`).then((r) => json<PingInfo>(r)),

  stats: () => fetch(`${BASE}/stats`).then((r) => json<DbStats>(r)),

  sourceInfo: () => fetch(`${BASE}/source-info`).then((r) => json<SourceInfo>(r)),

  nextUnimported: () => fetch(`${BASE}/next-unimported`).then((r) => json<NextUnimported>(r)),

  cleanup: (adminPhone: string) =>
    fetch(`${BASE}/cleanup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPhone }),
    }).then((r) => json<CleanupResult>(r)),

  startSingle: (input: { adminPhone: string; userName: string; phone?: string; maxProducts?: number }) =>
    fetch(`${BASE}/single`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then((r) => json<{ jobId: string }>(r)),

  startList: (input: {
    adminPhone: string;
    offset?: number;
    limit?: number;
    maxProductsPerUser?: number;
  }) =>
    fetch(`${BASE}/list`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then((r) => json<{ jobId: string }>(r)),

  job: (id: string) =>
    fetch(`${BASE}/jobs/${id}`)
      .then((r) => json<ImportJob | null>(r))
      .then((j) => {
        if (!j) throw new Error('جاب پیدا نشد');
        return j;
      }),

  stopJob: (id: string, adminPhone: string) =>
    fetch(`${BASE}/jobs/${id}/stop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPhone }),
    }).then((r) => json<{ stopped: boolean }>(r)),

  preview: (userName: string) =>
    fetch(`${BASE}/preview/${encodeURIComponent(userName)}`).then((r) => json<ImportPreview>(r)),
};
