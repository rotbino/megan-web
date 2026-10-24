# Worklog

---
Task ID: 1
Agent: main-agent
Task: تحلیل کامل سایت buskool.com (ساختار، دیتا، API، طراحی) پیش از ساخت پروتوتایپ HTML

Work Log:
- WebFetch مستقیم شکست خورد (سایت JS-heavy) → از agent-browser (مرورگر هدلس) استفاده شد
- صفحه اصلی: اسنپ‌شات کامل accessibility tree — هدر، جستجو، ۱۰ دسته اصلی، فرم درخواست خرید، CTA فروشگاه، سئو-فوتر
- منوی مگا دسته‌بندی‌ها: ۱۰ دسته lvl1 + زیرشاخه‌های lvl2 (مثلا کشاورزی: خشکبار/میوه/صیفی/غلات/ادویه/دامپروری/حبوبات/بذر و نهال) + محصولات lvl3 (پسته و...)
- صفحه لیست محصول (product-list/category/پسته): کارت‌های آگهی (فروشنده ویژه badge, نام, استان/شهر, موجودی, احراز هویت, مشاهده قیمت)، سایدبار فیلتر (دسته‌ها + استان + شهر)، مرتب‌سازی (مرتبط‌ترین/جدیدترین)، بنر پرداخت امن وسط لیست، متادیتای سئو + FAQ JSON-LD
- صفحه جزئیات محصول (product-view/{slug}/{cat}/{id}): گالری، h1، لیست اطلاعات (فروشنده/آدرس/موجودی/حداقل فروش)، توضیحات، چت، شماره تماس، هشدار پلیس، رأی به‌روزرسانی قیمت، محصولات مرتبط
- صفحه درخواست‌های خرید (/buyAd-requests): جستجو در درخواست‌ها، فیلتر مکان، کارت‌های درخواست + دکمه‌های تماس/چت با خریدار
- صفحه پروفایل فروشنده (/profile/{username}): تب‌های اصلی/محصولات/درباره، نظرات، امتیاز
- ثبت‌نام: فقط شماره موبایل (OTP)
- APIهای کشف‌شده (همه POST JSON): /get_category_list {parent_id}، /get_buyAd_list (2.65MB بدون صفحه‌بندی!)، /user/get_product_list، /get_category_meta_data، /get-search-suggestion-keywords {typed_text}، /location/get_location_info
- ساختار داده Product از Vue $data استخراج شد: main{product_name, stock, min_sale_price, min_sale_amount, sub_category_id, category_id, province_id, city_id, is_elevated, has_video, is_old}, user_info{user_name, active_pakage_type, is_verified}, photos[{file_path: ArvanCloud S3}]
- Stack باسکول: Laravel + Vue 2 + Bootstrap + IRANSans؛ ۵ اسکرین‌شات + تحلیل VLM رنگ/طراحی

Stage Summary:
- باسکول = بازارگاه B2B عمده با مدل Lead-gen (قیمت مخفی) — مدل درآمد: عضویت + تبلیغات
- ارزیابی ۷/۱۰؛ نقاط ضعف: شمارنده‌های 0+، پاسخ 2.65MB، فیلتر محدود، dir=ltr باگ، بدون ترند قیمت

---
Task ID: 2
Agent: main-agent
Task: ساخت megan-back (NestJS 11 + Fastify 5 + Prisma 6) — اسکلت + مدل‌ها و پوش به github.com/rotbino/megan-back

Work Log:
- تلاش برای ورود به پنل باسکول با کوکی laravel_session کاربر (OH5w...) — ناموفق: باسکول سشن را به IP ایران گره می‌زند و پیام «فیلترشکن را خاموش کنید» نمایش می‌دهد؛ از سندباکس خارجی ورود ممکن نیست
- کلون هر دو ریپو خالی (megan-back/megan-web) با توکن کاربر
- prisma/schema.prisma کامل با @map منطبق بر ستون‌های باسکول: User(myusers) + Category(درخت خودارجاع + unit/min/score) + Province/City + Product(تمام فیلدها + ۴ ایندکس) + Photo + BuyRequest(requirement_amount) + Review + Favorite + PriceHistory + ChatThread/ChatMessage + OtpCode + enumها
- اسکلت NestJS: main.ts با FastifyAdapter + ValidationPipe + prefix /api/v1 + CORS؛ app.module؛ PrismaModule سراسری
- Categories module به‌عنوان الگوی معماری: CacheService (TTL حافظه، قابل جایگزینی با Redis) + endpoint سازگار با get_category_list باسکول
- CursorPagerDto — صفحه‌بندی cursor-based (رفع ضعف 2.65MB باسکول)
- bun install + prisma validate + prisma generate + tsc --noEmit → همه PASS
- README فارسی + .env.example + nest-cli.json + tsconfig
- commit + push به main → موفق

