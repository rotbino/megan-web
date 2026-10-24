# 🛒 Megan Web — فرانت‌اند بازارگاه B2B عمده

پروتوتایپ کامل فرانت‌اند «مِگان» — بازار خرید و فروش عمده بدون واسطه، **منطبق بر UX/مدل داده باسکول** با طراحی مدرن.

> **Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 · shadcn/ui · Lucide Icons · TanStack React Query v5**

## وضعیت فعلی (فاز ۱ — پروتوتایپ با Mock Data)

تمام صفحات کلیدی بازارگاه با دیتای ماک (منطبق بر ساختار واقعی استخراج‌شده از باسکول) پیاده شده‌اند:

| صفحه | مسیر | معادل باسکول |
|---|---|---|
| خانه (هیرو، دسته‌های دایره‌ای، جدیدترین آگهی‌ها، فرم RFQ، CTA فروشگاه) | `/` | صفحه اصلی |
| لیست همه محصولات + جستجو (`?s=`) | `/product-list` | `/product-list` |
| لیست دسته‌بندی + سئو | `/product-list/category/[slug]` | `/product-list/category/پسته` |
| جزئیات آگهی + گالری + چت + قیمت | `/product-view/[slug]/[category]/[id]` | `/product-view/خرید-عمده-پسته/خشکبار/328828` |
| درخواست‌های خرید (RFQ) | `/buyAd-requests` | `/buyAd-requests` |
| پروفایل/ویترین فروشنده | `/profile/[username]` | `/profile/c34qxnsh` |
| ورود/ثبت‌نام با OTP موبایل | `/register` | `/register` |
| پنل فروشنده (داشبورد + جدول آگهی‌ها) | `/panel` | پنل باسکول |
| فرم ثبت محصول (دسته آبشاری سه‌سطحی) | `/panel/products/new` | فرم ثبت آگهی باسکول |
| Sitemap + robots | `/sitemap.xml` `/robots.txt` | — |

## اجرا

```bash
bun install        # یا npm install
bun run dev        # http://localhost:3000
```

## معماری (ماژولار اما نه افراطی)

```
src/
├── app/                    # صفحات App Router (server components + metadata)
│   ├── layout.tsx          # RTL + فونت Vazirmatn + React Query Provider
│   ├── page.tsx            # خانه
│   ├── product-list/       # لیست + دسته‌بندی
│   ├── product-view/       # جزئیات آگهی (SEO + JSON-LD)
│   ├── buyAd-requests/     # درخواست‌های خرید
│   ├── profile/            # ویترین فروشنده
│   ├── register/           # ورود OTP
│   ├── panel/              # پنل فروشنده
│   └── sitemap.ts robots.ts
├── components/
│   ├── layout/             # هدر (مگامنو + جستجوی زنده) + فوتر
│   ├── home/               # هیرو، دسته‌ها، RFQ، جدیدترین‌ها، CTA
│   ├── products/           # کارت محصول، لیست+فیلتر، چت، مرتبط‌ها، تب‌های پروفایل
│   ├── buy-requests/       # کارت درخواست خرید
│   └── shared/             # نشان‌ها، قیمت، تصویر محصول، بردکرامب، JSON-LD
└── lib/
    ├── types.ts            # تایپ‌های منطبق باسکول (myuserId, minSalePrice, …)
    ├── format.ts           # اعداد/قیمت/تاریخ فارسی
    └── mock/               # data.ts (شناسه‌های واقعی باسکول) + api.ts + hooks.ts
```

## نکات فنی مهم

- **مدل داده منطبق باسکول**: `src/lib/types.ts` و `src/lib/mock/data.ts` عیناً از فیلدهای API باسکول (`myuser_id`, `sub_category_id`, `min_sale_price`, `min_sale_amount`, `is_elevated`, `requirement_amount`, …) با شناسه‌های واقعی (پسته=44، خشکبار=45، کرمان=21) ساخته شده‌اند تا مهاجرت بدون نگاشت باشد.
- **React Query**: همه دیتا از `lib/mock/hooks.ts` می‌آید؛ برای اتصال به بک‌اند فقط `lib/mock/api.ts` را با `fetch` واقعی (`megan-back: /api/v1/...`) جایگزین کنید — هوک‌ها و کامپوننت‌ها دست‌نخورده می‌مانند.
- **سئو**: SSR کامل + `generateMetadata` داینامیک + JSON-LD (Product, BreadcrumbList, WebSite/SearchAction) + sitemap خودکار. برخلاف باسکول (Vue 2 CSR)، HTML کامل به گوگل می‌رسد.
- **قیمت پشت تعامل**: الگوی Lead-gen باسکول حفظ شده (دکمه «مشاهده قیمت» → دیالوگ کف قیمت + تماس/چت).
- **برندبوک**: تیل عمیق (اعتماد B2B) + طلایی برای «فروشنده ویژه» — جایگزین نارنجی باسکول. توکن‌ها در `globals.css`.
- **ریسپانسیو کامل** با منوی موبایل و فیلترهای بازشو.

## فازهای بعدی

1. اتصال به API واقعی `megan-back` (جایگزینی `lib/mock/api.ts`)
2. Auth واقعی (JWT + httpOnly cookie) و روت‌های محافظت‌شده پنل
3. آپلود عکس محصول (آبجکت‌استوریج) به‌جای پلیس‌هولدر گرادیانی
4. ISR برای صفحات عمومی (`revalidate`) + optimistic updates
5. چت WebSocket + اعلان‌ها
