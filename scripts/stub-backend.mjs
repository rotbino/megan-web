// استاب بک‌اند پیش‌نمایش سندباکس (پورت ۴۰۰۰) — فقط برای بازبینی بصری فرانت.
// اجرای خودکار: src/instrumentation.ts در بوت سرور dev آن را بالا می‌آورد،
// فقط وقتی فایل نشانگر «.sandbox-preview» در ریشهٔ پروژه باشد (gitignore —
// روی ماشین مالک وجود ندارد و بک‌اند واقعی مگان روی همان پورت دست‌نخورده است).
// پورت ۴۰۰۰ زنده باشد (بک‌اند واقعی/استاب قبلی) → استاب بالا نمی‌آید.
import { createServer } from 'node:http';

const PROVINCES = [
  { id: 1, province_name: 'تهران' },
  { id: 8, province_name: 'همدان' },
];

const CITIES = [
  { id: 101, province_id: 1, city_name: 'تهران' },
  { id: 108, province_id: 1, city_name: 'شهریار' },
  { id: 109, province_id: 1, city_name: 'اسلامشهر' },
  { id: 102, province_id: 8, city_name: 'همدان' },
  { id: 103, province_id: 8, city_name: 'ملایر' },
  { id: 104, province_id: 8, city_name: 'نهاوند' },
  { id: 105, province_id: 8, city_name: 'تویسرکان' },
  { id: 106, province_id: 8, city_name: 'اسدآباد' },
  { id: 107, province_id: 8, city_name: 'کبودرآهنگ' },
];

const cat = (id, name, slug, parent, extra = {}) => ({
  id,
  category_name: name,
  slug,
  unit: 'کیلوگرم',
  min: 10,
  example: null,
  parent_id: parent,
  score: 1,
  ...extra,
});

// درخت دسته‌ها — ریشهٔ کشاورزی اسلاگ فارسی «کشاورزی» دارد تا URL واقعی مالک
// (/product-list/category/کشاورزی) در پیش‌نمایش هم رزولو شود.
const CATS = [
  cat(77, 'مواد غذایی', 'food', null, {
    example: 'پفک مزمز',
    children: [
      cat(200, 'تنقلات', 'snacks', 77, {
        example: 'چیتوز',
        children: [cat(300, 'پفک و چیپس', 'puffs', 200, { example: 'پفک مزمز تند' })],
      }),
      cat(201, 'تن‌مکانی', 'meat', 77, { example: 'سوسیس' }),
    ],
  }),
  cat(76, 'محصولات کشاورزی', 'کشاورزی', null, {
    example: 'سیب',
    children: [
      cat(400, 'میوه', 'fruits', 76, {
        example: 'سیب قرمز',
        children: [
          cat(500, 'سیب', 'apple', 400, { example: 'سیب قرمز فرقان' }),
          cat(600, 'گردو', 'walnut', 400, { example: 'گردوی تازه تویسرکان' }),
        ],
      }),
    ],
  }),
];

/** همهٔ idهای زیردرختِ یک اسلاگ (خودش + فرزندان) — برای فیلتر دستهٔ لیست */
function subtreeIds(slug) {
  const flat = [];
  const walk = (nodes) => {
    for (const n of nodes) {
      flat.push(n);
      if (n.children) walk(n.children);
    }
  };
  walk(CATS);
  const ids = new Set(flat.filter((n) => n.slug === slug).map((n) => n.id));
  // پخش به پایین تا عمق درخت (درخت کم‌عمق است — چند پاس کافی و ساده است)
  let grew = true;
  while (grew) {
    grew = false;
    for (const n of flat) {
      if (!ids.has(n.id) && n.parent_id != null && ids.has(n.parent_id)) {
        ids.add(n.id);
        grew = true;
      }
    }
  }
  return ids;
}

