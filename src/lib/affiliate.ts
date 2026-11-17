/**
 * ماژول بازاریابی افلیت (همکاری در فروش) — دومرحله‌ای
 * ─────────────────────────────────────────────────────
 * خودکفا: تایپ‌ها + دیتای نمونه + لایه API در یک فایل.
 * منطبق بر مدل‌های affiliate_* بک‌اند (megan-back/prisma/schema.prisma).
 *
 * فاز فعلی (ماک): وضعیت پذیرش قرارداد و نقش کاربر جاری در localStorage
 * نگه داشته می‌شود. فاز اتصال: همین توابع به endpointهای
 * /api/v1/affiliate/... بک‌اند تغییر می‌کنند (قرارداد ApiError دارِ
 * src/lib/api/client.ts) و این فایل تنها نقطه تعویض است.
 *
 * جریان:
 *  ۱. ورود با لینک دعوت (?ref=کد) → کوکی ۹۰ روزه (components/shared/referral-capture)
 *  ۲. ثبت‌نام → referredById روی کاربر جدید (بک‌اند)
 *  ۳. پذیرش قرارداد → snapshot شرایط (درصد/سال/منابع) روی پروفایل بازاریاب
 *  ۴. تایید هر پرداخت دعوت‌شده (خرید بسته/شارژ کیف پول) → level1٪ به کیف پول
 *  ۵. مدیر بازاریابی: + level2٪ از فروش مشتریان بازاریابان زیرمجموعه
 */

// ─── تایپ‌ها ─────────────────────────────────────────────────────────────────

/** نقش سیستمی بازاریاب — مستقل از نقش کاربر در بازار (خریدار/فروشنده/عمده‌فروش...) */
export type AffiliateRole = 'marketer' | 'manager';

/** منبع پرداخت مشتری که می‌تواند مشمول کمیسیون باشد — ادمین با تیک انتخاب می‌کند */
export type CommissionSource = 'package' | 'wallet';

/** تنظیمات سراسری افلیت — قابل تغییر از پنل ادمین؛ مبنای قراردادهای جدید */
export interface AffiliateSettings {
  level1Percent: number; // درصد سهم بازاریاب از پرداخت مشتریان معرفی‌شده (پیش‌فرض ۵۰)
  level2Percent: number; // درصد اضافه مدیر از فروش مشتریان زیرمجموعه‌ها (پیش‌فرض ۱۰)
  commissionYears: number; // تا چند سال از پرداخت هر مشتری سهم تعلق می‌گیرد
  commissionOnPackage: boolean; // تیک: خرید بسته (پیش‌فرض روشن)
  commissionOnWalletCharge: boolean; // تیک: شارژ کیف پول
}

/** پروفایل بازاریاب کاربر جاری — شرایط قرارداد snapshot شده در لحظه پذیرش */
export interface AffiliateProfile {
  role: AffiliateRole;
  referralCode: string; // کد رفرال عددی — انتهای لینک دعوت
  referralLink: string; // لینک دعوت کامل
  contractAcceptedAt: string;
  level1Percent: number;
  level2Percent: number;
  commissionYears: number;
  commissionOnPackage: boolean;
  commissionOnWalletCharge: boolean;
}

/** یک پرداخت دعوت‌شده (فیش) — بابت چه چیزی، چقدر، تاییدشده یا نه */
export interface InviteePayment {
  id: number;
  source: CommissionSource;
  title: string; // «بسته ویژه — یک‌ماهه» / «شارژ کیف پول»
  amount: number; // تومان
  approved: boolean; // فیش پرداخت تاییدشده؟
  createdAt: string;
}

/** کاربر دعوت‌شده — با شماره تماس برای پیگیری/تشویق به پرداخت */
export interface AffiliateInvitee {
  id: number;
  name: string;
  phone: string;
  createdAt: string; // تاریخ عضویت از طریق لینک دعوت
  payments: InviteePayment[];
}

