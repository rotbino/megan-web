/**
 * کلاینت API ایمپورتر پاسکال — ارتباط مستقیم با بک‌اند ایمچ (megan-back).
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
  /** (۱۵-۱۱ شب) نگهبان شبکه: true یعنی جاب در حال اجرا همین حالا در انتظار
   *  بازگشت اینترنت است — توقف موقت، نه شکست؛ بعد از وصل شدن از همان‌جا ادامه می‌یابد */
  netWaiting?: boolean;
  /** سلامت سشن پاسکال (۱۵-۱۱): true = لاگین، false = سشن مهمان/بی‌اثر،
   *  null = بدون کوکی یا خطای شبکه — کوکی مهمان هم cookieSet:true می‌دهد
   *  ولی متن کامنت‌ها را باز نمی‌کند */
  cookieLoggedIn?: boolean | null;
  /** (۲۲-۱۱ — ریشه‌یابی خطای «کوکی لاگین نیست») تشخیص ساختار کوکی:
   *  hasRemember یعنی جفت‌های user_phone/user_password موجودند (سشن ۲ ساعته
   *  خودش ترمیم می‌شود)؛ cleaned یعنی رشتهٔ Set-Cookie کپی شده بود و
   *  خودکار پاک‌سازی شد */
  cookieDiag?: {
    hasRemember: boolean;
    hasSession: boolean;
    cleaned: boolean;
  };
  adminPhone: string;
  /** درایور ذخیرهٔ عکس‌ها — local یعنی دیسک ./uploads، arvan یعنی ابر */
  storageDriver?: string;
  /** وضعیت گام پاسکال (۱۴-۱۱) — فاصلهٔ مؤثر/هم‌زمانی/ضریب عقب‌نشینی تطبیقی */
  pace?: { gapMs: number; effectiveGapMs: number; concurrency: number; penalty: number };
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
  /** کلیدهای واقعی سند نمونهٔ منبع — عیب‌یابی ناهماهنگی نام ستون */
  rawKeys?: string[];
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
  /** single = تک‌کاربره | list = لیستی از user-buskool | pending = گروهی از
   *  جدول «در انتظار ایمپورت» با شماره‌های گرفته‌شده (۲۶-۱۱) */
  kind: 'single' | 'list' | 'pending';
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
  /** (۱۵-۱۱ شب) نگهبان شبکه: جاب متوقف نشده — فقط در انتظار اتصال است */
  netWaiting?: boolean;
  /** از چه لحظه‌ای منتظر شبکه مانده (مهر یونیکس ms) */
  netWaitSince?: number | null;
  /** (۱۶-۱۱) توقف موقت: درخواست pause ثبت شده/اعمال شده — ادامه با resume */
  paused?: boolean;
  /** (۱۶-۱۱) درخواست pause ثبت شده — هنوز به ایستگاه امن نرسیده */
  pauseRequested?: boolean;
  /** (۱۶-۱۱) درخواست توقف ثبت شده — اعمال بین درخواست‌ها؛ دوبار زدن = فوری */
  stopRequested?: boolean;
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
    /** (۲۰-۱۱) هویت دوگانه — یوزرنیم آیمچ مستقل + یوزرنیم/احراز پاسکال */
    bUserName: string | null;
    bVerified: boolean;
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

  /** ایمپورت گروهی «در انتظارهایی که موبایل دارند» (۲۶-۱۱) — منبع جدول
   *  انتظار، قدیمی‌ترین اول؛ همان جاب لیستی با پول و کنترل توقف/ادامه */
  startPendingImport: (input: { adminPhone: string; maxProductsPerUser?: number }) =>
    fetch(`${BASE}/pending-import`, {
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
    }).then((r) =>
      json<{ stopped: boolean; status: string; mode?: 'graceful' | 'forced' | 'already-finished' }>(r),
    ),

  /** توقف موقت جاب (۱۶-۱۱) — در نخستین ایستگاه امن می‌ایستد و منتظر می‌ماند */
  pauseJob: (id: string, adminPhone: string) =>
    fetch(`${BASE}/jobs/${id}/pause`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPhone }),
    }).then((r) => json<{ paused: boolean; status: string }>(r)),

  /** ادامهٔ جاب بعد از توقف موقت (۱۶-۱۱) — از همان ایستگاه */
  resumeJob: (id: string, adminPhone: string) =>
    fetch(`${BASE}/jobs/${id}/resume`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ adminPhone }),
    }).then((r) => json<{ resumed: boolean; status: string }>(r)),

  preview: (userName: string) =>
    fetch(`${BASE}/preview/${encodeURIComponent(userName)}`).then((r) => json<ImportPreview>(r)),
};

