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

/** تراکنش کیف پول در جزئیات کاربر — فقط اقلام قطعی‌شده (در انتظار/ردشده در صف شارژها دیده می‌شوند) */
export interface AdminWalletTx {
  id: string;
  title: string;
  amount: number;
  incoming: boolean;
  /** card = شارژ کارت‌به‌کارت تأییدشده؛ ladder = نردبان؛ adjust = اصلاح ادمین */
  type: 'card' | 'ladder' | 'adjust';
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

// ─── پیام مستقیم ادمین → کاربر («پشتیبانی ایمچ») ───────────────────────────

/** ردیف تاریخچه پیام‌های پشتیبانی یک کاربر — snake_case عین بک‌اند */
export interface AdminDirectMessageRow {
  id: string;
  user_id: string;
  admin_username: string;
  text: string;
  read_at: string | null;
  created_at: string;
}

export interface AdminUserMessagesList {
  total: number;
  unread: number;
  page: number;
  perPage: number;
  pageCount: number;
  items: AdminDirectMessageRow[];
}

/** مخاطب ارسال انبوه — همان فیلترهای لیست کاربران */
export type AdminBroadcastAudience = 'all' | 'active' | 'sellers' | 'buyers' | 'verified';

/** ارسال پیام به یک کاربر (ردیف لیست / صفحه جزئیات) */
export async function adminSendUserMessage(userId: string, text: string): Promise<{ sent: number }> {
  return adminFetch('/admin/messages/sendToUser', { userId, text });
}

/** ارسال پیام به چند کاربر انتخابی (چک‌باکس‌های لیست) */
export async function adminSendUsersMessage(userIds: string[], text: string): Promise<{ sent: number; skipped: number }> {
  return adminFetch('/admin/messages/sendToUsers', { userIds, text });
}

/** ارسال پیام به همه کاربران — با مخاطب اختیاری */
export async function adminSendAllUsersMessage(
  text: string,
  audience: AdminBroadcastAudience = 'all',
): Promise<{ sent: number; audience: string }> {
  return adminFetch('/admin/messages/sendToAll', { text, audience });
}

/** تاریخچه پیام‌های پشتیبانی یک کاربر — تب «پیام‌ها» صفحه جزئیات */
export async function fetchAdminUserMessages(id: string, page = 1, perPage = 20): Promise<AdminUserMessagesList> {
  return adminFetch('/admin/messages/getUserMessages', { userId: id, page, perPage });
}

// ─── فاز A4 — مدیریت آگهی‌ها و درخواست‌های خرید ───────────────────────────────

/** وضعیت آگهی/درخواست — تب‌های ادمین (عین پنل کاربر) */
export type AdminItemStatus = 'pending' | 'confirmed' | 'rejected' | 'deleted';

/** ردیف جدول آگهی‌ها (ادمین) — عین AdminProductRow بک‌اند */
export interface AdminProductRow {
  id: number;
  product_name: string;
  status: AdminItemStatus;
  category_name: string;
  sub_category_name: string;
  province_name: string;
  city_name: string;
  seller: { id: string; user_name: string; full_name?: string; phone: string; is_verified: boolean };
  stock: number;
  min_sale_amount: number;
  min_sale_price: number;
  unit: string;
  is_ladder: boolean;
  ladder_expires_at: string | null;
  view_count: number;
  photo: string | null;
  rejection_reasons: string[];
  created_at: string;
  updated_at: string;
}

export interface AdminProductList {
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
  counts: Record<'pending' | 'confirmed' | 'rejected' | 'deleted' | 'all', number>;
  items: AdminProductRow[];
}

export interface AdminProductListFilters {
  search?: string;
  status?: AdminItemStatus;
  categoryId?: number;
  provinceId?: number;
  cityId?: number;
  sellerId?: string;
  ladder?: boolean;
  page?: number;
  perPage?: number;
}

/** سفارش نردبان در جزئیات آگهی — فقط خواندنی */
export interface AdminLadderOrder {
  id: string;
  amount: number;
  starts_at: string;
  expires_at: string;
  created_at: string;
  by_admin_gift: boolean;
}

/** فروشنده در جزئیات آگهی — کامل‌تر از ردیف لیست */
export interface AdminProductSellerDetail {
  id: string;
  user_name: string;
  phone: string;
  is_verified: boolean;
  first_name: string;
  last_name: string;
  is_active: boolean;
  wallet_balance: number;
}

export interface AdminProductDetail extends Omit<AdminProductRow, 'seller'> {
  description: string;
  features: Array<{ key: string; value: string }>;
  photos: string[];
  seller: AdminProductSellerDetail | null;
  ladder_orders: AdminLadderOrder[];
}

/** لیست آگهی‌ها — جستجو/فیلتر/صفحه‌بندی + شمارنده تب‌ها */
export async function fetchAdminProducts(filters: AdminProductListFilters = {}): Promise<AdminProductList> {
  return adminFetch<AdminProductList>('/admin/products/getProductList', filters as unknown as Record<string, unknown>);
}

/** جزئیات کامل آگهی — گالری + فروشنده + سفارش‌های نردبان (فقط خواندنی) */
export async function fetchAdminProductDetail(id: number): Promise<AdminProductDetail> {
  return adminFetch<AdminProductDetail>('/admin/products/getProductDetail', { id });
}

/** بازبینی آگهی در انتظار — تأیید یا رد با دلایل (عین جعبه باسکول) */
export async function reviewAdminProduct(id: number, approve: boolean, rejectionReasons?: string[]): Promise<{ id: number; status: string }> {
  return adminFetch('/admin/products/reviewProduct', {
    id,
    approve,
    ...(approve ? {} : { rejectionReasons }),
  });
}

/** تغییر مستقیم وضعیت — تأیید/رد/حذف نرم (حذف فایل‌ها را هم پاک می‌کند) */
export async function setAdminProductStatus(id: number, status: AdminItemStatus, rejectionReasons?: string[]): Promise<{ id: number; status: string; files_removed: number }> {
  return adminFetch('/admin/products/setProductStatus', {
    id,
    status,
    ...(status === 'rejected' ? { rejectionReasons } : {}),
  });
}

/** حذف نرم آگهی + پاک‌سازی فایل‌های گالری */
export async function deleteAdminProduct(id: number): Promise<{ id: number; status: string; files_removed: number }> {
  return adminFetch('/admin/products/deleteProduct', { id });
}

/** نردبان روشن (هدیه ۳۰ روزه با سفارش مبلغ صفر) / خاموش (برچیدن) */
export async function setAdminLadder(id: number, active: boolean): Promise<{ id: number; is_ladder: boolean; ladder_expires_at: string | null }> {
  return adminFetch('/admin/products/setLadder', { id, active });
}

/** ردیف جدول درخواست‌های خرید (ادمین) — عین AdminBuyRequestRow بک‌اند */
export interface AdminBuyRequestRow {
  id: number;
  name: string;
  description: string | null;
  status: AdminItemStatus;
  category_name: string;
  province_name: string | null;
  city_name: string | null;
  buyer: { id: string; user_name: string; full_name?: string; phone: string; is_verified: boolean };
  requirement_amount: number;
  unit: string;
  goal: string;
  has_history: boolean;
  created_at: string;
  updated_at: string;
}

export interface AdminBuyRequestList {
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
  counts: Record<'pending' | 'confirmed' | 'rejected' | 'deleted' | 'all', number>;
  items: AdminBuyRequestRow[];
}

export interface AdminBuyRequestListFilters {
  search?: string;
  status?: AdminItemStatus;
  categoryId?: number;
  provinceId?: number;
  userId?: string;
  page?: number;
  perPage?: number;
}

/** لیست درخواست‌های خرید — جستجو/فیلتر + شمارنده تب‌ها */
export async function fetchAdminBuyRequests(filters: AdminBuyRequestListFilters = {}): Promise<AdminBuyRequestList> {
  return adminFetch<AdminBuyRequestList>('/admin/buy-requests/getBuyRequestList', filters as unknown as Record<string, unknown>);
}

/** بازبینی درخواست در انتظار — تأیید یا رد با دلیل */
export async function reviewAdminBuyRequest(id: number, approve: boolean, rejectionReason?: string): Promise<{ id: number; status: string }> {
  return adminFetch('/admin/buy-requests/reviewBuyRequest', {
    id,
    approve,
    ...(approve ? {} : { rejectionReason }),
  });
}

/** حذف نرم درخواست خرید */
export async function deleteAdminBuyRequest(id: number): Promise<{ id: number; status: string }> {
  return adminFetch('/admin/buy-requests/deleteBuyRequest', { id });
}

// ─── فاز A5 — داشبورد عملیاتی، لاگ، ادمین‌ها، شارژها ─────────────────────────

/** نقطه روند ۳۰ روزه — هر روز یک نقطه */
export interface AdminTrendPoint {
  date: string; // YYYY-MM-DD (UTC)
  registrations: number;
  products: number;
  buyRequests: number;
  ladderRevenue: number;
  chargeRevenue: number;
}

export interface AdminRecentAction {
  id: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  message?: string | null;
  createdAt: string;
  admin: { id: string; name: string; username: string; role: string };
}

export interface AdminRecentUser {
  id: string;
  phone: string;
  userName: string;
  firstName: string;
  lastName: string;
  isSeller: boolean;
  createdAt: string;
}

/** آمار داشبورد عملیاتی (A5) — کلیدهای A1 حفظ شده‌اند */
export interface AdminStatsV2 extends AdminStats {
  queues: {
    pendingProducts: number;
    pendingBuyRequests: number;
    pendingVerifications: number;
    pendingCharges: number;
    ladderOrders: number;
  };
  revenue: {
    ladderTotal: number;
    chargeTotal: number;
    last30Days: { ladder: number; charge: number };
  };
  trends: AdminTrendPoint[];
  /** چت‌ها (A6) — سنجه‌های روزانه ادمین */
  chats?: {
    threads: number;
    withUnread: number;
    awaitingSellerReply: number;
    messagesTotal: number;
    messagesToday: number;
  };
  /** تماس‌ها (A6) — سنجه‌های روزانه ادمین */
  calls?: {
    total: number;
    today: number;
    last7Days: number;
  };
}

/** getRecentActivity — فید زنده داشبورد */
export async function fetchAdminRecentActivity(): Promise<{ recentActions: AdminRecentAction[]; recentUsers: AdminRecentUser[] }> {
  return adminFetch('/admin/dashboard/getRecentActivity', {});
}

/** آمار داشبورد عملیاتی (روند + درآمد + صف‌ها) */
export async function fetchAdminStatsV2(): Promise<AdminStatsV2> {
  return adminFetch<AdminStatsV2>('/admin/dashboard/getStats', {});
}

// ─── لاگ عملیات ادمین ────────────────────────────────────────────────────────

export interface AdminActionRow {
  id: string;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  payload?: Record<string, unknown> | null;
  message?: string | null;
  createdAt: string;
  admin: { id: string; username: string; name: string; role: string };
}

export interface AdminActionList {
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
  items: AdminActionRow[];
}

export interface AdminActionFilters {
  adminId?: string;
  action?: string;
  targetType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  perPage?: number;
}

/** لاگ عملیات ادمین‌ها — فیلتر ادمین/مسیر/نوع هدف/تاریخ */
export async function fetchAdminActions(filters: AdminActionFilters = {}): Promise<AdminActionList> {
  return adminFetch<AdminActionList>('/admin/actions/getAdminActions', filters as unknown as Record<string, unknown>);
}

// ─── مدیریت ادمین‌ها (SUPER_ADMIN) ───────────────────────────────────────────

export interface AdminRow {
  id: string;
  username: string;
  name: string;
  role: string; // SUPER_ADMIN | ADMIN
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  actionCount: number;
}

export interface AdminList {
  total: number;
  page: number;
  perPage: number;
  pageCount: number;
  items: AdminRow[];
}

export async function fetchAdminAdmins(page = 1, perPage = 20): Promise<AdminList> {
  return adminFetch<AdminList>('/admin/admins/getAdminList', { page, perPage });
}

export async function createAdminAdmin(input: {
  username: string;
  name: string;
  role: 'ADMIN' | 'SUPER_ADMIN';
  password: string;
}): Promise<AdminRow> {
  return adminFetch('/admin/admins/createAdmin', input);
}

export async function setAdminAdminActive(adminId: string, active: boolean): Promise<AdminRow> {
  return adminFetch('/admin/admins/setAdminActive', { adminId, active });
}

export async function resetAdminAdminPassword(adminId: string, newPassword: string): Promise<{ id: string; username: string }> {
  return adminFetch('/admin/admins/resetAdminPassword', { adminId, newPassword });
}

// ─── صف شارژهای کارت‌به‌کارت (A5) ────────────────────────────────────────────

export interface AdminChargeOrderRow {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  packageKey: string;
  amount: number;
  bonusPercent: number;
  charge: number;
  rejectionReason?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
  user: {
    id: string;
    phone: string;
    user_name: string;
    first_name: string;
    last_name: string;
    wallet_balance: number;
  };
  receipt: { id: string; url: string; thumbUrl?: string } | null;
}

export interface AdminChargeOrderList {
  total: number;
  page: number;
  perPage: number;
  items: AdminChargeOrderRow[];
}

export async function fetchAdminChargeOrders(status?: 'pending' | 'approved' | 'rejected', page = 1, perPage = 20): Promise<AdminChargeOrderList> {
  return adminFetch<AdminChargeOrderList>('/admin/wallet/getChargeOrders', { ...(status ? { status } : {}), page, perPage });
}

export async function reviewAdminChargeOrder(orderId: string, approve: boolean, rejectionReason?: string): Promise<{ id: string; status: string; charged?: number }> {
  return adminFetch('/admin/wallet/reviewChargeOrder', {
    orderId,
    approve,
    ...(approve ? {} : { rejectionReason }),
  });
}

// ─── صف احراز هویت (A5 — نمای صف) ───────────────────────────────────────────

export interface AdminVerificationOrderRow {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  reviewedAt?: string | null;
  rejectionReason?: string | null;
  user?: { id: string; phone: string; userName?: string; firstName?: string; lastName?: string };
  docs?: Record<string, { url: string } | undefined>;
}

export async function fetchAdminVerificationOrders(status?: 'pending' | 'approved' | 'rejected', page = 1, perPage = 20): Promise<{ total: number; page: number; items: AdminVerificationOrderRow[] }> {
  return adminFetch('/admin/users/getVerificationOrders', { ...(status ? { status } : {}), page, perPage });
}

// ─── فاز A6 — چت‌های کاربران + گزارش تماس‌ها ─────────────────────────────────

/** طرف مکالمه/تماس (ادمین) — عین UserCard بک‌اند */
export interface AdminUserCard {
  id: string;
  firstName: string;
  lastName: string;
  userName: string;
  phone: string;
  displayName: string;
  isActive: boolean;
  isVerified: boolean;
  lastLoginAt: string | null;
}

/** ردیف مکالمه (ادمین) — عین AdminThreadRow بک‌اند */
export interface AdminChatRow {
  id: string;
  product: { id: number; name: string };
  buyer: AdminUserCard;
  seller: AdminUserCard;
  lastMessage: {
    text: string;
    at: string;
    senderId: string;
    senderRole: 'buyer' | 'seller';
    senderName: string;
    readAt: string | null;
  } | null;
  messageCount: number;
  /** پیام‌هایی که گیرنده واقعی هنوز نخوانده — نمایش ادمین، تغییردهنده نیست */
  unreadCount: number;
  /** آخرین پیام از خریدار است و فروشنده هنوز نخوانده — «زنگ بزنید به فروشنده» */
  awaitingSellerReply: boolean;
  lastMessageAt: string | null;
  createdAt: string;
}

export interface AdminChatList {
  total: number;
  page: number;
  perPage: number;
  items: AdminChatRow[];
}

export interface AdminChatListFilters {
  search?: string;
  filter?: 'all' | 'unread' | 'awaiting';
  page?: number;
  perPage?: number;
}

/** پیام یک مکالمه در نمای ادمین — با نقش خریدار/فروشنده */
export interface AdminChatMessage {
  id: string;
  senderId: string;
  senderRole: 'buyer' | 'seller';
  senderName: string;
  text: string;
  readAt: string | null;
  createdAt: string;
}

export interface AdminChatThreadDetail {
  thread: Omit<AdminChatRow, 'lastMessage'> & {
    product: { id: number; name: string; status: string };
  };
  messages: AdminChatMessage[];
}

export interface AdminChatStats {
  threads: number;
  withUnread: number;
  awaitingSellerReply: number;
  messagesTotal: number;
  messagesToday: number;
}

/** لیست مکالمات کاربران — تازه‌ترین بالا + badge خوانده‌نشده */
export async function fetchAdminChats(filters: AdminChatListFilters = {}): Promise<AdminChatList> {
  return adminFetch<AdminChatList>('/admin/chats/getThreadList', filters as unknown as Record<string, unknown>);
}

/** کل پیام‌های یک مکالمه — فقط خواندنی؛ خوانده‌شده علامت نمی‌خورد */
export async function fetchAdminChatMessages(threadId: string): Promise<AdminChatThreadDetail> {
  return adminFetch<AdminChatThreadDetail>('/admin/chats/getThreadMessages', { threadId });
}

/** آمار چت‌ها */
export async function fetchAdminChatStats(): Promise<AdminChatStats> {
  return adminFetch<AdminChatStats>('/admin/chats/getChatStats', {});
}

// ─── گزارش تماس‌ها ────────────────────────────────────────────────────────────

/** ردیف تماس (ادمین) — عین AdminCallRow بک‌اند */
export interface AdminCallRow {
  id: string;
  caller: AdminUserCard;
  callee: AdminUserCard;
  product: { id: number; name: string } | null;
  source: string;
  createdAt: string;
}

export interface AdminCallStats {
  total: number;
  today: number;
  last7Days: number;
  last30Days: number;
  uniqueCallers: number;
  uniqueCallees: number;
}

export interface AdminCallReport {
  total: number;
  page: number;
  perPage: number;
  items: AdminCallRow[];
  stats: AdminCallStats;
}

export interface AdminCallReportFilters {
  search?: string;
  range?: 'all' | 'today' | 'd7' | 'd30';
  page?: number;
  perPage?: number;
}

/** گزارش تماس‌های کاربران — «کی به کی زنگ زده» + آمار */
export async function fetchAdminCallReport(filters: AdminCallReportFilters = {}): Promise<AdminCallReport> {
  return adminFetch<AdminCallReport>('/admin/calls/getCallReport', filters as unknown as Record<string, unknown>);
}