/** کمیسیون بازاریاب — با تایید پرداخت مشتری به کیف پول واریز می‌شود */
export interface AffiliateEarning {
  id: number;
  payerName: string; // مشتری که پرداخت را انجام داد
  source: CommissionSource;
  sourceTitle: string; // مشتری بابت چه چیزی پرداخت کرده
  paymentAmount: number; // مبلغ پرداخت مشتری (تومان)
  percent: number; // درصد اعمال‌شده از snapshot قرارداد
  amount: number; // کمیسیون (تومان)
  tier: 1 | 2; // ۱ = مشتری مستقیم | ۲ = مشتریِ بازاریاب زیرمجموعه (سهم مدیر)
  viaMarketerName?: string; // در tier=۲: نام بازاریاب زیرمجموعه
  approved: boolean; // پرداخت مشتری تایید شده؟ (true = واریزشده به کیف پول)
  createdAt: string;
}

/** بازاریاب زیرمجموعه — فقط برای مدیر بازاریابی */
export interface AffiliateSubMarketer {
  id: number;
  name: string;
  phone: string;
  referralCode: string;
  inviteeCount: number;
  salesTotal: number; // مجموع فروش مشتریان او (تومان)
  activeSince: string;
}

/** پیام ادمین ↔ بازاریاب */
export interface AffiliateMessage {
  id: number;
  fromAdmin: boolean; // true: از ادمین | false: از بازاریاب
  body: string;
  createdAt: string;
}

/** نمای کلی پنل بازاریاب کاربر جاری */
export interface AffiliateOverview {
  profile: AffiliateProfile | null; // null = هنوز قرارداد را نپذیرفته (گیت قرارداد)
  settings: AffiliateSettings; // تنظیمات فعلی — برای متن داینامیک قرارداد
  walletPaid: number; // مجموع درآمد واریزشده به کیف پول
  walletPending: number; // در انتظار تایید پرداخت مشتری
  inviteeCount: number;
}

/** ردیف بازاریاب در پنل ادمین — با دعوت‌شده‌ها و پرداخت‌های آنها */
export interface AdminAffiliateRow {
  id: number; // شناسه کاربر
  name: string;
  phone: string;
  role: AffiliateRole;
  referralCode: string;
  inviteeCount: number;
  salesTotal: number; // مجموع پرداخت‌های تاییدشده مشتریان او
  walletBalance: number; // کیف پول بازاریابی او
  active: boolean;
  isCurrentUser?: boolean;
  invitees: AffiliateInvitee[];
  earnings: AffiliateEarning[];
}

/** پرداخت اخیر مشتری — فید پنل ادمین (چه کسی، بابت چه چیزی، سهم چه کی) */
export interface AdminPaymentRow {
  id: number;
  payerName: string;
  marketerName: string; // بازاریابِ معرف (ذی‌نفع level1)
  managerName?: string; // مدیر بازاریابی ذی‌نفع level2 (در صورت وجود)
  source: CommissionSource;
  sourceTitle: string;
  amount: number;
  approved: boolean;
  commissionAmount: number; // سهم level1 بازاریاب
  managerCut?: number; // سهم level2 مدیر
  createdAt: string;
}

// ─── ثابت‌ها و دیتای نمونه (فاز ماک) ────────────────────────────────────

/** شناسه کاربر جاری نمونه (سامی جابر) — در فاز اتصال از پروفایل لاگین می‌آید */
export const AFFILIATE_DEMO_USER_ID = 1959629;

/** کد رفرال عددی کاربر جاری — انتهای لینک دعوت: /?ref=10234 */
export const AFFILIATE_USER_CODE = '10234';

/** دامنه لینک دعوت — در فاز اتصال از env/origin می‌آید */
export const AFFILIATE_LINK_BASE = 'https://imach.ir';

