/**
 * کلاینت API پنل ادمین — کاملاً جدا از کلاینت کاربران (lib/api/client):
 *  • توکن جدا در `imach:admin-token` (JWT ادمین با scope='admin' — ۱۲ ساعت)
 *  • همه مسیرها زیر /admin/* بک‌اند
 *  • 401 → توکن پاک و خطا با کد ADMIN_AUTH_* — پوسته به /admin/login می‌برد
 *
 * پنل ادمین SEO ندارد — همه درخواست‌ها client-side و no-store هستند.
 */

import { ApiError } from '@/lib/api/client';

const ADMIN_TOKEN_KEY = 'imach:admin-token';

export interface AdminProfile {
  id: string;
  username: string;
  name: string;
  role: string; // SUPER_ADMIN | ADMIN
  lastLoginAt: string | null;
}

export interface AdminStats {
  users: { total: number; sellers: number; verified: number };
  products: { total: number; pending: number; confirmed: number; rejected: number };
  buyRequests: number;
  chatThreads: number;
  wallet: { totalBalance: number };
  queues: { pendingVerifications: number; pendingCharges: number; ladderOrders: number };
}

// ─── توکن ────────────────────────────────────────────────────────────────────

function isServer(): boolean {
  return typeof window === 'undefined';
}

export function getAdminToken(): string | null {
  if (isServer()) return null;
  try {
    return localStorage.getItem(ADMIN_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAdminToken(token: string): void {
  if (isServer()) return;
  try {
    localStorage.setItem(ADMIN_TOKEN_KEY, token);
  } catch {
    /* حافظه پر است — فقط نشست جاری */
  }
}

export function clearAdminToken(): void {
  if (isServer()) return;
  try {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
  } catch {
    /* noop */
  }
}

// ─── فراخوانی ────────────────────────────────────────────────────────────────

function apiBase(): string {
  return isServer()
    ? `${process.env.BACKEND_URL ?? 'http://localhost:4000'}/api/v1`
    : '/api';
}

export async function adminFetch<T>(path: string, body?: unknown, opts: { auth?: boolean } = {}): Promise<T> {
  const needAuth = opts.auth !== false;
  const token = getAdminToken();

  const res = await fetch(`${apiBase()}${path.startsWith('/') ? path : `/${path}`}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(needAuth && token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body ?? {}),
    cache: 'no-store',
  });

  const json = (await res.json().catch(() => null)) as
    | { status: true; data: T; message?: string }
    | { status: false; message: string; code?: string }
    | null;

  if (!json) throw new ApiError('ارتباط با سرور برقرار نشد.', res.status, 'NETWORK');
  if (json.status === false) {
    // نشست ادمین تمام شده — توکن خراب فوراً پاک شود
    if (res.status === 401) clearAdminToken();
    throw new ApiError(json.message, res.status, json.code);
  }
  return json.data;
}

// ─── API ─────────────────────────────────────────────────────────────────────

/** ورود مدیریت — نام کاربری + رمز → پروفایل ادمین (توکن ذخیره می‌شود) */
export async function adminLogin(username: string, password: string): Promise<AdminProfile> {
  const data = await adminFetch<{ token: string; admin: AdminProfile }>(
    '/admin/auth/login',
    { username, password },
    { auth: false },
  );
  setAdminToken(data.token);
  return data.admin;
}

/** خروج — توکن stateless؛ ابطال سمت کلاینت (فراخوانی best-effort) */
export async function adminLogout(): Promise<void> {
  try {
    await adminFetch('/admin/auth/logout', {});
  } catch {
    /* حتی با خطا، توکن محلی پاک می‌شود */
  }
  clearAdminToken();
}

/** ادمین جاری — null یعنی لاگین نیست */
export async function fetchAdminMe(): Promise<AdminProfile | null> {
  if (!getAdminToken()) return null;
  try {
    return await adminFetch<AdminProfile>('/admin/auth/me', {});
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) return null;
    throw err;
  }
}

/** تغییر رمز خودم (با رمز فعلی) */
export async function adminChangePassword(currentPassword: string, newPassword: string): Promise<void> {
  await adminFetch('/admin/auth/changePassword', { currentPassword, newPassword });
}

/** آمار داشبورد */
export async function fetchAdminStats(): Promise<AdminStats> {
  return adminFetch<AdminStats>('/admin/dashboard/getStats', {});
}