Stage Summary:
- تحویل: github.com/rotbino/megan-back (main) — اسکیمای آماده مهاجرت + الگوی معماری

---
Task ID: 3
Agent: main-agent
Task: ساخت megan-web (Next.js 16) — پروتوتایپ کامل با دیتای ماک منطبق باسکول + پوش به github.com/rotbino/megan-web

Work Log:
- init-fullstack.sh اجرا شد؛ اسکفولد Next.js 16 + Tailwind 4 + shadcn/ui + TanStack Query موجود بود
- برندبوک B2B جدید در globals.css: تیل عمیق (oklch 0.51 0.085 183) به‌جای نارنجی باسکول + طلایی برای نشان فروشنده ویژه؛ فونت Vazirmatn (next/font/google)؛ RTL کامل
- lib/types.ts — تایپ‌های منطبق باسکول؛ lib/format.ts — اعداد/قیمت/تاریخ/زمان نسبی فارسی
- lib/mock/data.ts — دیتای ماک با شناسه‌های واقعی باسکول: درخت دسته (پسته=44, خشکبار=45, کشاورزی=76...)، ۳۱ استان (اصفهان=4, کرمان=21)، شهرها (شهر بابک=230)، ۶ کاربر (۲ نفر اول واقعی)، ۱۶ محصول (قیمت پسته اکبری=3,700,000 از API واقعی)، ۱۲ درخواست خرید (۴ تای اول واقعی از get_buyAd_list)
- lib/mock/api.ts + hooks.ts — لایه API ماک با تأخیر + هوک‌های React Query (placeholderData برای صفحه‌بندی نرم، staleTime/gcTime تنظیم‌شده)
- ۹ مسیر صفحه ساخته شد: / ، /product-list (+ ?s= جستجو)، /product-list/category/[slug]، /product-view/[slug]/[category]/[id]، /buyAd-requests، /profile/[username]، /register (OTP دومرحله‌ای)، /panel، /panel/products/new (فرم ثبت محصول با دسته آبشاری ۳سطحی) + not-found + sitemap.ts + robots.ts
- کامپوننت‌ها: هدر (مگامنو ۳سطحی + جستجوی زنده با suggest)، فوتر سئویی، کارت محصول، دیالوگ آشکارسازی قیمت (Lead-gen باسکول)، چت ماک، سایدبار فیلتر (استان→شهر آبشاری)، مرتب‌سازی ۴گانه، کارت درخواست خرید، تب‌های پروفایل، داشبورد پنل با جدول آگهی‌ها
- SEO: generateMetadata داینامیک (عناوین مطابق الگوی باسکول: «پسته - خرید و قیمت پسته عمده | ارزان‌ترین قیمت»)، JSON-LD (Product با AggregateOffer + BreadcrumbList + WebSite/SearchAction)
- باگ‌های رفع‌شده: کامپوننت در زمان رندر (lucide icon lookup) → نگاشت کلیدی؛ setState در effect → الگوی تنظیم state هنگام رندر؛ /product-list 404 (فایل جاافتاده)؛ تداخل robots.txt (public حذف شد)؛ سرریز افقی موبایل ۷px (گریدهای implicit-auto → grid-cols-1 صریح در ۴ فایل)
- تست مرورگر خودکار: همه مسیرها 200؛ جستجوی خرما → ۲ کارت درست؛ فیلتر استان اصفهان → ۴→۱ کارت؛ دیالوگ قیمت با ۳٬۷۰۰٬۰۰۰ تومان؛ فرم RFQ ثبت موفق؛ مگامنو باز؛ موبایل 390px بدون overflow؛ lint پاس
- کپی تمیز به repos/megan-web (حذف: node_modules/.next/skills/db/z-ai sdk/Caddyfile/api route/tests؛ icon.svg برند؛ package.json با نام megan-web + اسکریپت‌های تمیز؛ README کامل فارسی)
- commit + push → موفق (پوش اول remote گم شده بود → remote add مجدد + push)