/** تنظیمات پیش‌فرض — ادمین از پنل قابل تغییر است */
export const AFFILIATE_DEFAULT_SETTINGS: AffiliateSettings = {
  level1Percent: 50,
  level2Percent: 10,
  commissionYears: 2,
  commissionOnPackage: true,
  commissionOnWalletCharge: false,
};

/** دعوت‌شده‌های کاربر جاری — شماره تماس برای پیگیری + سابقه پرداخت‌ها */
const DEMO_INVITEES: AffiliateInvitee[] = [
  {
    id: 101,
    name: 'رضا محمدی',
    phone: '09121112233',
    createdAt: '2026-11-01 10:24',
    payments: [
      { id: 9011, source: 'package', title: 'بسته ویژه — یک‌ماهه', amount: 690_000, approved: true, createdAt: '2026-11-03 18:02' },
    ],
  },
  {
    id: 102,
    name: 'علی رضایی',
    phone: '09197778899',
    createdAt: '2026-10-28 08:33',
    payments: [
      { id: 9012, source: 'package', title: 'بسته عادی — یک‌ماهه', amount: 290_000, approved: true, createdAt: '2026-10-30 12:15' },
      { id: 9013, source: 'wallet', title: 'شارژ کیف پول', amount: 500_000, approved: true, createdAt: '2026-11-08 16:47' },
    ],
  },
  {
    id: 103,
    name: 'فاطمه کریمی',
    phone: '09353334455',
    createdAt: '2026-11-05 21:10',
    payments: [
      { id: 9014, source: 'package', title: 'بسته عادی — یک‌ماهه', amount: 290_000, approved: false, createdAt: '2026-11-15 09:41' },
    ],
  },
  {
    id: 104,
    name: 'مریم حسینی',
    phone: '09395556677',
    createdAt: '2026-11-10 14:52',
    payments: [],
  },
  {
    id: 105,
    name: 'حسین یوسفی',
    phone: '09174445566',
    createdAt: '2026-11-12 19:05',
    payments: [],
  },
];

/**
 * کمیسیون‌های کاربر جاری — منطبق بر دعوت‌شده‌های بالا + سهم سطح ۲ از زیرمجموعه‌ها.
 * توجه: شارژ کیف پول «علی رضایی» (۵۰۰ هزار) طبق تیک‌های قرارداد مشمول کمیسیون نیست.
 */
const DEMO_EARNINGS: AffiliateEarning[] = [
  {
    id: 8011, payerName: 'رضا محمدی', source: 'package', sourceTitle: 'بسته ویژه — یک‌ماهه',
    paymentAmount: 690_000, percent: 50, amount: 345_000, tier: 1, approved: true, createdAt: '2026-11-03 18:05',
  },
  {
    id: 8012, payerName: 'علی رضایی', source: 'package', sourceTitle: 'بسته عادی — یک‌ماهه',
    paymentAmount: 290_000, percent: 50, amount: 145_000, tier: 1, approved: true, createdAt: '2026-10-30 12:18',
  },
  {
    id: 8013, payerName: 'فاطمه کریمی', source: 'package', sourceTitle: 'بسته عادی — یک‌ماهه',
    paymentAmount: 290_000, percent: 50, amount: 145_000, tier: 1, approved: false, createdAt: '2026-11-15 09:45',
  },
  // ── سطح ۲ — فقط وقتی کاربر «مدیر بازاریابی» باشد نمایش/محاسبه می‌شود ──
  {
    id: 8021, payerName: 'نرگس عباسی', source: 'package', sourceTitle: 'بسته ویژه — یک‌ماهه',
    paymentAmount: 690_000, percent: 10, amount: 69_000, tier: 2, viaMarketerName: 'زهرا موسوی', approved: true, createdAt: '2026-11-09 11:30',
  },
  {
    id: 8022, payerName: 'کامران نجفی', source: 'package', sourceTitle: 'بسته عادی — یک‌ماهه',
    paymentAmount: 290_000, percent: 10, amount: 29_000, tier: 2, viaMarketerName: 'حسن کریمی', approved: false, createdAt: '2026-11-14 20:12',
  },
];