const p = (i, name, slug, cityId, cityName, over = {}) => ({
  id: 1000 + i,
  productName: name,
  slug,
  description: 'توضیح تستی',
  stock: 1000 + i * 250,
  minSalePrice: 25000 + i * 3000,
  minSaleAmount: 50,
  unit: 'کیلوگرم',
  categoryId: 300,
  categoryName: 'پفک و چیپس',
  subCategoryId: 200,
  subCategoryName: 'تنقلات',
  provinceId: 8,
  provinceName: 'همدان',
  cityId,
  cityName,
  myuserId: String(50 + i),
  seller: {
    id: String(50 + i),
    userName: 'seller' + i,
    firstName: 'کاربر',
    lastName: 'تستی ' + i,
    activePakageType: i % 3 === 0 ? 3 : 1,
    isVerified: i % 2 === 0,
  },
  isLadder: i % 4 === 0,
  isElevated: i % 5 === 0,
  hasVideo: i === 2,
  isOld: false,
  viewCount: 40 + i * 17,
  createdAt: '2026-11-0' + ((i % 8) + 1) + ' 09:00:00',
  updatedAt: '2026-11-0' + ((i % 8) + 1) + ' 10:30:00',
  photos: ['/images/categories/food.webp'],
  photoThumbs: ['/images/categories/food.webp'],
  ...over,
});

const AGRI_PHOTO = {
  photos: ['/images/categories/agriculture.webp'],
  photoThumbs: ['/images/categories/agriculture.webp'],
};

const PRODUCTS = [
  p(0, 'پفک مزمز تند چیتوز', 'pofak-mazmaz', 102, 'همدان'),
  p(1, 'پفک مزمز نمکی چیتوز', 'pofak-mazmaz-namaki', 102, 'همدان'),
  p(2, 'چیپس نمکی زیرو زرتشتی', 'chips-namaki', 102, 'همدان', { minSalePrice: null }),
  p(3, 'پفک پنیری آلپین', 'pofak-paniri', 102, 'همدان'),
  p(4, 'سیب قرمز فرقان درجه یک', 'sib-sorkh', 102, 'همدان', {
    categoryId: 500,
    categoryName: 'سیب',
    subCategoryId: 400,
    subCategoryName: 'میوه',
    ...AGRI_PHOTO,
  }),
  p(5, 'سیب زرد قلتان', 'sib-zard', 102, 'همدان', {
    categoryId: 500,
    categoryName: 'سیب',
    subCategoryId: 400,
    subCategoryName: 'میوه',
    ...AGRI_PHOTO,
  }),
  p(6, 'پفک تند فلیکس', 'pofak-tend', 102, 'همدان'),
  p(7, 'تخمه ژاپنی نمکی', 'tokhme', 102, 'همدان', { unit: 'کیسه' }),
  p(8, 'بسته پفک مینی مزمز', 'pofak-mini', 102, 'همدان'),
  p(9, 'سیب عسلی ملایر', 'sib-asali', 103, 'ملایر', {
    categoryId: 500,
    categoryName: 'سیب',
    subCategoryId: 400,
    subCategoryName: 'میوه',
    ...AGRI_PHOTO,
  }),
  p(10, 'گردوی تازه تویسرکان', 'gerdoo', 105, 'تویسرکان', {
    categoryId: 600,
    categoryName: 'گردو',
    subCategoryId: 400,
    subCategoryName: 'میوه',
    ...AGRI_PHOTO,
  }),
];

/** لیست صفحه‌بندی‌شده — فیلتر شهرها (بازار شهری)، شهر تکی و زیردرختِ دسته */
function paged({ cityIds, cityId, categorySlug } = {}) {
  let items = PRODUCTS;
  if (Array.isArray(cityIds) && cityIds.length) {
    const ids = cityIds.map(Number);
    items = items.filter((x) => ids.includes(x.cityId));
  }
  if (cityId != null) {
    items = items.filter((x) => x.cityId === Number(cityId));
  }
  if (categorySlug) {
    const ids = subtreeIds(String(categorySlug));
    if (ids.size > 0) {
      items = items.filter((x) => ids.has(x.categoryId) || ids.has(x.subCategoryId));
    }
  }
  return { items, total: items.length, page: 1, pageCount: 1 };
}

const PROFILE = {
  id: '50',
  phone: '09120000000',
  user_name: 'seller0',
  first_name: 'کاربر',
  last_name: 'تستی',
  sex: null,
  role: 'buyer',
  has_password: true,
  is_verified: true,
  is_buyer: true,
  is_seller: false,
  wallet_balance: 0,
  avatar_url: null,
  business_desc: null,
  province_id: 8,
  city_id: 102,
};

