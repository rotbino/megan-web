/**
 * لاگ ورودی‌های جستجو — ذخیره‌سازی فایل-محورِ ساده (JSON در .data/).
 *
 * هدف سئو: هر صفحه جستجوی ایندکس‌پذیر (/product-list/search/{q}) یک شمارنده
 * ورودی می‌گیرد؛ صفحه «ورودی‌های گوگل» (/searches) نشان می‌دهد از هر لینکِ
 * ثبت‌شده در گوگل چند کاربر به ایمچ آمده است.
 *
 * نکته استقرار: در محیط سرور-مانند (next start روی VPS) کافی است؛
 * برای سرورلس (Vercel) بعداً به جدول دیتابیس/بک‌اند منتقل شود.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { GOOGLE_ENTRY_QS } from './popular-searches';

export interface SearchLogEntry {
  q: string;
  /** تعداد دفعات جستجو — seedها از صفر شروع می‌شوند (شمارش واقعی کاربران) */
  count: number;
  /** آخرین رویداد به میلی‌ثانیه — 0 یعنی هنوز رویدادی ثبت نشده */
  lastAt: number;
}

const DATA_DIR = path.join(process.cwd(), '.data');
const FILE = path.join(DATA_DIR, 'search-log.json');

/** سقف ورودی‌های لاگ — seedها هرگز حذف نمی‌شوند */
const MAX_ENTRIES = 1000;
const MAX_Q_LEN = 80;

/** نرمال‌سازی عبارت — حروف عربی→فارسی، فاصله‌های تکراری، سقف طول */
export function normalizeQuery(raw: string): string {
  return raw
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_Q_LEN);
}

function isEntry(x: unknown): x is SearchLogEntry {
  if (typeof x !== 'object' || x === null) return false;
  const e = x as Record<string, unknown>;
  return typeof e.q === 'string' && typeof e.count === 'number' && typeof e.lastAt === 'number';
}

/** فقط ورودی‌های فایل — seedها جداگانه ادغام می‌شوند */
async function readFileEntries(): Promise<SearchLogEntry[]> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(FILE, 'utf8'));
    if (Array.isArray(parsed)) return parsed.filter(isEntry);
  } catch {
    /* فایل نیست/خراب → خالی */
  }
  return [];
}

/** ادغام seed + فایل — شمارش‌ها و زمان‌ها از فایل می‌آیند */
export async function readSearchLog(): Promise<SearchLogEntry[]> {
  const file = await readFileEntries();
  const map = new Map<string, SearchLogEntry>();
  for (const q of GOOGLE_ENTRY_QS) map.set(q, { q, count: 0, lastAt: 0 });
  for (const e of file) map.set(e.q, { ...e }); // فایل بر seed مقدم است
  return [...map.values()];
}

/** ثبت یک جستجو — upsert شمارنده + آخرین زمان؛ خروجی وضعیت تازه لاگ */
export async function recordSearch(rawQ: string): Promise<SearchLogEntry[]> {
  const q = normalizeQuery(rawQ);
  if (!q) return readSearchLog();

  const entries = await readSearchLog();
  const existing = entries.find((e) => e.q === q);
  const now = Date.now();
  if (existing) {
    existing.count += 1;
    existing.lastAt = now;
  } else {
    entries.push({ q, count: 1, lastAt: now });
  }
  await writeLog(capEntries(entries));
  return entries;
}

/** حذف قدیمی‌ترین ورودی‌های غیر seed وقتی از سقف عبور کرد */
function capEntries(entries: SearchLogEntry[]): SearchLogEntry[] {
  if (entries.length <= MAX_ENTRIES) return entries;
  const seeds = new Set<string>(GOOGLE_ENTRY_QS);
  const overflow = entries
    .filter((e) => !seeds.has(e.q))
    .sort((a, b) => a.lastAt - b.lastAt);
  const remove = new Set(overflow.slice(0, entries.length - MAX_ENTRIES).map((e) => e.q));
  return entries.filter((e) => !remove.has(e.q));
}

