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

// ─── فاز A2 — اطلاعات پایه ───────────────────────────────────────────────────

/** نود درخت دسته (ادمین) — عین AdminCategoryNode بک‌اند */
export interface AdminCategoryNode {
  id: number;
  categoryName: string;
  slug: string;
  kind: string; // CATEGORY | PRODUCT_TYPE
  unit: string;
  min: number;
  example: string | null;
  parentId: number | null;
  parentName: string | null;
  score: number;
  childCount: number;
  productCount: number;
  requestCount: number;
  children: AdminCategoryNode[];
}

export interface AdminCategoryInput {
  id?: number;
  categoryName: string;
  parentId?: number | null;
  unit?: string;
  min?: number;
  example?: string;
  score?: number;
}

/** استان/شهر (ادمین) — id = buskolId عددی */
export interface AdminProvince {
  id: number;
  name: string;
  enName: string | null;
  isActive: boolean;
  cityCount: number;
}

export interface AdminCity {
  id: number;
  name: string;
  enName: string | null;
  isActive: boolean;
  provinceId: number;
  userCount: number;
  productCount: number;
}

export interface AdminLocationInput {
  buskolId?: number;
  type: 'province' | 'city';
  name: string;
  enName?: string;
  parentId?: number; // برای شهر: buskolId استان
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

// ─── فاز A2 — اطلاعات پایه ───────────────────────────────────────────────────

/** درخت دسته‌ها با شمارش فرزند/آگهی/درخواست */
export async function fetchAdminCategoryTree(): Promise<AdminCategoryNode[]> {
  return adminFetch<AdminCategoryNode[]>('/admin/base-data/getCategoryTree', {});
}

/** ایجاد/ویرایش دسته */
export async function upsertCategory(input: AdminCategoryInput): Promise<AdminCategoryNode> {
  return adminFetch<AdminCategoryNode>('/admin/base-data/upsertCategory', input as unknown as Record<string, unknown>);
}

/** حذف دسته — فقط بدون فرزند و بدون ارجاع */
export async function deleteAdminCategory(id: number): Promise<{ id: number; deleted: boolean }> {
  return adminFetch<{ id: number; deleted: boolean }>('/admin/base-data/deleteCategory', { id });
}

/** استان‌ها + شهرها (provinceId داده شود فقط آن استان) */
export async function fetchAdminLocations(provinceId?: number): Promise<{ provinces: AdminProvince[]; cities: AdminCity[] }> {
  return adminFetch<{ provinces: AdminProvince[]; cities: AdminCity[] }>('/admin/base-data/getLocations', {
    ...(provinceId != null ? { provinceId } : {}),
  });
}

/** ایجاد/ویرایش استان یا شهر */
export async function upsertLocation(input: AdminLocationInput): Promise<{ id: number; type: string; name: string; isActive: boolean }> {
  return adminFetch('/admin/base-data/upsertLocation', input as unknown as Record<string, unknown>);
}

/** فعال/غیرفعال کردن مکان */
export async function setLocationActive(buskolId: number, type: 'province' | 'city', active: boolean): Promise<{ id: number; isActive: boolean }> {
  return adminFetch('/admin/base-data/setLocationActive', { buskolId, type, active });
}

// ─── فاز A3 — مدیریت کاربران ─────────────────────────────────────────────────

/** ردیف جدول کاربران (ادمین) — عین AdminUserRow بک‌اند */
export interface AdminUserRow {
  id: string;
  phone: string;
  user_name: string;
  first_name: string;
  last_name: string;
  sex: string | null;
  role: string;
  is_verified: boolean;
  is_buyer: boolean;
  is_seller: boolean;
  is_active: boolean;
  has_password: boolean;
  wallet_balance: number;
  province_id: number | null;
  city_id: number | null;
  product_count: number;
  request_count: number;
  verification: 'pending' | 'verified' | 'none';
  last_login_at: string | null;
  created_at: string;
}

export interface AdminUserList {
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
  items: AdminUserRow[];
}

export interface AdminUserListFilters {
  search?: string;
  role?: 'USER' | 'ADMIN';
  active?: boolean;
  verified?: boolean;
  seller?: boolean;
  page?: number;
  perPage?: number;
}

/** تراکنش کیف پول در جزئیات کاربر */
export interface AdminWalletTx {
  id: string;
  title: string;
  amount: number;
  incoming: boolean;
  pendingAdmin: boolean;
  at: string;
}

/** مدرک احراز در جزئیات کاربر */
export interface AdminVerificationDoc {
  id: string;
  fieldKey: string;
  url: string;
  thumbUrl: string | null;
  createdAt: string;
}

export interface AdminUserDetail {
  user: {
    id: string;
    phone: string;
    user_name: string;
    first_name: string;
    last_name: string;
    sex: string | null;
    role: string;
    is_verified: boolean;
    is_buyer: boolean;
    is_seller: boolean;
    is_active: boolean;
    has_password: boolean;
    wallet_balance: number;
    avatar_url: string | null;
    business_desc: string | null;
    province_id: number | null;
    city_id: number | null;
    province: string | null;
    city: string | null;
    profile: Record<string, unknown>;
    last_login_at: string | null;
    created_at: string;
  };
  stats: {
    products: { confirmed: number; pending: number; rejected: number; deleted: number };
    buy_requests: number;
    charges: { pending: number; approved: number; rejected: number };
    ladder_orders: number;
  };
  products: Array<{
    id: number;
    productName: string;
    status: string;
    stock: number;
    minSaleAmount: number;
    minSalePrice: number;
    unit: string;
    viewCount: number;
    isLadder: boolean;
    updatedAt: string;
  }>;
  transactions: AdminWalletTx[];
  verification: {
    orderId?: string | null;
    status: string;
    submittedAt?: string;
    reviewedAt?: string | null;
    rejectionReason?: string | null;
    docs: Partial<Record<'nationalCard' | 'selfie', AdminVerificationDoc | null>>;
  };
}

/** لیست کاربران — جستجو/فیلتر/صفحه‌بندی */
export async function fetchAdminUsers(filters: AdminUserListFilters = {}): Promise<AdminUserList> {
  return adminFetch<AdminUserList>('/admin/users/getUserList', filters as unknown as Record<string, unknown>);
}

/** جزئیات کامل کاربر */
export async function fetchAdminUserDetail(id: string): Promise<AdminUserDetail> {
  return adminFetch<AdminUserDetail>('/admin/users/getUserDetail', { id });
}

/** فعال/غیرفعال — غیرفعال: ورود مسدود + نشست‌ها باطل + محتوا پنهان */
export async function setAdminUserActive(id: string, active: boolean): Promise<{ id: string; is_active: boolean }> {
  return adminFetch('/admin/users/setUserActive', { id, active });
}

/** نقش خریدار/فروشنده */
export async function setAdminUserRoles(id: string, input: { isBuyer?: boolean; isSeller?: boolean }): Promise<{ id: string; is_buyer: boolean; is_seller: boolean }> {
  return adminFetch('/admin/users/setUserRoles', { id, ...input });
}

/** شارژ/کسر دستی کیف پول با دلیل */
export async function creditAdminUserWallet(id: string, amount: number, reason: string): Promise<{ id: string; balance: number }> {
  return adminFetch('/admin/users/creditWallet', { id, amount, reason });
}

/** بازبینی مدارک احراز — تأیید/رد با دلیل */
export async function reviewAdminVerification(orderId: string, approve: boolean, rejectionReason?: string): Promise<{ id: string; status: string }> {
  return adminFetch('/admin/users/reviewVerification', {
    orderId,
    approve,
    ...(approve ? {} : { rejectionReason }),
  });
}