// ═══════════════════════════════════════════════════════════════════════════
// مدیریت کاربران ایمپورت‌شده — بخش «دیتا ایمپورت» (خواستهٔ مالک ۱۳-۱۱)
// اندپوینت‌ها پشت توکن ادمین هستند — همان توکن پنل مدیریت (imach:admin-token)
// ═══════════════════════════════════════════════════════════════════════════

const ADMIN_TOKEN_KEY = 'imach:admin-token';

/** fetch با هدر Authorization توکن ادمین — 401 یعنی نشست مدیریت منقضی */
async function adminFetch(path: string, body?: unknown): Promise<Response> {
  let token = '';
  try {
    token = localStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
  } catch {
    /* SSR/حالت خصوصی */
  }
  return fetch(`${API_BASE}/api/v1/${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body !== undefined ? { method: 'POST', body: JSON.stringify(body) } : {}),
    cache: 'no-store',
  });
}

/** سند رفتار کاربر در پاسکال — آینهٔ BUserData بک‌اند (b-user-data.ts) */
export interface BUserDoc {
  source: 'buskool';
  userName: string;
  userId: number;
  profileId: number | null;
  premium: { isPremium: boolean; packageType: number; packageTitle: string };
  isVerified: boolean;
  isBuyer: boolean;
  isSeller: boolean;
  isBlocked: boolean;
  walletBalance: number;
  phoneViewPermission: string | null;
  categoryId: number | null;
  customerStatus: string | null;
  supportStatus: string | null;
  comingFrom: string | null;
  activityType: string | null;
  activityDomain: string | null;
  sex: string | null;
  province: string | null;
  city: string | null;
  address: string | null;
  postalCode: string | null;
  isCompany: boolean;
  companyName: string;
  companyRegisterCode: string | null;
  confirmed: boolean;
  relateds: string[];
  profilePhotoUrl: string | null;
  descriptionRaw: string | null;
  descriptionIsAuto: boolean;
  responseRate: number | null;
  reputationScore: string | null;
  productsCount: number | null;
  ratingCount: number | null;
  ratingAvg: number | null;
  ibp: boolean;
  createdAt: string | null;
  importedAt: string;
  contactedAt: string | null;
}

export interface ImportedUserRow {
  id: string;
  phone: string;
  userName: string;
  bUserName: string | null;
  firstName: string;
  lastName: string;
  sex: string | null;
  avatarUrl: string | null;
  role: string;
  isActive: boolean;
  isVerified: boolean;
  /** (۲۰-۱۱) احراز پاسکال — دادهٔ رفتاری، بدون اعتبار در آیمچ */
  bVerified: boolean;
  failedImport: boolean;
  /** دلیل آخرین شکست ایمپورت (۱۵-۱۱) — از profile.bImportError؛ null = بدون ثبت */
  importError: { message: string; sig: string; at: string } | null;
  /** کاربر کمکی نویسندهٔ کامنت پاسکال (bk-c*) */
  isStub: boolean;
  hasBusinessDesc: boolean;
  provinceId: number | null;
  cityId: number | null;
  provinceName: string | null;
  cityName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  b: BUserDoc | null;
  productsCount: number;
  /** (۱۹-۱۱) خودش با دکمهٔ «ایمپورت از وب» ایمپورت را کامل کرده — ردّ پایهٔ
   *  «کاربر واقعی ایمچ»: حداقل یک جلسهٔ WebImportSession done دارد */
  selfImported: boolean;
  /** (تسک ۳۵ — ۲۱-۱۱) منبع ایمپورت — 'buskool' | 'daymat' | null (بومی) */
  importSource: string | null;
  /** (تسک ۳۵) سند دیمت — { daymatUserId, businessName, … } | null */
  d: Record<string, unknown> | null;
}

export interface ImportedUsersSummary {
  total: number;
  pascal: number;
  native: number;
  stub: number;
  /** (تسک ۳۵ — ۲۱-۱۱) ایمپورت‌شده از دیمت */
  daymat: number;
  premiumPascal: number;
  /** (۲۲-۱۱ — خواستهٔ مالک) تفکیک ویژه‌های پاسکال بر اساس نوع بسته‌ای که
   *  خریده‌اند (۱=دوماهه ۲=شش‌ماهه ۳=یک‌ساله) — مبنای برآورد درآمد پاسکال
   *  در کارت‌های بالای صفحهٔ مدیریت کاربران */
  premiumPackages?: { packageType: number; title: string; count: number }[];
  neverLoggedIn: number;
  contacted: number;
  cameAfterContact: number;
  failed: number;
  /** (۱۹-۱۱) خودشان ایمپورت از وب را کامل کرده‌اند — کاربران واقعی ایچ */
  selfImported: number;
  needsMigration: number;
  /** (۲۰-۱۱) هنوز جداسازی هویت آیمچ/پاسکال نشده — دکمهٔ «جداسازی هویت» */
  needsIdentityFix: number;
}

export interface ImportedUsersList {
  rows: ImportedUserRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  summary: ImportedUsersSummary;
}

export interface ImportedUsersParams {
  q?: string;
  source?: 'buskool' | 'native' | 'stub' | 'daymat' | 'all';
  premium?: 'yes' | 'no';
  packageType?: number;
  login?: 'ever' | 'never' | 'after-contact';
  contacted?: 'yes' | 'no';
  failed?: 'yes' | 'no';
  /** (۱۹-۱۱) ایمپورت از وب با دست خود کاربر — جلسهٔ کامل‌شده */
  selfImport?: 'yes' | 'no';
  staleDays?: number;
  /** بازهٔ تاریخ ثبت‌نام — ISO میلادی (خواستهٔ مالک ۱۵-۱۱) */
  createdFrom?: string;
  createdTo?: string;
  sort?: 'lastLogin' | 'createdAt' | 'products' | 'pascalCreated' | 'imported' | 'contacted';
  dir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ImportedUserDetail {
  user: {
    id: string;
    phone: string;
    userName: string;
    bUserName: string | null;
    firstName: string;
    lastName: string;
    sex: string | null;
    role: string;
    isActive: boolean;
    isVerified: boolean;
    bVerified: boolean;
    isBuyer: boolean;
    isSeller: boolean;
    avatarUrl: string | null;
    businessDesc: string | null;
    walletBalance: number;
    activePakageType: number;
    provinceName: string | null;
    cityName: string | null;
    profile: Record<string, unknown> | null;
    b: BUserDoc | null;
    d: Record<string, unknown> | null;
    importSource: string | null;
    failedImport: boolean;
    lastLoginAt: string | null;
    lastSeenAt: string | null;
    createdAt: string;
    catalogId: string | null;
  };
  counts: {
    products: number;
    reviewsReceived: number;
    reviewsWritten: number;
    buyRequests: number;
    photos: number;
    supplyOffers: number;
  };
  products: {
    id: number;
    name: string;
    price: number | null;
    stock: number;
    unit: string;
    status: string;
    isElevated: boolean;
    category: string | null;
    createdAt: string;
  }[];
}

export const importedUsersApi = {
  list: (params: ImportedUsersParams) => {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '' && k !== 'source') qs.set(k, String(v));
      if (k === 'source' && v && v !== 'all') qs.set(k, v);
    }
    return adminFetch(`importer/users${qs.size ? `?${qs}` : ''}`).then((r) => json<ImportedUsersList>(r));
  },

  detail: (id: string) => adminFetch(`importer/users/${id}`).then((r) => json<ImportedUserDetail>(r)),

  markContacted: (id: string, undo = false) =>
    adminFetch(`importer/users/${id}/contact`, { undo: String(undo) }).then(
      (r) => json<{ id: string; contactedAt: string | null }>(r),
    ),

  remove: (ids: string[], adminPhone: string) =>
    adminFetch('importer/users/delete', { ids, adminPhone }).then((r) =>
      json<{ deleted: number; failed: number; results: { id: string; ok: boolean; reason?: string }[] }>(r),
    ),

  migrateB: (adminPhone: string) =>
    adminFetch('importer/migrate-b', { adminPhone }).then((r) =>
      json<{ migrated: number; premiumFixed: number }>(r),
    ),

  /** (۲۰-۱۱) جداسازی هویت آیمچ از پاسکال — احراز پاسکال → bVerified،
   *  isVerified همه false، یوزرنیم آیمچِ برابر پاسکال → تصادفی یکتا.
   *  سرورلس: هر فراخوانی حداکثر ۵۰۰ نفر — حلقه تا done:true */
  fixIdentity: (adminPhone: string, batch?: number) =>
    adminFetch(`importer/fix-identity${batch ? `?batch=${batch}` : ''}`, { adminPhone }).then((r) =>
      json<FixIdentityResult>(r),
    ),
};

export interface FixIdentityResult {
  renamedUserNames: number;
  renameFailed: number;
  /** هنوز مانده — فراخوانی بعدی را بزن */
  remaining: number;
  done: boolean;
  /** چند کاربر احرازِ پاسکال‌شان در b_verified ثبت شد (نخستین فراخوانی) */
  bVerifiedSet: number;
  /** چند is_verified کپی‌شده از پاسکال false شد (نخستین فراخوانی) */
  verifiedCleared: number;
  /** پرونده‌های احراز واقعاً تأییدشده که دست نخوردند */
  approvedKept: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// مدیریت آگهی‌های ایمپورت‌شده — «دیتا ایمپورت → آگهی‌ها» + «تصاویر آگهی‌ها»
// (خواستهٔ مالک ۱۳-۱۱). آینهٔ قرارداد بک‌اند: imported-products.service.ts
// ═══════════════════════════════════════════════════════════════════════════

export interface ImportedListingRow {
  id: number;
  productName: string;
  slug: string;
  status: string;
  unit: string;
  categoryId: number;
  subCategoryId: number;
  categoryName: string | null;
  subCategoryName: string | null;
  provinceId: number;
  cityId: number;
  provinceName: string | null;
  cityName: string | null;
  stock: number;
  minSalePrice: number;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  priceUpdatedAt: string | null;
  source: 'buskool' | 'native';
  owner: {
    id: string;
    userName: string;
    firstName: string;
    lastName: string;
    phone: string;
    bUserName: string | null;
    lastLoginAt: string | null;
  };
  edited: boolean;
  lastEditedAt: string | null;
  photoCount: number;
  photoThumb: string | null;
}

export interface ImportedListingsSummary {
  total: number;
  pascal: number;
  native: number;
  ownerLoggedIn: number;
  editedByUser: number;
  withoutPhotos: number;
  pending: number;
}

export interface ImportedListingsList {
  rows: ImportedListingRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  summary: ImportedListingsSummary;
}

export interface ImportedListingsParams {
  q?: string;
  source?: 'buskool' | 'native' | 'all';
  ownerLogin?: 'ever' | 'never';
  edited?: 'yes' | 'no';
  status?: 'pending' | 'confirmed' | 'rejected' | 'deleted' | 'all';
  hasPhotos?: 'yes' | 'no';
  /** بازهٔ تاریخ ثبت آگهی — ISO میلادی (خواستهٔ مالک ۱۵-۱۱) */
  createdFrom?: string;
  createdTo?: string;
  /** بازهٔ تاریخ آخرین تغییر آگهی — ISO میلادی */
  updatedFrom?: string;
  updatedTo?: string;
  sort?: 'createdAt' | 'updatedAt' | 'priceUpdatedAt' | 'views' | 'name';
  dir?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface ProductImageRow {
  id: string;
  url: string;
  thumbUrl: string | null;
  size: number;
  mimeType: string;
  name: string;
  /** زمان ایمپورت/آپلود اولیه */
  createdAt: string;
  /** آخرین تعویض درجا (بایت‌های تازه) — مبنای cache-buster نمایش */
  updatedAt: string;
  width: number | null;
  height: number | null;
  source: 'buskool' | 'native';
  importedFrom: string | null;
  /** URL اصلی فایل در پاسکال (قبل از rehost) */
  originalUrl: string | null;
  replacedAt: string | null;
  /** تاریخ‌های خودِ آگهی (پاسکال) — مبنای سورت/فیلتر شکار واترمارک */
  product: {
    id: number;
    name: string;
    slug: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  } | null;
  owner: { id: string; userName: string; name: string; phone: string; bUserName: string | null } | null;
}

export interface ProductImagesSummary {
  total: number;
  pascal: number;
  native: number;
  replaced: number;
  /** پاسکالی‌های هنوز تعویض‌نشده — باقی‌ماندهٔ کار پاک‌کردن واترمارک */
  pascalRemaining: number;
}

export interface ProductImagesList {
  rows: ProductImageRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  summary: ProductImagesSummary;
}

export interface ProductImagesParams {
  q?: string;
  source?: 'buskool' | 'native' | 'all';
  replaced?: 'yes' | 'no';
  /** حالت گروهی (۱۶-۱۱ عصر): هر آگهی یک ردیف با همهٔ عکس‌هایش */
  group?: 'product';
  /** فیلد سورت — پیش‌فرض productUpdated (آخرین آپدیتِ آگهی، بعد ثبت) */
  sort?:
    | 'productUpdated'
    | 'productCreated'
    | 'productId'
    | 'size'
    | 'photoCount'
    | 'createdAt'
    | 'updatedAt'
    | 'newest'
    | 'oldest';
  dir?: 'asc' | 'desc';
  /** بازهٔ تاریخ ثبتِ خودِ آگهی (پاسکال) — ISO میلادی */
  createdFrom?: string;
  createdTo?: string;
  /** بازهٔ تاریخ آخرین تغییرِ خودِ آگهی — ISO میلادی */
  updatedFrom?: string;
  updatedTo?: string;
  page?: number;
  pageSize?: number;
}

/** عکس داخل کارت گروهی — محصول/مالک روی ردیف گروه هست */
export type ProductImageGroupPhoto = Omit<ProductImageRow, 'product' | 'owner'>;

/** ردیف گروهی (خواستهٔ مالک ۱۶-۱۱ عصر): هر آگهی یک کارت با «همهٔ» عکس‌هایش */
export interface ProductImageGroupRow {
  product: NonNullable<ProductImageRow['product']>;
  owner: ProductImageRow['owner'];
  photos: ProductImageGroupPhoto[];
  photoCount: number;
  totalSize: number;
}

export interface ProductImagesGroupedList {
  rows: ProductImageGroupRow[];
  /** تعداد آگهی‌های منطبق (صفحه‌بندی بر آگهی) */
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  summary: ProductImagesSummary;
}

/** نتیجهٔ تعویض درجا — همان فایل، بایت‌های تازه */
export interface ReplaceImageResult {
  id: string;
  url: string;
  thumbUrl: string | null;
  size: number;
  mimeType: string;
  replacedAt: string;
  productId: string | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// «فقط تصاویر» — شکار واترمارک (خواستهٔ مالک ۱۹-۱۱): هر کاش فقط خودِ تصویر +
// شناسهٔ فایل + سوییچ واترمارک؛ نه عنوان آگهی نه هیچ دادهٔ دیگر. آینهٔ
// قرارداد بک‌اند: imported-products.service.ts (ProductFileRow/…)
// ═══════════════════════════════════════════════════════════════════════════

export interface ProductFileRow {
  /** ObjectId ردیف File — زیر تصویر نمایش داده می‌شود */
  id: string;
  url: string;
  thumbUrl: string | null;
  /** true = واترمارک دارد (صف حذف) | false/null = ندارد یا بررسی‌نشده —
   *  ملاک «بررسی‌شده بودن» reviewedAt است (ایمپورت پیش‌فرض false می‌گذارد) */
  hasWatermark: boolean | null;
  /** (۱۹-۱۱ شب) زمان بررسی — ست یعنی با یکی از دو تیک «دارد/ندارد» بررسی
   *  شده و از لیست باقی‌مانده خارج است؛ null = هنوز بررسی نشده */
  reviewedAt: string | null;
  /** (۱۹-۱۱) زمان اصلاح واترمارک — غیرnull یعنی تمیز شده و در تب «اصلاح واترمارک» است */
  fixedAt: string | null;
  /** id آگهیِ صاحب تصویر (رشته) */
  relatedId: string | null;
  size: number;
  createdAt: string;
}

export interface ProductFilesSummary {
  /** باقی‌مانده = فقط بررسی‌نشده‌ها — هر تیک (دارد/ندارد) فایل را از
   *  لیست خارج می‌کند تا کم‌کم خالی شود (خواستهٔ مالک ۱۹-۱۱ شب) */
  total: number;
  /** صف حذف = «دارد» تیک خورده */
  watermarked: number;
  /** بررسی‌شده = «ندارد» تیک خورده (و هنوز اصلاح نشده) */
  clean: number;
  /** اصلاح‌شده‌ها — تب «اصلاح واترمارک» */
  fixed: number;
}

export interface ProductFilesList {
  rows: ProductFileRow[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  summary: ProductFilesSummary;
}

export interface ProductFilesParams {
  /** فیلتر واترمارک — مبنای جداکردن لیست علامت‌خورده‌ها برای پاک‌سازی؛
   *  fixed = تب «اصلاح واترمارک»: تصاویری که واترمارکشان حذف شده (۱۹-۱۱) */
  watermark?: 'yes' | 'no' | 'fixed' | 'all';
  /** فقط تصاویر این آگهی — لینک عمیق «N عکس» از صفحهٔ آگهی‌ها */
  productId?: number;
  /** سورت بر تاریخ خودِ آگهی (پاسکال) — پیش‌فرض productCreated = زمان ثبت
   *  (خواستهٔ مالک ۱۹-۱۱ عصر)؛ productUpdated = آخرین ویرایش آگهی */
  sort?: 'productCreated' | 'productUpdated';
  page?: number;
  pageSize?: number;
}

/** fetch با توکن ادمین برای بدنهٔ multipart (بدون Content-Type — مرورگر boundary می‌گذارد) */
async function adminFetchForm(path: string, form: FormData): Promise<Response> {
  let token = '';
  try {
    token = localStorage.getItem(ADMIN_TOKEN_KEY) ?? '';
  } catch {
    /* SSR/حالت خصوصی */
  }
  return fetch(`${API_BASE}/api/v1/${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
}

function toQuery(params: Record<string, unknown>): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '' && v !== 'all') qs.set(k, String(v));
  }
  return qs.size ? `?${qs}` : '';
}

