/**
 * بک‌اند ماک موقت برای تست مرورگر صفحه قیمت‌ها (پس از تست ببندید).
 * فقط اندپوینت‌های لازم برای /panel/pricing + پوستهٔ پنل را جواب می‌دهد؛
 * بقیه با {status:true,data:{}}.
 *
 * اجرا:  node scripts/mock-backend-pricing.mjs   → http://127.0.0.1:4000
 * سوییچ حالت «دارندهٔ بستهٔ فعال»:
 *   curl -X POST localhost:4000/mock/toggle-active
 */
import http from 'node:http';

const now = () => new Date();
const iso = (msFromNow) => new Date(Date.now() + msFromNow).toISOString();
const ok = (data) => ({ status: true, data });
const fail = (message, code) => ({ status: false, message, code });

// ─── وضعیت تست ─────────────────────────────────────────────────────────────
let activePkg = false; // دارندهٔ بستهٔ فعال؟

// کاربر تست: کریم نجفی (کاربر قدیمی → کمپین مناسبتی می‌بیند)
const USER = {
  id: 'u-karim',
  phone: '09155557788',
  user_name: 'karim',
  first_name: 'کریم',
  last_name: 'نجفی',
  sex: 'male',
  role: 'user',
  has_password: true,
  is_verified: true,
  is_buyer: true,
  is_seller: true,
  wallet_balance: 120_000,
  avatar_url: null,
  business_desc: 'خرید و فروش خشکبار',
  province_id: 1,
  city_id: 1,
  province: 'تهران',
  city: 'تهران',
  product_count: 6,
  created_at: '2026-08-12 09:30:00',
  updated_at: '2026-11-01 10:00:00',
  allow_calls: true,
};

// امکانات ادمین — p2m عمداً ۹ ردیف بدون «تماس روزانه» دارد تا سقف ۷ +
// تضمین ردیف تماس تست شود؛ p6m هفت ردیف با ردیف تماس.
const F = {
  nine: [
    'ثبت تعداد نامحدود محصول',
    'دسترسی نامحدود به همه خریداران',
    'ثبت درخواست خرید نامحدود',
    'درج نشان فروشنده ویژه روی محصولات و پروفایل',
    'نمایش محصولات بالاتر از رقبا',
    'اولویت بررسی و پشتیبانی ویژه',
    'گزارش ماهانهٔ تحلیل بازار',
    'هایلایت آگهی در نتایج جستجو',
    'پیشنهاد قیمت لحظه‌ای خریداران',
  ],
  seven: [
    'ثبت تعداد نامحدود محصول',
    'دسترسی نامحدود به همه خریداران',
    'ثبت درخواست خرید نامحدود',
    'تماس روزانه با تا ۳۰ کاربر ایمچ',
    'درج نشان فروشنده ویژه روی محصولات و پروفایل',
    'نمایش محصولات بالاتر از رقبا',
    'اولویت بررسی و پشتیبانی ویژه',
  ],
};

// کمپین تعدادی — جاری پلهٔ دوم (۳۰٪)، ۴ نفر خریده‌اند
const CAMPAIGN = {
  id: 'c-autumn',
  title: 'جشنوارهٔ پاییزه ایمچ',
  description: 'هرچه زودتر بخری، تخفیف بیشتری می‌گیری — تعداد محدود.',
  type: 'quantity',
  discountPercent: 30,
  startsAt: iso(-6 * 864e5),
  endsAt: iso(9 * 864e5),
  purchaseCount: 4,
  currentTier: { from: 6, to: 10, percent: 30, boughtInTier: 0, spotsLeft: 5 },
  tiers: [
    { from: 1, to: 5, percent: 20 },
    { from: 6, to: 10, percent: 30 },
  ],
  finalPercent: 35,
  newUserHours: null,
  newUserMaxPurchases: null,
  userDeadline: null,
  userPurchasesLeft: null,
  userEligible: true,
};

