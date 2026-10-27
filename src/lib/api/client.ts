/**
 * کلاینت API مرکزی ایمچ — همه فراخوانی‌های بک‌اند از همین‌جا می‌گذرند.
 *
 * قرارداد: POST JSON به `/api/{path}` (پروکسی نکست → بک‌اند NestJS :4000/api/v1).
 * پاسخ بک: { status: true, data, message? } | { status: false, message, code? }
 * این کلاینت `data` را بیرون می‌کشد و در خطا ApiError با پیام فارسی می‌دهد.
 *
 * توکن‌ها در localStorage؛ رفرش خودکار تک‌پرواز (single-flight) در 401.
 * سمت سرور (SSR): توکن نیست → فقط اندپوینت‌های عمومی؛ آدرس مستقیم بک.
 */

const TOKEN_KEY = 'imach:tokens';

export interface Tokens {
  accessToken: string;
  refreshToken: string;
}

export class ApiError extends Error {
  /** کد ماشینی پایدار برای منطق فرانت (OTP_WRONG، AUTH_REQUIRED، …) */
  code?: string;
  status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
  }
}

function isServer(): boolean {
  return typeof window === 'undefined';
}

/** آدرس پایه — کلاینت از پروکسی هم‌مبدأ، سرور مستقیم به بک */
export function apiBase(): string {
  return isServer()
    ? `${process.env.BACKEND_URL ?? 'http://localhost:4000'}/api/v1`
    : '/api';
}

// ─── توکن‌ها ──────────────────────────────────────────────────────────────────

export function getTokens(): Tokens | null {
  if (isServer()) return null;
  try {
    const raw = localStorage.getItem(TOKEN_KEY);
    return raw ? (JSON.parse(raw) as Tokens) : null;
  } catch {
    return null;
  }
}

export function setTokens(tokens: Tokens): void {
  if (isServer()) return;
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify(tokens));
  } catch {
    /* حافظه پر است — فقط در نشست جاری */
  }
}

export function clearTokens(): void {
  if (isServer()) return;
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* noop */
  }
}

// ─── رفرش تک‌پرواز ────────────────────────────────────────────────────────────

let refreshInFlight: Promise<boolean> | null = null;

/** تمدید توکن‌ها با رفرش‌توکن چرخشی — فقط یک بار هم‌زمان */
export async function tryRefreshTokens(): Promise<boolean> {
  if (isServer()) return false;
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const tokens = getTokens();
    if (!tokens?.refreshToken) return false;
    try {
      const res = await fetch(`${apiBase()}/auth/refreshToken`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: tokens.refreshToken }),
      });
      const json = (await res.json()) as {
        status: boolean;
        data?: { accessToken: string; refreshToken: string };
      };
      if (json.status && json.data) {
        setTokens(json.data);
        return true;
      }
      clearTokens();
      return false;
    } catch {
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

// ─── فراخوانی اصلی ────────────────────────────────────────────────────────────

export interface ApiFetchOptions {
  /** false → بدون هدر توکن (عمومی) */
  auth?: boolean;
  /** 401 → یک‌بار رفرش و تکرار (پیش‌فرض روشن) */
  retryOn401?: boolean;
}

/** الحاق مسیر بدون اسلش تکراری — apiBase بدون / پایان می‌یابد، path ممکن است با / شروع شود */
export function joinUrl(base: string, path: string): string {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export async function apiFetch<T>(path: string, body?: unknown, opts: ApiFetchOptions = {}): Promise<T> {
  const needAuth = opts.auth !== false;
  const tokens = getTokens();

  const res = await fetch(joinUrl(apiBase(), path), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(needAuth && tokens?.accessToken ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });

  // 401 → رفرش تک‌پرواز + یک تکرار
  if (res.status === 401 && needAuth && opts.retryOn401 !== false && tokens) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) return apiFetch<T>(path, body, { ...opts, retryOn401: false });
  }

  const json = (await res.json().catch(() => null)) as
    | { status: true; data: T; message?: string }
    | { status: false; message: string; code?: string }
    | null;

  if (!json) {
    throw new ApiError('ارتباط با سرور برقرار نشد.', res.status, 'NETWORK');
  }
  if (json.status === false) {
    throw new ApiError(json.message, res.status, json.code);
  }
  return json.data;
}

// ─── SSR/ISR — فقط Server Components صفحات عمومی ────────────────────────────

/**
 * POST با کش دادهٔ نکست (revalidate) — برای SSR/ISR صفحات عمومی سئو.
 * تفاوت با apiFetch: بدون توکن (عمومی)، بدون no-store، کش‌شده تا revalidate ثانیه.
 * فراخوانی از کلاینت ممنوع — فقط در Server Components/پیش‌رندر.
 */
export async function serverPost<T>(
  path: string,
  body: unknown,
  revalidateSec: number,
): Promise<T> {
  const res = await fetch(joinUrl(apiBase(), path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    next: { revalidate: revalidateSec },
  });

  const json = (await res.json().catch(() => null)) as
    | { status: true; data: T; message?: string }
    | { status: false; message: string; code?: string }
    | null;

  if (!json) throw new ApiError('ارتباط با سرور برقرار نشد.', res.status, 'NETWORK');
  if (json.status === false) throw new ApiError(json.message, res.status, json.code);
  return json.data;
}

// ─── آپلود فایل (multipart) ──────────────────────────────────────────────────

export interface UploadedFile {
  id: string;
  fieldKey: string;
  url: string;
  thumbUrl: string | null;
  description: string | null;
  size: number;
  mimeType: string;
  createdAt: string;
}

/** آپلود تصویر — عین قرارداد بک‌اند uploads/uploadImage (با رفرش 401 مثل apiFetch) */
export async function uploadImage(
  file: File | Blob,
  params: {
    model: 'User' | 'Product';
    modelId?: string | number | null;
    key: string;
    description?: string | null;
    replace?: boolean;
  },
  opts: { retryOn401?: boolean } = {},
): Promise<UploadedFile> {
  const tokens = getTokens();
  if (!tokens?.accessToken) {
    throw new ApiError('برای آپلود ابتدا وارد حساب خود شوید.', 401, 'AUTH_REQUIRED');
  }

  const query = new URLSearchParams({
    model: params.model,
    key: params.key,
    ...(params.modelId != null ? { modelId: String(params.modelId) } : {}),
    ...(params.description ? { description: params.description } : {}),
    ...(params.replace !== undefined ? { replace: String(params.replace) } : {}),
  });

  const form = new FormData();
  form.append('file', file);

  const res = await fetch(`${apiBase()}/uploads/uploadImage?${query.toString()}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokens.accessToken}` },
    body: form,
  });

  // 401 → رفرش تک‌پرواز + یک تکرار (فرم طولانی ممکن است توکن را کهنه کند)
  if (res.status === 401 && opts.retryOn401 !== false) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) return uploadImage(file, params, { retryOn401: false });
  }

  const json = (await res.json().catch(() => null)) as
    | { status: true; data: UploadedFile; message?: string }
    | { status: false; message: string; code?: string }
    | null;

  if (!json) throw new ApiError('آپلود ناموفق بود.', res.status, 'NETWORK');
  if (json.status === false) throw new ApiError(json.message, res.status, json.code);
  return json.data;
}

/** حذف فایل (بایت + ردیف) — مالک یا ادمین */
export async function deleteImage(fileId: string): Promise<void> {
  await apiFetch('/uploads/deleteImage', { fileId }, { auth: true });
}