/** زیرمجموعه‌های کاربر جاری — فقط با نقش «مدیر بازاریابی» */
const DEMO_SUBS: AffiliateSubMarketer[] = [
  {
    id: 201, name: 'زهرا موسوی', phone: '09123334455', referralCode: '20871',
    inviteeCount: 3, salesTotal: 1_480_000, activeSince: '2026-10-18 09:12',
  },
  {
    id: 202, name: 'حسن کریمی', phone: '09361112233', referralCode: '31542',
    inviteeCount: 2, salesTotal: 560_000, activeSince: '2026-11-02 17:40',
  },
];

/** پیام‌های پایه ادمین ↔ کاربر جاری — پیام‌های ارسالی جدید محلی اضافه می‌شوند */
const DEMO_MESSAGES: AffiliateMessage[] = [
  {
    id: 8501, fromAdmin: true,
    body: 'سلام، به برنامه بازاریابی ایمچ خوش آمدید. لینک دعوت شما آماده است؛ آن را برای مشتریان و همکارانتان ارسال کنید.',
    createdAt: '2026-11-02 09:30',
  },
  {
    id: 8502, fromAdmin: true,
    body: 'پرداخت مشتری «رضا محمدی» تایید شد و ۳۴۵٫۰۰۰ تومان به کیف پول شما واریز شد.',
    createdAt: '2026-11-03 18:06',
  },
  {
    id: 8503, fromAdmin: false,
    body: 'سلام، ممنون. برای گرفتن نقش مدیر بازاریابی چه شرایطی لازم است؟',
    createdAt: '2026-11-10 11:12',
  },
  {
    id: 8504, fromAdmin: true,
    body: 'سلام و وقت بخیر. کافی است از طریق لینک دعوت خود، بازاریاب‌های زیرمجموعه جذب کنید؛ ادمین پس از بررسی، نقش مدیر را به شما می‌دهد و ۱۰٪ از فروش مشتریان آنها به شما تعلق می‌گیرد.',
    createdAt: '2026-11-10 12:40',
  },
];