Stage Summary:
- تحویل: github.com/rotbino/megan-web (main) — پروتوتایپ کامل ۹ صفحه با دیتای واقعی‌نمای باسکول
- پیش‌نمایش زنده سندباکس: صفحه / روی پورت 3000 فعال
- اتصال آینده: فقط lib/mock/api.ts با fetch واقعی megan-back جایگزین شود

---
Task ID: 4
Agent: main-agent
Task: ری‌برند ایمچ (iMach) — پول فونت/آیکون‌ها، دیتای واقعی باسکول از APIها، بازطراحی سرمه‌ای، اصلاحات UX وردبه‌ورد باسکول

Work Log:
- پول از ریپوها: fonts/IRANSans (4 فایل + FaNum)، public/icons (PWA)، logo.svg/logo2/logo3 (لوگوی iMach نارنجی)، sw.js (سرویس‌ورکر push/PWA) — همه در اپ کاری ادغام شد
- دیتای واقعی از APIهای زنده باسکول (agent-browser + fetch):
  * get_category_list: ۱۰ دسته سطح ۱ (ترتیب نمایش صفحه اول) + زیرشاخه‌های کشاورزی ۸×L2 + ۸۷×L3 با id/unit/min/score/example واقعی
  * user/get_product_list (با فرمت کشف‌شده: search_text + from/to_record_number + sort_by=BM): ۶۰ محصول واقعی پسته/خرما/سیب/زعفران/بادام با عکس‌های واقعی ArvanCloud
  * get_buyAd_list: ۶۰ درخواست خرید واقعی
  * ساختار صفحه اول باسکول دقیق استخراج شد: هیرو(h1/h2/شروع معاملات عمده) → دسته بندی های اصلی(۱۰ کارت تصویری) → جدیدترین محصولات(مشاهده همه) → جدیدترین درخواست های خرید → فرم RFQ(۳ placeholder دقیق باسکول + آمار) → بنر ثبت فروشگاه → ۳ کارت سئو(ایمچ چیست؟/خدمات خریداران/خدمات فروشندگان) → فوتر(۳ هدف + ستون‌ها + توصیه)
  * سورت باسکول فقط ۲ گزینه: مرتبط ترین / جدیدترین — ارزان‌ترین و بیشترین موجودی حذف شد
- gen-mock-data.py: تولید data.ts از JSONهای واقعی (قابل بازتولید) — باگ کلید تکراری 112 (نهال) رفع شد
- برندبوک جدید: سرمه‌ای متمایل به خاکستری (oklch 0.38 0.045 252) + کهربایی فقط برای نشان نردبان؛ گردی ۱۲px→۶px؛ فونت IRANSans محلی (FaNum)
- UX وردبه‌ورد باسکول: حذف صنف/فروشنده ویژه/جمله‌های اضافه فرم‌ها؛ نردبان (۱۰هزار تومان/روز) تنها قابلیت تبلیغاتی — نردبان‌ها بالای سورت «مرتبط ترین»
- تصاویر کم‌حجم: ۱۰ کارت دسته (webp ۲-۲۳KB) + هیرو (۲۷KB) از image-search + بهینه‌سازی Pillow
- PWA: manifest.webmanifest + آیکون‌های کاربر + ثبت sw.js فقط در پروداکشن
- بک: schema.prisma — LadderOrder (نرمال مالی نردبان) + is_ladder denorm روی Product + رفع ۴ رابطه خراب fields:[myuserId] + مستندسازی معنای فیلدهای BuyRequest از API واقعی؛ validate PASS
- ریپو تمیز: package.json حرفه‌ای ۱۶ deps؛ حذف ~۲۰ کامپوننت shadcn بلااستفاده؛ حذف sonner
- تست: tsc ۰ خطا، eslint پاس، next build موفق، همه مسیرها ۲۰۰، بدون overflow موبایل ۳90px، دیالوگ قیمت/فیلترها/فرم RFQ کار می‌کنند؛ VLM تأیید طراحی (فونت/رنگ/گوشه‌ها/عکس‌ها)
- پوش هر دو ریپو: megan-web (8d23464) و megan-back (973f7d0)

Stage Summary:
- ایمچ کاملاً با دیتای واقعی باسکول ساخته شد؛ فقط کشاورزی کامل (برای تست) + ۹ ریشه دیگر فقط نام
- اتصال آینده: فقط lib/mock/api.ts با fetch بک‌اند عوض شود