export const importedListingsApi = {
  list: (params: ImportedListingsParams) =>
    adminFetch(`importer/products${toQuery(params as Record<string, unknown>)}`).then((r) =>
      json<ImportedListingsList>(r),
    ),
};

export const productImagesApi = {
  list: (params: ProductImagesParams) =>
    adminFetch(`importer/product-images${toQuery(params as Record<string, unknown>)}`).then((r) =>
      json<ProductImagesList>(r),
    ),

  /** حالت گروهی (۱۶-۱۱ عصر): هر آگهی یک کارت با همهٔ عکس‌هایش */
  listGrouped: (params: ProductImagesParams) =>
    adminFetch(
      `importer/product-images${toQuery({ ...params, group: 'product' } as Record<string, unknown>)}`,
    ).then((r) => json<ProductImagesGroupedList>(r)),

  /**
   * تعویض تصویر آگهی — بک‌اند کلید نسخه‌دار تازه می‌سازد (رفع کش ۱۷-۱۱):
   * URL جدید ⇒ کش مرورگر/CDN/بهینه‌ساز فوری می‌شکند؛ تامبنیل هم در کلید
   * تازه بازساخته و کلیدهای قدیمی حذف می‌شوند. ردیف File همان می‌ماند.
   */
  replace: (id: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return adminFetchForm(`importer/product-images/${id}/replace`, form).then((r) =>
      json<ReplaceImageResult>(r),
    );
  },
};