/** سایر بازاریاب‌ها برای پنل ادمین (به‌جز کاربر جاری که از state می‌آید) */
const OTHER_AFFILIATES: {
  row: Omit<AdminAffiliateRow, 'isCurrentUser' | 'invitees' | 'earnings'>;
  invitees: AffiliateInvitee[];
  earnings: AffiliateEarning[];
}[] = [
  {
    row: {
      id: 201, name: 'زهرا موسوی', phone: '09123334455', role: 'marketer', referralCode: '20871',
      inviteeCount: 3, salesTotal: 1_180_000, walletBalance: 590_000, active: true,
    },
    invitees: [
      {
        id: 301, name: 'نرگس عباسی', phone: '09122223344', createdAt: '2026-11-06 12:20',
        payments: [{ id: 9101, source: 'package', title: 'بسته ویژه — یک‌ماهه', amount: 690_000, approved: true, createdAt: '2026-11-09 11:28' }],
      },
      {
        id: 302, name: 'سمیرا ادیبی', phone: '09388889900', createdAt: '2026-11-08 09:15',
        payments: [{ id: 9102, source: 'package', title: 'بسته عادی — یک‌ماهه', amount: 290_000, approved: true, createdAt: '2026-11-11 15:33' }],
      },
      {
        id: 303, name: 'تیمور رستمی', phone: '09145556677', createdAt: '2026-11-12 20:02',
        payments: [],
      },
    ],
    earnings: [
      {
        id: 9201, payerName: 'نرگس عباسی', source: 'package', sourceTitle: 'بسته ویژه — یک‌ماهه',
        paymentAmount: 690_000, percent: 50, amount: 345_000, tier: 1, approved: true, createdAt: '2026-11-09 11:30',
      },
      {
        id: 9202, payerName: 'سمیرا ادیبی', source: 'package', sourceTitle: 'بسته عادی — یک‌ماهه',
        paymentAmount: 290_000, percent: 50, amount: 145_000, tier: 1, approved: true, createdAt: '2026-11-11 15:35',
      },
    ],
  },
  {
    row: {
      id: 202, name: 'حسن کریمی', phone: '09361112233', role: 'marketer', referralCode: '31542',
      inviteeCount: 2, salesTotal: 290_000, walletBalance: 0, active: true,
    },
    invitees: [
      {
        id: 311, name: 'کامران نجفی', phone: '09180001122', createdAt: '2026-11-13 10:44',
        payments: [{ id: 9111, source: 'package', title: 'بسته عادی — یک‌ماهه', amount: 290_000, approved: false, createdAt: '2026-11-14 20:10' }],
      },
      {
        id: 312, name: 'لیلا شریفی', phone: '09324445566', createdAt: '2026-11-14 18:26',
        payments: [],
      },
    ],
    earnings: [
      {
        id: 9211, payerName: 'کامران نجفی', source: 'package', sourceTitle: 'بسته عادی — یک‌ماهه',
        paymentAmount: 290_000, percent: 50, amount: 145_000, tier: 1, approved: false, createdAt: '2026-11-14 20:12',
      },
    ],
  },
  {
    row: {
      id: 203, name: 'مهدی احمدی', phone: '09135557788', role: 'manager', referralCode: '44890',
      inviteeCount: 5, salesTotal: 2_670_000, walletBalance: 1_335_000, active: true,
    },
    invitees: [
      {
        id: 321, name: 'پروین اسدی', phone: '09111112233', createdAt: '2026-10-20 11:05',
        payments: [{ id: 9121, source: 'package', title: 'بسته ویژه — یک‌ماهه', amount: 690_000, approved: true, createdAt: '2026-10-22 13:14' }],
      },
      {
        id: 322, name: 'بابک توکلی', phone: '09198887766', createdAt: '2026-10-25 16:48',
        payments: [{ id: 9122, source: 'wallet', title: 'شارژ کیف پول', amount: 1_000_000, approved: true, createdAt: '2026-10-26 09:30' }],
      },
    ],
    earnings: [
      {
        id: 9221, payerName: 'پروین اسدی', source: 'package', sourceTitle: 'بسته ویژه — یک‌ماهه',
        paymentAmount: 690_000, percent: 50, amount: 345_000, tier: 1, approved: true, createdAt: '2026-10-22 13:16',
      },
    ],
  },
];

// ─── حالت محلی (فاز ماک) ────────────────────────────────────────────────

const AFFILIATE_KEY = 'imach:affiliate'; // { acceptedAt, role, snapshot }
const AFFILIATE_SETTINGS_KEY = 'imach:affiliate-settings'; // تنظیمات ویرایش‌شده ادمین
const AFFILIATE_ROLES_KEY = 'imach:affiliate-roles'; // نقش دموی بازاریاب‌های دیگر
const AFFILIATE_MSGS_KEY = 'imach:affiliate-msgs'; // پیام‌های اضافه: { [userId]: AffiliateMessage[] }

const LATENCY = 300;
const delay = <T,>(value: T, ms = LATENCY): Promise<T> =>
  new Promise((resolve) => setTimeout(() => resolve(value), ms));

const nowFa = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

interface AffiliateState {
  acceptedAt: string;
  role: AffiliateRole;
  snapshot: AffiliateSettings;
}

function readAffiliateState(): AffiliateState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(AFFILIATE_KEY);
    return raw ? (JSON.parse(raw) as AffiliateState) : null;
  } catch {
    return null;
  }
}

function writeAffiliateState(state: AffiliateState | null) {
  if (typeof window === 'undefined') return;
  try {
    if (state) window.localStorage.setItem(AFFILIATE_KEY, JSON.stringify(state));
    else window.localStorage.removeItem(AFFILIATE_KEY);
  } catch {
    /* noop */
  }
}