const pct = (amount, p) => Math.round((amount * (100 - p)) / 100 / 1000) * 1000;
const PLANS = [
  {
    key: 'p2m',
    months: 2,
    pakageType: 1,
    title: 'دو ماهه',
    amount: 798_000,
    features: F.nine,
    sortOrder: 1,
  },
  {
    key: 'p6m',
    months: 6,
    pakageType: 2,
    title: 'شش ماهه',
    bestSeller: true,
    amount: 1_996_000,
    features: F.seven,
    sortOrder: 2,
  },
  {
    key: 'p12m',
    months: 12,
    pakageType: 3,
    title: 'یک‌ساله',
    amount: 3_596_000,
    features: F.seven,
    sortOrder: 3,
  },
].map((p) => ({
  ...p,
  discountPercent: CAMPAIGN.discountPercent,
  finalAmount: pct(p.amount, CAMPAIGN.discountPercent),
}));

const MY_PKG_FREE = {
  pakageType: 0,
  isActive: false,
  expiresAt: null,
  startedAt: null,
  totalDays: null,
  daysLeft: null,
  planTitle: null,
  pendingCount: 0,
  features: { productCapacity: 10, canSeeBuyers: false, unlimitedBuyRequests: true },
};
const MY_PKG_ACTIVE = {
  pakageType: 2,
  isActive: true,
  expiresAt: iso(96 * 864e5),
  startedAt: iso(-84 * 864e5),
  totalDays: 180,
  daysLeft: 96,
  planTitle: 'شش ماهه',
  pendingCount: 1,
  features: { productCapacity: -1, canSeeBuyers: true, unlimitedBuyRequests: true },
};

const ORDERS = [
  {
    id: 'ord-101',
    status: 'pending',
    planKey: 'p2m',
    months: 2,
    amount: 558_000,
    baseAmount: 798_000,
    discountPercent: 30,
    campaignTitle: 'جشنوارهٔ پاییزه ایمچ',
    rejectionReason: null,
    reviewedAt: null,
    startsAt: null,
    expiresAt: null,
    createdAt: iso(-2 * 864e5),
    receipt: null,
  },
];

// ─── روت‌ها ─────────────────────────────────────────────────────────────────
const routes = {
  '/api/v1/auth/login': (body) => {
    if (body.phone !== USER.phone) return fail('کاربر یافت نشد.', 'USER_NOT_FOUND');
    if (!body.password) return fail('این شماره رمز عبور دارد؛ رمز عبور را وارد کنید.', 'PASSWORD_REQUIRED');
    if (body.password !== 'test1234') return fail('رمز عبور اشتباه است.', 'PASSWORD_WRONG');
    return ok({
      isNewUser: false,
      hasPassword: true,
      accessToken: 'mock-access-karim',
      refreshToken: 'mock-refresh-karim',
    });
  },
  '/api/v1/auth/refreshToken': () =>
    ok({ accessToken: 'mock-access-karim', refreshToken: 'mock-refresh-karim' }),
  '/api/v1/users/getProfile': () =>
    ok({ user: USER, profile: {}, gallery: [], certificates: [] }),
  '/api/v1/packages/getPlans': () =>
    ok({
      plans: PLANS,
      campaign: CAMPAIGN,
      cardNumber: '6037-9975-1234-5678',
      cardOwner: 'سعید یوسفی',
      free: { productCapacity: 10, canSeeBuyers: false, unlimitedBuyRequests: true },
    }),
  '/api/v1/packages/getMyPackage': () => ok(activePkg ? MY_PKG_ACTIVE : MY_PKG_FREE),
  '/api/v1/packages/getMyPackageOrders': () => ok({ items: ORDERS }),
  '/api/v1/chat/unreadCount': () => ok({ total: 0, chat: 0, support: 0, admin: 0 }),
  '/api/v1/chat/getMyAdminMessages': () => ok({ items: [], unreadCount: 0 }),
  '/api/v1/wallet/getWallet': () => ok({ balance: USER.wallet_balance }),
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (req.method === 'POST' && url.pathname === '/mock/toggle-active') {
    activePkg = !activePkg;
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ activePkg }));
    return;
  }

  let raw = '';
  req.on('data', (c) => (raw += c));
  req.on('end', () => {
    let body = {};
    try {
      body = raw ? JSON.parse(raw) : {};
    } catch {
      /* بدنهٔ خالی */
    }
    const handler = routes[url.pathname];
    const payload = handler
      ? handler(body)
      : ok({}); // اندپوینت‌های پوستهٔ پنل — جواب خالی مؤدبانه
    if (!handler) console.log('[mock] catch-all:', url.pathname);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  });
});

server.listen(4000, '127.0.0.1', () => {
  console.log('mock backend listening on :4000 (activePkg =', activePkg + ')');
});