/** (۱۹-۱۱) «فقط تصاویر» — کاش‌های تنها برای شکار واترمارک */
export const productFilesApi = {
  list: (params: ProductFilesParams) =>
    adminFetch(`importer/product-files${toQuery(params as Record<string, unknown>)}`).then((r) =>
      json<ProductFilesList>(r),
    ),

  /** دو تیک «دارد/ندارد» (خواستهٔ مالک ۱۹-۱۱ شب):
   *  true = واترمارک دارد (صف حذف) | false = بررسی‌شده بدون واترمارک |
   *  null = پس‌گرفتن بررسی — بازگشت به لیست باقی‌مانده */
  setWatermark: (id: string, hasWatermark: boolean | null) =>
    adminFetch(`importer/product-files/${id}/watermark`, { hasWatermark }).then((r) =>
      json<{ id: string; hasWatermark: boolean | null }>(r),
    ),

  /** (۱۹-۱۱) پیش‌نمایش حذف خودکار واترمارک پاسکال — بدون هیچ تغییری.
   * بدنهٔ {} لازم است تا adminFetch آن را POST بفرستد (GET روی مسیرِ @Post می‌افتد و 404 می‌شود) */
  wmPreview: (id: string) =>
    adminFetch(`importer/product-files/${id}/wm-preview`, {}).then((r) => json<WmPreviewResult>(r)),

  /** (۱۹-۱۱) اعمال حذف — تعویض درجا + مهر اصلاح (بدنهٔ {} = POST)؛
   *  (۲۱-۱۱) قابل فراخوانی موازی — ده‌ها اصلاح همزمان، هر کدام مستقل */
  wmApply: (id: string) =>
    adminFetch(`importer/product-files/${id}/wm-apply`, {}).then((r) => json<WmApplyResult>(r)),

  /** (۲۱-۱۱) «بررسی شد» گروهی — مهر بررسی روی همهٔ تصاویر دستهٔ فعلی:
   *  دیگر هرگز در صفحهٔ بررسی لود نمی‌شوند و دستهٔ بعدی جای آن‌ها را می‌گیرد */
  reviewBatch: (ids: string[]) =>
    adminFetch('importer/product-files/review-batch', { ids }).then((r) =>
      json<{ updated: number }>(r),
    ),

  /** (۱۹-۱۱) دستهٔ بعدی صف — UI حلقه می‌زند تا صف خالی شود؛
   *  exclude = فایل‌هایی که در دورهای قبل «پیدا نشد/خطا» شدند تا حلقه گیر نکند */
  wmBatch: (limit = 5, exclude?: string[]) =>
    adminFetch('importer/product-files/wm-batch', { limit, exclude }).then((r) => json<WmBatchResult>(r)),
};