function readSettings(): AffiliateSettings {
  if (typeof window === 'undefined') return { ...AFFILIATE_DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(AFFILIATE_SETTINGS_KEY);
    if (raw) return { ...AFFILIATE_DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<AffiliateSettings>) };
  } catch {
    /* noop */
  }
  return { ...AFFILIATE_DEFAULT_SETTINGS };
}

function writeSettings(s: AffiliateSettings) {
  try {
    window.localStorage.setItem(AFFILIATE_SETTINGS_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

function readRoles(): Record<number, AffiliateRole> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(AFFILIATE_ROLES_KEY);
    return raw ? (JSON.parse(raw) as Record<number, AffiliateRole>) : {};
  } catch {
    return {};
  }
}

function writeRoles(roles: Record<number, AffiliateRole>) {
  try {
    window.localStorage.setItem(AFFILIATE_ROLES_KEY, JSON.stringify(roles));
  } catch {
    /* noop */
  }
}

function readExtraMessages(): Record<number, AffiliateMessage[]> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(AFFILIATE_MSGS_KEY);
    return raw ? (JSON.parse(raw) as Record<number, AffiliateMessage[]>) : {};
  } catch {
    return {};
  }
}

function writeExtraMessages(map: Record<number, AffiliateMessage[]>) {
  try {
    window.localStorage.setItem(AFFILIATE_MSGS_KEY, JSON.stringify(map));
  } catch {
    /* noop */
  }
}

/** درآمدهای مجاز کاربر جاری — سطح ۲ فقط برای مدیر */
function myEarnings(role: AffiliateRole): AffiliateEarning[] {
  return DEMO_EARNINGS.filter((e) => e.tier === 1 || role === 'manager');
}

// ─── API پنل بازاریاب ──────────────────────────────────────────────────

/** نمای کلی پنل بازاریابی — profile=null یعنی قرارداد هنوز پذیرفته نشده */
export async function getAffiliateOverview(): Promise<AffiliateOverview> {
  const settings = readSettings();
  const state = readAffiliateState();
  if (!state) {
    return delay({ profile: null, settings, walletPaid: 0, walletPending: 0, inviteeCount: 0 }, 250);
  }
  const earnings = myEarnings(state.role);
  const walletPaid = earnings.filter((e) => e.approved).reduce((s, e) => s + e.amount, 0);
  const walletPending = earnings.filter((e) => !e.approved).reduce((s, e) => s + e.amount, 0);
  const profile: AffiliateProfile = {
    role: state.role,
    referralCode: AFFILIATE_USER_CODE,
    referralLink: `${AFFILIATE_LINK_BASE}/?ref=${AFFILIATE_USER_CODE}`,
    contractAcceptedAt: state.acceptedAt,
    ...state.snapshot,
  };
  return delay({ profile, settings, walletPaid, walletPending, inviteeCount: DEMO_INVITEES.length }, 250);
}

/** پذیرش قرارداد — شرایط لحظه پذیرش به‌عنوان snapshot ذخیره می‌شود */
export async function acceptAffiliateContract(): Promise<{ ok: true }> {
  const settings = readSettings();
  writeAffiliateState({
    acceptedAt: nowFa(),
    role: 'marketer',
    snapshot: { ...settings },
  });
  return delay({ ok: true }, 700);
}

/** دعوت‌شده‌های کاربر جاری — با شماره تماس و سابقه پرداخت */
export async function getAffiliateInvitees(): Promise<AffiliateInvitee[]> {
  return delay(DEMO_INVITEES.map((i) => ({ ...i, payments: i.payments.map((p) => ({ ...p })) })), 300);
}

/** درآمدهای کاربر جاری — سطح ۲ فقط برای مدیر */
export async function getAffiliateEarnings(): Promise<AffiliateEarning[]> {
  const state = readAffiliateState();
  const role = state?.role ?? 'marketer';
  return delay(myEarnings(role).map((e) => ({ ...e })), 300);
}