/** نوشتن اتمی — tmp + rename تا خواندن همزمان فایل نیمه‌نوشته نبینیم */
async function writeLog(entries: SearchLogEntry[]): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(entries), 'utf8');
    await fs.rename(tmp, FILE);
  } catch {
    // بدون دسترسی نوشتن → بی‌صدا رد؛ صفحه جستجوها seedها را نشان می‌دهد
  }
}

// ─── جدول دوم: ورودی‌های واقعی گوگل (به تفکیک تاریخ) ────────────────────────
//
// خواستهٔ مالک: «اگر تونستی مکانیزمی برای ورود از گوگل پیدا کنی با هر ورود
// از گوگل اون عبارت رو مقدارش رو یکی بالا ببر … و حتی اگر تونستی به تفکیک
// تاریخ هم ثبت کن توی یه جدول دیگه. ولی … اون جدول دومی باید بر اساس
// واقعیت باشه که بفهمیم واقعا از گوگل چقدر ورودی داریم.»
//
// این جدول فقط دادهٔ واقعی دارد (بدون بذر/برندینگ) و از شمارندهٔ جستجوی
// داخلی جدا است: هر ورودی با رفرر گوگل به صفحه جستجو +۱ می‌خورد — هم در
// مجموع کل و هم در ستون همان روز (تاریخ محلی).

export interface GoogleLogEntry {
  q: string;
  /** مجموع ورودی‌های واقعی از گوگل */
  total: number;
  firstAt: number;
  lastAt: number;
  /** شمارش روزانه — کلید 'YYYY-MM-DD' به وقت محلی سرور */
  days: Record<string, number>;
}

const GOOGLE_FILE = path.join(DATA_DIR, 'google-log.json');

/** امروز به وقت محلی — 'YYYY-MM-DD' */
function localDay(ts = Date.now()): string {
  const d = new Date(ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function isGoogleEntry(x: unknown): x is GoogleLogEntry {
  if (typeof x !== 'object' || x === null) return false;
  const e = x as Record<string, unknown>;
  return (
    typeof e.q === 'string' &&
    typeof e.total === 'number' &&
    typeof e.firstAt === 'number' &&
    typeof e.lastAt === 'number' &&
    typeof e.days === 'object' &&
    e.days !== null
  );
}

/** خواندن جدول واقعی گوگل — خالی در نبود فایل */
export async function readGoogleLog(): Promise<GoogleLogEntry[]> {
  try {
    const parsed: unknown = JSON.parse(await fs.readFile(GOOGLE_FILE, 'utf8'));
    if (Array.isArray(parsed)) return parsed.filter(isGoogleEntry);
  } catch {
    /* فایل نیست/خراب → خالی */
  }
  return [];
}

/**
 * ثبت یک ورودی واقعی از گوگل — +۱ روی مجموع و روی همان روز.
 * هم‌زمان نوشتن اتمی؛ خطا هیچ اثری روی ریکوئست ندارد.
 */
export async function recordGoogleEntry(rawQ: string): Promise<void> {
  const q = normalizeQuery(rawQ);
  if (!q) return;
  try {
    const entries = await readGoogleLog();
    const now = Date.now();
    const day = localDay(now);
    const existing = entries.find((e) => e.q === q);
    if (existing) {
      existing.total += 1;
      existing.lastAt = now;
      existing.days[day] = (existing.days[day] ?? 0) + 1;
    } else {
      entries.push({ q, total: 1, firstAt: now, lastAt: now, days: { [day]: 1 } });
    }
    await fs.mkdir(DATA_DIR, { recursive: true });
    const tmp = `${GOOGLE_FILE}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(entries), 'utf8');
    await fs.rename(tmp, GOOGLE_FILE);
  } catch {
    // بدون دسترسی نوشتن → بی‌صدا رد
  }
}