/** نتیجهٔ پیش‌نمایش/اعمال حذف واترمارک (بک‌اند: pascal-wm.service) */
export interface WmPreviewResult {
  status: 'removed' | 'not_found';
  score: number | null;
  evidence: number | null;
  scale: number | null;
  box: { x: number; y: number; w: number; h: number } | null;
  ms: number;
  /** برش «قبل (بالا) | بعد (پایین)» دور واترمارک — data URL */
  compareDataUrl?: string;
  /** کل تصویر پاک‌شده — data URL */
  afterDataUrl?: string;
}

export interface WmApplyResult extends WmPreviewResult {
  file: ProductFileRow | null;
  skipped?: string;
}

export interface WmBatchItem {
  id: string;
  relatedId: string | null;
  status: 'removed' | 'not_found' | 'error' | 'skipped';
  score?: number | null;
  ms?: number;
  error?: string;
}

export interface WmBatchResult {
  results: WmBatchItem[];
  counts: { removed: number; notFound: number; error: number; skipped: number };
  remaining: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// آپدیت قیمت‌ها + کاربران جدید پاسکال — «دیتا ایمپورت → آپدیت» (۲۱-۱۱).
// آینهٔ قرارداد بک‌اند: price-update.service.ts — گام‌محور و سرورلس‌پسند؛
// فرانت حلقهٔ بچ‌های ۱۰۰۰تایی را با ۵ ثانیه فاصله می‌چرخاند (گارد سرور هم هست).
// نوسازی ۲۲-۱۱: کاربران جدید همان‌جا در دیتابیس ثبت می‌شوند («کاربران در
// انتظار ایمپورت») — لیست از اندپوینت pending خوانده می‌شود و ماندگار است.
// ═══════════════════════════════════════════════════════════════════════════

/** کاربر پاسکالِ تازه‌ثبت‌نام که هنوز در ایمچ نیست — از user_info آیتم‌های لیست */
export interface ScanNewUser {
  bUserId: number;
  bUserName: string;
  firstName: string;
  lastName: string;
  createdAt: string | null;
  isVerified: boolean;
  activePakageType: number;
  sampleProductId: number;
  sampleProductName: string;
  sampleCategory: string | null;
  samplePrice: number;
  adsSeen: number;
}

/** رکورد «کاربر در انتظار ایمپورت» — ردیف جدول صفحهٔ آپدیت (۲۲-۱۱)؛
 *  ماندگار در دیتابیس؛ موبایل با دکمهٔ «گرفتن موبایل» روی همان رکورد ذخیره می‌شود */
export interface PendingImportUser {
  bUserId: number;
  bUserName: string;
  firstName: string;
  lastName: string;
  createdAt: string | null;
  isVerified: boolean;
  activePakageType: number;
  /** شمارهٔ موبایل — null یعنی هنوز گرفته نشده (بدون موبایل ثبت شده) */
  phone: string | null;
  phoneTakenAt: string | null;
  sampleProductId: number;
  sampleProductName: string;
  sampleCategory: string | null;
  samplePrice: number;
  adsSeen: number;
  /** آخرین باری که در اسکن دیده شد */
  lastSeenAt: string;
  /** تاریخ ثبت رکورد در دیتابیس */
  registeredAt: string;
}

export interface ScanResult {
  from: number;
  to: number;
  fetched: number;
  kept: number;
  inImach: number;
  updated: number;
  unchanged: number;
  notInImach: number;
  usersSeen: number;
  usersMissing: number;
  /** کاربران تازه‌ثبت‌نامِ غایب — همان‌ها در دیتابیس هم ثبت شدند */
  newUsers: ScanNewUser[];
  truncated: boolean;
  at: string;
}

export interface PhoneBudgetInfo {
  limit: number;
  used: number;
  remaining: number;
}

export interface ExtractUserResult {
  exists: boolean;
  phone?: string;
  budget?: PhoneBudgetInfo;
  imach?: { id: string; userName: string; bVerified: boolean };
  note?: string;
}

/** نتیجهٔ ستِ کوکی از مودال — hints/loggedIn/persisted/message (۲۳-۱۱ عصر) */
export interface SetPascalCookieResult {
  hints: { hasRemember: boolean; hasSession: boolean; decodedValuesFixed: boolean };
  /** true = سشن لاگین شناخته شد؛ false = مهمان؛ null = سنجش نشد */
  loggedIn: boolean | null;
  /** در .env لوکال ذخیره شد؟ (تا بعد از ری‌استارت بماند) */
  persisted: boolean;
  message: string;
  budget?: PhoneBudgetInfo;
}

/** کدهای خطایی که «مودال کوکی» را باز می‌کنند — کوکی غایب/نامعتبر/منقضی/تمام */
const PASCAL_COOKIE_ERROR_CODES = new Set([
  'BUSKOOL_COOKIE_MISSING',
  'BUSKOOL_COOKIE_INVALID',
  'BUSKOOL_CSRF',
  'BUSKOOL_UNAUTHORIZED',
  'BUSKOOL_BUDGET_EXHAUSTED',
]);

/** آیا این خطا «کوکی پاسکال» است؟ — مودال «تنظیم کوکی» باید باز شود
 *  (کد پایدار اگر بود؛ وگرنه نشانه‌های متنی پیام) */
export function isPascalCookieError(err: unknown): boolean {
  if (err instanceof ApiError && err.code) return PASCAL_COOKIE_ERROR_CODES.has(err.code);
  const msg = err instanceof Error ? err.message : String(err ?? '');
  return /کوکی پاسکال|کوکی لاگین|مودال «تنظیم کوکی»|توکن CSRF|کوکی تازه/.test(msg);
}

/** json با پیام خطای تمیز — پیام فارسی بک‌اند بدون پیشوند فنی «HTTP 400 —»
 *  (خطاهای این بخش همگی پیام‌های کارپسندِ سرویس‌اند، نه خطای شبکه‌ای).
 *  نوسازی ۲۳-۱۱ عصر: کد ماشینی پایدار (مثل BUSKOOL_COOKIE_INVALID) هم
 *  با پیام می‌آید — فرانت روی کد منطق «مودال کوکی» می‌بندد. */
export class ApiError extends Error {
  /** کد پایدار بک‌اند — AppError code یا RATE_LIMITED و… */
  readonly code?: string;

