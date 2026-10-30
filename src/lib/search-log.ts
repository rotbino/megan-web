/**
 * لاگ جستجوهای کاربران — ذخیره‌سازی فایل-محورِ ساده (JSON در .data/).
 *
 * هدف سئو: هر جستجوی واقعی کاربر یک شمارنده می‌گیرد؛ صفحه «جستجوهای
 * کاربران» (/searches) پربازدیدترین‌ها و آخرین‌ها را به‌صورت لینک به
 * صفحات جستجوی ایندکس‌پذیر (/product-list/search/{q}) رندر می‌کند تا
 * موتورهای جستجو به جستجوهای انجام‌شده دسترسی داشته باشند.
 *
 * نکته استقرار: در محیط سرور-مانند (next start روی VPS) کافی است؛
 * برای سرورلس (Vercel) بعداً به جدول دیتابیس/بک‌اند منتقل شود.
 */
import { promises as fs } from 'fs';
import path from 'path';
import { POPULAR_SEARCHES } from './popular-searches';

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
  for (const q of POPULAR_SEARCHES) map.set(q, { q, count: 0, lastAt: 0 });
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
  const seeds = new Set<string>(POPULAR_SEARCHES);
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