// ─── چت و صفحهٔ کالا — برای بازبینی بصری ویجت/پیام‌ها در سندباکس ───
const nowIso = () => new Date().toISOString();
const CHAT = {
  thread: {
    id: 't1',
    productId: 1000,
    productName: 'پفک مزمز تند چیتوز',
    myId: '50',
    myRole: 'buyer',
    counterpart: { id: '51', firstName: 'کاربر', lastName: 'تستی 1', userName: 'seller1' },
    lastMessage: null,
    unreadCount: 0,
    updatedAt: nowIso(),
  },
  messages: [],
  seq: 1,
};

const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (!url.pathname.startsWith('/api/v1/')) {
    res.writeHead(200).end('ok');
    return;
  }
  const path = url.pathname.replace('/api/v1/', '');
  let body = {};
  try {
    body = await new Promise((resolve) => {
      let raw = '';
      req.on('data', (c) => (raw += c));
      req.on('end', () => {
        try {
          resolve(JSON.parse(raw || '{}'));
        } catch {
          resolve({});
        }
      });
    });
  } catch {
    body = {};
  }
  let data = [];
  switch (path) {
    case 'locations/getAllProvinces': data = PROVINCES; break;
    case 'locations/getCitiesByProvince': data = CITIES; break;
    case 'categories/getAllCategories': data = CATS; break;
    case 'cityMarket/getProducts': data = paged({ cityIds: body.cityIds }); break;
    case 'products/getProductList': data = paged(body); break;
    case 'products/getProductById':
      data = PRODUCTS.find((x) => x.id === Number(body.id)) ?? null;
      break;
    case 'products/searchSuggestions': data = []; break;
    case 'products/getSellerProducts': data = { items: PRODUCTS.slice(0, 6), total: 6 }; break;
    case 'reviews/getSellerReviews':
      data = {
        summary: { avg: 0, count: 0, distribution: [] },
        items: [],
        total: 0,
        page: 1,
        perPage: 5,
      };
      break;
    case 'users/getProfile': data = { user: PROFILE }; break;
    // ─── چت — حالت حداقلی برای بازبینی بصری کامپوزر/مودال پیوست ───
    case 'chat/startThread': data = CHAT.thread; break;
    case 'chat/getConversations': data = [CHAT.thread]; break;
    case 'chat/getThreadMessages': data = CHAT.messages; break;
    case 'chat/markThreadRead': data = { read: 0 }; break;
    case 'chat/uploadFile':
      // multipart خوانده نمی‌شود — پاسخ ثابت برای تست جریان مودال پیوست
      data = {
        url: '/images/categories/food.webp',
        key: 'stub-' + Date.now(),
        name: 'stub.webp',
        size: 12345,
        mime: 'image/webp',
        kind: 'image',
      };
      break;
    case 'chat/sendMessage': {
      const msg = {
        id: 'm' + CHAT.seq++,
        threadId: body.threadId ?? 't1',
        senderId: '50',
        text: body.text ?? '',
        readAt: null,
        createdAt: nowIso(),
        kind: body.kind ?? 'text',
        file: body.fileUrl
          ? { url: body.fileUrl, key: body.fileKey, name: body.fileName, size: body.fileSize, mime: body.fileMime }
          : null,
        editedAt: null,
      };
      CHAT.messages.push(msg);
      CHAT.thread.lastMessage = { text: msg.text || (msg.file ? msg.file.name : ''), at: msg.createdAt, senderId: '50' };
      data = msg;
      break;
    }
    case 'chat/unreadCount': data = { count: 0 }; break;
    case 'follow/isFollowing': data = { following: false, item: null }; break;
    case 'follow/getFollowingMap': data = []; break;
    default: data = [];
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: true, data }));
});

// پورت اشغال (بک‌اند واقعی/استاب دیگری) → خروج بی‌سروصدا؛ next.config
// ممکن است هم‌زمان دوبار استاب را بالا بیاورد — فقط یک نمونه زنده می‌ماند.
server.on('error', () => process.exit(0));
server.listen(4000, '127.0.0.1', () => {
  console.log('[sandbox] stub backend on http://127.0.0.1:4000');
});