  constructor(message: string, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

async function jsonClean<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = '';
    let code: string | undefined;
    try {
      const body = await res.json();
      message = body?.message ?? JSON.stringify(body).slice(0, 200);
      if (typeof body?.code === 'string') code = body.code;
    } catch {
      /* بدنهٔ متنی */
    }
    throw new ApiError(message || `HTTP ${res.status}`, code);
  }
  const body = (await res.json()) as { status?: boolean; data?: T };
  return (body && typeof body === 'object' && 'data' in body ? body.data : (body as unknown)) as T;
}

/** نتیجهٔ لیست «در انتظار ایمپورت» — صفحه‌بندی ۵۰تایی + فیلتر روز (۲۳-۱۱) */
export interface PendingListResult {
  users: PendingImportUser[];
  total: number;
  page: number;
  pageSize: number;
  pages: number;
  /** فیلتر روز جاری — null یعنی همهٔ روزها */
  days: number | null;
  removedImported: number;
}

export const updateApi = {
  /** یک تکهٔ ۱۰۰۰تایی از جدیدترین آگهی‌های پاسکال — آپدیت قیمت + شناسایی و
   *  ثبت کاربران جدید در جدول «در انتظار ایمپورت» */
  scan: (input: { adminPhone: string; from: number; to: number; updatePrices?: boolean; recentDays?: number }) =>
    fetch(`${BASE}/update/scan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then((r) => jsonClean<ScanResult>(r)),

  /** لیست «کاربران در انتظار ایمپورت» از دیتابیس — ماندگار بین جلسه‌ها؛
   *  ایمپورت‌شده‌های کامل موقع خواندن خودکار از لیست خارج می‌شوند؛
   *  صفحه‌بندی ۵۰تایی + فیلتر روزِ ثبت‌نام (days=0 امروز، ۱ دیروز، …) */
  pending: (input: { adminPhone: string; page?: number; pageSize?: number; days?: number | null }) =>
    fetch(`${BASE}/update/pending`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminPhone: input.adminPhone,
        page: input.page ?? 1,
        pageSize: input.pageSize ?? 50,
        days: input.days ?? null,
      }),
    }).then((r) => jsonClean<PendingListResult>(r)),

  /** شمارهٔ موبایل یک فروشندهٔ پاسکال — هر کوکی ۲۰ شماره؛ سهمیه در پاسخ؛
   *  با bUserName شماره روی رکورد «در انتظار ایمپورت» هم ذخیره می‌شود */
  fetchPhone: (input: { adminPhone: string; sId: number; pId: number; bUserName?: string }) =>
    fetch(`${BASE}/update/fetch-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then((r) => jsonClean<{ phone: string; budget: PhoneBudgetInfo; saved: boolean }>(r)),

  /** ثبت دستی شمارهٔ موبایل روی رکورد «در انتظار ایمپورت» (خواستهٔ مالک
   *  ۲۴-۱۱): گرفتن خودکار به هر دلیل نشد → مودال ورود شماره باز می‌شود؛
   *  شماره اول در دیتابیس ذخیره می‌شود (بدون مصرف سهمیهٔ ۲۰تایی کوکی) و
   *  فرانت بلافاصله ایمپورت کامل را شروع می‌کند */
  setPhone: (input: { adminPhone: string; bUserName: string; phone: string }) =>
    fetch(`${BASE}/update/set-phone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then((r) => jsonClean<{ saved: boolean; phone: string; at: string }>(r)),

  /** ستِ کوکی پاسکال از مودال پنل — پاک‌سازی هر سبک کپی + ذخیرهٔ ران‌تایم
   *  (بدون ری‌استارت) + ذخیره در .env + سنجش زندهٔ لاگین با /api/user */
  setPascalCookie: (input: { adminPhone: string; cookie: string }) =>
    fetch(`${BASE}/update/pascal-cookie`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then((r) => jsonClean<SetPascalCookieResult>(r)),

  /** پیش‌ایمپورت یک یوزرنیم پاسکال — چک موجود بودن + گرفتن شماره */
  extractUser: (input: { adminPhone: string; userName: string }) =>
    fetch(`${BASE}/update/extract-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    }).then((r) => jsonClean<ExtractUserResult>(r)),
};