/** زیرمجموعه‌ها — فقط برای مدیر بازاریابی */
export async function getAffiliateSubMarketers(): Promise<AffiliateSubMarketer[]> {
  const state = readAffiliateState();
  if (state?.role !== 'manager') return delay([], 200);
  return delay(DEMO_SUBS.map((s) => ({ ...s })), 300);
}

/** پیام‌های کاربر جاری با ادمین — پایه + پیام‌های ارسالی محلی */
export async function getAffiliateMessages(): Promise<AffiliateMessage[]> {
  const extras = readExtraMessages()[AFFILIATE_DEMO_USER_ID] ?? [];
  const all = [...DEMO_MESSAGES, ...extras];
  all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return delay(all.map((m) => ({ ...m })), 250);
}

/** ارسال پیام از بازاریاب به ادمین */
export async function sendAffiliateMessage(body: string): Promise<AffiliateMessage> {
  const msg: AffiliateMessage = { id: Date.now(), fromAdmin: false, body: body.trim(), createdAt: nowFa() };
  const map = readExtraMessages();
  map[AFFILIATE_DEMO_USER_ID] = [...(map[AFFILIATE_DEMO_USER_ID] ?? []), msg];
  writeExtraMessages(map);
  return delay(msg, 400);
}

// ─── API پنل ادمین ─────────────────────────────────────────────────────

/** تنظیمات فعلی برنامه — برای فرم ادمین */
export async function getAdminAffiliateSettings(): Promise<AffiliateSettings> {
  return delay(readSettings(), 200);
}

/** ذخیره تنظیمات — فقط قراردادهای جدید را تحت تاثیر قرار می‌دهد (snapshot) */
export async function updateAdminAffiliateSettings(s: AffiliateSettings): Promise<{ ok: true }> {
  writeSettings({
    level1Percent: Math.min(90, Math.max(1, Math.round(s.level1Percent))),
    level2Percent: Math.min(50, Math.max(0, Math.round(s.level2Percent))),
    commissionYears: Math.min(10, Math.max(1, Math.round(s.commissionYears))),
    commissionOnPackage: s.commissionOnPackage,
    commissionOnWalletCharge: s.commissionOnWalletCharge,
  });
  return delay({ ok: true }, 500);
}

/** لیست بازاریاب‌ها — با دعوت‌شده‌ها، پرداخت‌ها و کیف پول آنها */
export async function getAdminAffiliates(): Promise<AdminAffiliateRow[]> {
  const state = readAffiliateState();
  const myRole: AffiliateRole = state?.role ?? 'marketer';
  const myE = myEarnings(myRole);
  const me: AdminAffiliateRow = {
    id: AFFILIATE_DEMO_USER_ID,
    name: 'سامی جابر',
    phone: '09962253970',
    role: myRole,
    referralCode: AFFILIATE_USER_CODE,
    inviteeCount: DEMO_INVITEES.length,
    salesTotal: myE.filter((e) => e.approved).reduce((s, e) => s + e.paymentAmount, 0),
    walletBalance: myE.filter((e) => e.approved).reduce((s, e) => s + e.amount, 0),
    active: true,
    isCurrentUser: true,
    invitees: DEMO_INVITEES,
    earnings: myE,
  };
  const roles = readRoles();
  const rows = [me, ...OTHER_AFFILIATES.map(({ row, invitees, earnings }) => ({ ...row, invitees, earnings }))];
  return delay(rows.map((r) => (r.id in roles ? { ...r, role: roles[r.id] } : r)), 350);
}

