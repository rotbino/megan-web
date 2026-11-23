# 🛒 iMach (ایمچ) — فرانت‌اند بازار B2B عمده

پروتوتایپ کامل فرانت‌اند **ایمچ (iMach)** — بازار خرید و فروش عمده بدون واسطه با طراحی مدرن (سرمه‌ای متمایل به خاکستری، فونت ایران‌سنس).

> **Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Lucide Icons · TanStack React Query v5**

## وضعیت فعلی (F1 — متصل به بک‌اند واقعی مگان + پنل کامل)

تمام صفحات کلیدی بازار پیاده شده‌اند و بعد از فاز F1 داده‌ها از **بک‌اند واقعی
مگان (NestJS + Prisma + MongoDB Atlas)** می‌آیند (چت B8 و CRM B7 هم زنده‌اند؛
قیمت‌گذاری/کیف پول تا فاز B9 ماک):

| صفحه | مسیر |
|---|---|
| خانه (هیرو، ۱۰ دسته تصویری، جدیدترین محصولات، جدیدترین درخواست‌های خرید، فرم RFQ، بنر ثبت فروشگاه، کارت‌های سئو) | `/` |
| لیست همه محصولات + جستجو (`?s=`) | `/product-list` |
| لیست دسته‌بندی + سئو | `/product-list/category/[slug]` |
| جزئیات آگهی + گالری + چت + قیمت | `/product-view/[slug]/[category]/[id]` |
| درخواست‌های خرید (RFQ) | `/buyAd-requests` |
| پروفایل/ویترین فروشنده | `/profile/[username]` |
| ورود/ثبت‌نام با OTP موبایل | `/register` |
| پنل فروشنده (داشبورد + جدول آگهی‌ها + نردبان) | `/panel` |
| فرم ثبت محصول (دسته آبشاری سه‌سطحی) | `/panel/products/new` |
| Sitemap + robots + manifest (PWA) | `/sitemap.xml` `/robots.txt` |

## اجرا — گام به گام (ویندوز / لینوکس / مک)

> **پیش‌نیاز:** Node.js نسخه **LTS 22**. فرانت به بک‌اند نیاز دارد — اول `megan-back`
> را طبق README خودش روی پورت ۴۰۰۰ اجرا کنید، بعد این‌جا.

```powershell
npm install         # یا: yarn   (یا: bun install)
npm run dev         # → http://localhost:3000
```

**چطور کار می‌کند؟** همه درخواست‌های `/api/**` فرانت از طریق rewrite نکست به
`http://localhost:4000/api/v1/**` بک‌اند می‌روند (آدرس در `.env` با کلید
`BACKEND_ORIGIN` — بدون CORS، هم‌مبدأ). تصاویر هم مستقیم از CDN آروان می‌آیند.

بیلد پروداکشن:

```powershell
npm run build
npm start           # next start روی پورت 3000
```

عیب‌یابی سریع:
- اگر داده‌ها نیامد: مطمئن شوید بک‌اند روشن است (`http://localhost:4000/api/v1/health`).
- لاگین تستی: شماره موبایل دلخواه (مثل `09123456789`) → کد OTP در حالت development
  در پاسخ API برمی‌گردد (devCode).

## معماری (ماژولار اما نه افراطی)

```
src/
├── app/                    # صفحات App Router (server components + metadata)
│   ├── layout.tsx          # RTL + فونت IRANSans (محلی) + React Query Provider + SW (پروداکشن)
│   ├── page.tsx            # خانه
│   ├── product-list/       # لیست + دسته‌بندی (مرتب‌سازی دوگانه)
│   ├── product-view/       # جزئیات آگهی (SEO + JSON-LD)
│   ├── buyAd-requests/     # درخواست‌های خرید
│   ├── profile/            # ویترین فروشنده
│   ├── register/           # ورود OTP
│   ├── panel/              # پنل فروشنده + نردبان
│   └── sitemap.ts robots.ts
├── fonts/                  # IRANSansWeb (نسخه محلی)
├── components/
│   ├── layout/             # هدر (مگامنو + جستجوی زنده) + فوتر
│   ├── home/               # هیرو، دسته‌های تصویری، ردیف محصولات/درخواست‌ها، RFQ، بنر، سئوکارت
│   ├── products/           # کارت محصول، لیست+فیلتر، چت، مرتبط‌ها، تب‌های پروفایل
│   ├── buy-requests/       # کارت درخواست خرید
│   └── shared/             # نشان‌ها (نردبان/احراز)، قیمت، تصویر محصول، بردکرامب، JSON-LD
└── lib/
    ├── types.ts            # تایپ‌های مدل داده (myuserId, minSalePrice, isLadder, …)
    ├── format.ts           # اعداد/قیمت/تاریخ فارسی (تبدیل واحد تن)
    └── mock/               # data.ts (دادهٔ نمونه/آفلاین) + api.ts + hooks.ts
```

## نکات فنی مهم

- **مدل داده**: `src/lib/types.ts` هم‌نام فیلدهای API بک‌اند (`myuser_id`, `sub_category_id`, `min_sale_price`, `min_sale_amount`, `requirement_amount`, …).
- **مرتب‌سازی فقط ۲ گزینه**: «مرتبط‌ترین / جدیدترین» — آگهی‌های **نردبان** (تنها قابلیت تبلیغاتی ایمچ v1، ۱۰ هزار تومان در روز) همیشه بالای نتایج.
- **بدون فروشنده ویژه**: `is_elevated` فقط برای سازگاری حفظ شده؛ در UI نشان «نردبان» جایگزین شده است.
- **React Query**: همه دیتا از `lib/mock/hooks.ts`؛ برای اتصال به بک‌اند فقط `lib/mock/api.ts` را با `fetch` واقعی جایگزین کنید.
- **سئو**: SSR کامل + `generateMetadata` داینامیک + JSON-LD (Product, BreadcrumbList, WebSite/SearchAction) + sitemap خودکار؛ HTML کامل به گوگل می‌رسد.
- **قیمت پشت تعامل**: الگوی Lead-gen (دکمه «مشاهده قیمت» → دیالوگ کف قیمت + تماس/چت).
- **برندبوک ایمچ**: سرمه‌ای متمایل به خاکستری (جدی/خنثی/کم‌زرق‌وبرق، مناسب B2B) + کهربایی ملایم فقط برای نشان نردبان + لوگوی iMach. توکن‌ها در `globals.css`.
- **فونت ایران‌سنس**: نسخه محلی `src/fonts/` (Regular با اعداد فارسی + Bold woff2).
- **PWA + Web Push**: `public/sw.js` (سرویس‌ورکر کاربر) + `manifest.webmanifest` + آیکون‌های `public/icons/` — فقط در پروداکشن ثبت می‌شود.
- **ریسپانسیو کامل** با منوی موبایل و فیلترهای بازشو (بدون سرریز افقی در 390px).

## فازهای بعدی

1. اتصال به API واقعی بک‌اند (جایگزینی `lib/mock/api.ts`)
2. Auth واقعی (JWT + httpOnly cookie) و روت‌های محافظت‌شده پنل
3. آپلود عکس محصول (آبجکت‌استوریج)
4. ISR برای صفحات عمومی + optimistic updates
5. چت WebSocket + اعلان‌ها