/** تغییر نقش بازاریاب توسط ادمین (ارتقا به مدیر / بازگشت به بازاریاب) */
export async function setAdminAffiliateRole(userId: number, role: AffiliateRole): Promise<{ ok: true }> {
  const roles = readRoles();
  roles[userId] = role;
  writeRoles(roles);
  if (userId === AFFILIATE_DEMO_USER_ID) {
    const state = readAffiliateState();
    if (state) writeAffiliateState({ ...state, role });
  }
  return delay({ ok: true }, 400);
}

/** فید پرداخت‌های اخیر مشتریان — چه کسی بابت چه چیزی پرداخت کرده */
export async function getAdminPayments(): Promise<AdminPaymentRow[]> {
  const state = readAffiliateState();
  const myRole: AffiliateRole = state?.role ?? 'marketer';
  const rows: AdminPaymentRow[] = [
    {
      id: 9401, payerName: 'رضا محمدی', marketerName: 'سامی جابر', source: 'package', sourceTitle: 'بسته ویژه — یک‌ماهه',
      amount: 690_000, approved: true, commissionAmount: 345_000, createdAt: '2026-11-03 18:02',
    },
    {
      id: 9402, payerName: 'نرگس عباسی', marketerName: 'زهرا موسوی', managerName: 'سامی جابر', source: 'package', sourceTitle: 'بسته ویژه — یک‌ماهه',
      amount: 690_000, approved: true, commissionAmount: 345_000, managerCut: 69_000, createdAt: '2026-11-09 11:28',
    },
    {
      id: 9403, payerName: 'علی رضایی', marketerName: 'سامی جابر', source: 'wallet', sourceTitle: 'شارژ کیف پول',
      amount: 500_000, approved: true, commissionAmount: 0, createdAt: '2026-11-08 16:47',
    },
    {
      id: 9404, payerName: 'کامران نجفی', marketerName: 'حسن کریمی', managerName: 'سامی جابر', source: 'package', sourceTitle: 'بسته عادی — یک‌ماهه',
      amount: 290_000, approved: false, commissionAmount: 145_000, managerCut: 29_000, createdAt: '2026-11-14 20:10',
    },
    {
      id: 9405, payerName: 'فاطمه کریمی', marketerName: 'سامی جابر', source: 'package', sourceTitle: 'بسته عادی — یک‌ماهه',
      amount: 290_000, approved: false, commissionAmount: 145_000, createdAt: '2026-11-15 09:41',
    },
    {
      id: 9406, payerName: 'پروین اسدی', marketerName: 'مهدی احمدی', source: 'package', sourceTitle: 'بسته ویژه — یک‌ماهه',
      amount: 690_000, approved: true, commissionAmount: 345_000, createdAt: '2026-10-22 13:14',
    },
  ];
  // سطح ۲ فقط وقتی معنا دارد که کاربر جاری مدیر باشد
  if (myRole !== 'manager') {
    return delay(rows.map((r) => (r.managerName === 'سامی جابر' ? { ...r, managerName: undefined, managerCut: undefined } : r)), 350);
  }
  return delay(rows.map((p) => ({ ...p })), 350);
}

/** ارسال پیام ادمین به یک بازاریاب */
export async function adminSendAffiliateMessage(userId: number, body: string): Promise<AffiliateMessage> {
  const msg: AffiliateMessage = { id: Date.now(), fromAdmin: true, body: body.trim(), createdAt: nowFa() };
  const map = readExtraMessages();
  map[userId] = [...(map[userId] ?? []), msg];
  writeExtraMessages(map);
  return delay(msg, 400);
}

/** پیام‌های یک بازاریاب برای دیالوگ ادمین */
export async function getAdminAffiliateMessages(userId: number): Promise<AffiliateMessage[]> {
  const base = userId === AFFILIATE_DEMO_USER_ID ? DEMO_MESSAGES : [];
  const extras = readExtraMessages()[userId] ?? [];
  const all = [...base, ...extras];
  all.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return delay(all.map((m) => ({ ...m })), 200);
}

// تایپ‌های بدون استفاده حذف شدند — این فایل صرفاً تایپ + دیتا + API افلیت است.
