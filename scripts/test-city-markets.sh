#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# تست یک‌جای «بازار عمدهٔ شهری — نسخهٔ چندشهری» (خواستهٔ مالک ۹-۱۱):
#   ۱) سرویس جداگانهٔ /cityMarket/getProducts (تک‌شهری/چندشهری/fail-closed)
#   ۲) صفحات SSR: ریشهٔ بازار + دستهٔ شهری + تیک پایدار ?cities= + 404ها
#   ۳) تعاملی مرورگر: تیک شهر استان → نتایج و URL، بات‌شیت موبایل
#   ۴) اسکرین‌شات دسکتاپ/موبایل
# اجرا:  bash scripts/test-city-markets.sh
# ─────────────────────────────────────────────────────────────────────────────
set -u
cd /home/z/my-project

echo "=== [1] mock backend (:4000) ==="
pkill -f 'mock-backend-city' 2>/dev/null || true
node scripts/mock-backend-city.mjs > /tmp/mock-city.log 2>&1 &
sleep 1
curl -s -m 3 -X POST http://127.0.0.1:4000/api/v1/locations/getAllProvinces \
  -H 'Content-Type: application/json' -d '{}' | head -c 100; echo

echo "=== [2] سرویس /cityMarket/getProducts (جدا از سرویس اصلی) ==="
ep() { curl -s -m 5 -X POST "http://127.0.0.1:4000/api/v1/cityMarket/getProducts" \
  -H 'Content-Type: application/json' -d "$1"; }
node -e '
const http = require("http");
const call = (body) => new Promise((res) => {
  const req = http.request({ host: "127.0.0.1", port: 4000, path: "/api/v1/cityMarket/getProducts", method: "POST", headers: { "Content-Type": "application/json" } }, (r) => {
    let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d).data));
  });
  req.end(JSON.stringify(body));
});
let pass = 0, fail = 0;
const check = (cond, name) => { console.log((cond ? "  PASS: " : "  FAIL: ") + name); cond ? pass++ : fail++; };
(async () => {
  const t0 = Date.now();
  const tehran = await call({ cityIds: [101], sort: "related" });
  const ms = Date.now() - t0;
  check(tehran.total === 11, `تک‌شهری تهران = ۱۱ آگهی (got ${tehran.total})`);
  check(tehran.items[0].isLadder === true, "سورت related: نردبان اول");
  check(tehran.items.every((p) => p.cityId === 101), "همهٔ نتایج فقط تهران");

  const multi = await call({ cityIds: [101, 102, 103], sort: "related" });
  check(multi.total === 14, `چندشهری تهران+شهریار+ورامین = ۱۴ (got ${multi.total})`);
  check(multi.items.some((p) => p.cityName === "شهریار"), "چندشهری: آگهی شهریار آمده");
  check(Date.now() - t0 < 500, `سرعت چندشهری کافی (${ms}ms برای اولین فراخوانی)`);

  const closed = await call({ cityIds: [] });
  check(closed.total === 0, "بدون cityIds → خالی (fail-closed)");

  const malayer = await call({ cityIds: [116] });
  check(malayer.total === 0, "ملایر خالی = ۰");

  const hamProvince = await call({ cityIds: [115, 116, 117] });
  check(hamProvince.total === 4, `چندشهری همدان+ملایر+تویسرکان = ۴ (got ${hamProvince.total})`);

  const cat = await call({ cityIds: [101, 102], categorySlug: "berenge" });
  check(cat.total === 3 && cat.items.every((p) => p.subCategoryName === "برنج"), "چندشهری + دسته برنج");

  const paged = await call({ cityIds: [101, 102, 103], pageSize: 5, page: 2 });
  check(paged.pageCount === 3 && paged.items.length === 5, "صفحه‌بندی چندشهری (۵×۳)");

  console.log(`\n  endpoint: ${pass} pass / ${fail} fail`);
  process.exit(fail ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
' || echo "  (endpoint assertion failure)"

echo "=== [3] dev server (:3000) ==="
pkill -f 'next dev' 2>/dev/null || true
pkill -f 'next-server' 2>/dev/null || true
rm -f dev.log
nohup bun run dev > /tmp/bun-dev.log 2>&1 &
sleep 2
for i in $(seq 1 90); do
  code=$(curl -s -m 2 -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null || echo 000)
  if [ "$code" != "000" ]; then echo "server ready (~$((i*2+3))s, code=$code)"; break; fi
  sleep 2
done

fetch() { # fetch <path> <outfile> — رندر شدن با retry (کامپایل اولین بار کند است)
  local path="$1" out="$2" code
  for i in $(seq 1 12); do
    code=$(curl -s -m 150 -o "$out" -w '%{http_code}' "http://localhost:3000$path" 2>/dev/null || echo 000)
    if [ "$code" = "200" ]; then echo "OK   $path"; return 0; fi
    echo "      retry $path (code=$code, attempt=$i)"; sleep 4
  done
  echo "FAIL  $path"; return 1
}

echo "=== [4] صفحات ==="
fetch / /tmp/home.html
fetch /city/tehran /tmp/tehran.html
fetch '/city/tehran?cities=102,103' /tmp/tehran-ticks.html
fetch /city/tehran/category/berenge /tmp/tehran-cat.html
fetch '/city/tehran/category/berenge?cities=102' /tmp/tehran-cat-ticks.html
MALAYER=$(node -e 'console.log(encodeURIComponent("ملایر"))')
fetch "/city/$MALAYER" /tmp/malayer.html
echo "404(/city/atlantis):            $(curl -s -m 90 -o /dev/null -w '%{http_code}' 'http://localhost:3000/city/atlantis')"
echo "404(/city/atlantis/cat/berenge): $(curl -s -m 90 -o /dev/null -w '%{http_code}' 'http://localhost:3000/city/atlantis/category/berenge')"
echo "404(/city/tehran/cat/nope):      $(curl -s -m 90 -o /dev/null -w '%{http_code}' 'http://localhost:3000/city/tehran/category/nope')"
fetch /sitemap.xml /tmp/sitemap.xml

echo "=== [5] assertions (SSR) ==="
# ری‌اکت بین متن‌های مجاور <!-- --> می‌گذارد → قبل از grep حذف می‌شود
check() { if sed 's/<!-- -->//g' "$1" 2>/dev/null | grep -qF -- "$2"; then echo "  PASS: $3"; else echo "  FAIL: $3"; fi; }
check /tmp/home.html        'بازار عمده شهرها'    'صفحه اول: باکس شهرها'
check /tmp/tehran.html      'بازار عمده تهران'    'تهران: h1'
check /tmp/tehran.html      'آگهی فعال'           'تهران: آمار آگهی'
check /tmp/tehran.html      'شهرهای استان تهران'  'تهران: بلاک شهرهای استان'
check /tmp/tehran.html      'بازار این صفحه'      'تهران: شهر خود صفحه قفل'
check /tmp/tehran.html      'برنج هاشمی درجه یک'  'تهران: کارت محصول'
check /tmp/tehran.html      'بازار عمده مشهد'     'تهران: لینک بقیه شهرها'
if grep -qF 'فروشندگان ویژه' /tmp/tehran.html; then echo "  FAIL: تهران: بدون ریل VIP (حذف شده)"; else echo "  PASS: تهران: بدون ریل VIP"; fi
if grep -qF 'همه استان' /tmp/tehran.html; then echo "  FAIL: تهران: بدون فیلتر استان"; else echo "  PASS: تهران: بدون فیلتر استان"; fi
# تیک پایدار در SSR: ?cities=102,103 → چیپ شهریار/ورامین + لینک‌های سایدبار با کوئری
check /tmp/tehran-ticks.html 'شهریار'             'تیک SSR: شهریار در صفحه'
check /tmp/tehran-ticks.html 'جستجو در ۳ شهر استان' 'تیک SSR: چیپ آمار ۳ شهر'
check /tmp/tehran-ticks.html 'cities=102,103'     'تیک SSR: کوئری در لینک‌های سایدبار'
# دستهٔ شهری
check /tmp/tehran-cat.html   'برنج عمده در تهران' 'دسته شهری: h1'
check /tmp/tehran-cat.html   'برنج هاشمی درجه یک' 'دسته شهری: آگهی برنج تهران'
check /tmp/tehran-cat.html   '/city/tehran/category/' 'دسته شهری: لینک‌های سایدبار شهری'
if grep -qF 'سیب قرمز دیماشند' /tmp/tehran-cat.html; then echo "  FAIL: دسته شهری: فقط برنج"; else echo "  PASS: دسته شهری: فقط برنج"; fi
check /tmp/tehran-cat-ticks.html 'cities=102'     'دسته شهری: تیک‌ها در لینک سایدبار می‌مانند'
# شهر خالی → حالت خالی (بدون fallback استان)
check /tmp/malayer.html      'بازار عمده ملایر'   'ملایر: h1 (URL فارسی)'
check /tmp/malayer.html      'پیدا نشد'           'ملایر: حالت خالی'
check /tmp/malayer.html      'شهرهای استان همدان'  'ملایر: پیشنهاد تیک شهرهای استان'
if grep -qF 'برنج هاشمی اسانلو' /tmp/malayer.html; then echo "  FAIL: ملایر: بدون fallback استان"; else echo "  PASS: ملایر: بدون fallback استان"; fi
# سایت‌مپ
check /tmp/sitemap.xml       '/city/tehran'       'sitemap: بازار شهرها'
check /tmp/sitemap.xml       '/city/tehran/category/food' 'sitemap: دستهٔ شهری (شهر×دسته)'

echo "=== [6] تعاملی مرورگر — تیک چندشهری ==="
agent-browser set viewport 1440 900 2>/dev/null
agent-browser open 'http://localhost:3000/city/tehran' 2>/dev/null && agent-browser wait --load networkidle 2>/dev/null
agent-browser find text 'شهریار' click 2>/dev/null && echo "  tick: شهریار clicked"
sleep 2
agent-browser get url 2>/dev/null
agent-browser wait --text 'پیاز قرمز شهریار' 2>/dev/null && echo "  PASS: آگهی شهریار در نتایج چندشهری"
agent-browser find text 'شهریار' click 2>/dev/null && echo "  untick: شهریار برداشته شد"
sleep 2
URL=$(agent-browser get url 2>/dev/null)
if echo "$URL" | grep -q 'cities='; then echo "  FAIL: تیک برداشته شد ولی cities= ماند ($URL)"; else echo "  PASS: با حذف تیک، cities= از URL رفت"; fi
if agent-browser snapshot 2>/dev/null | grep -q 'پیاز قرمز شهریار'; then echo "  FAIL: آگهی شهریار هنوز در نتایج"; else echo "  PASS: با حذف تیک، آگهی شهریار رفت"; fi

echo "=== [7] اسکرین‌شات ==="
mkdir -p /tmp/shots
agent-browser set viewport 1440 900 2>/dev/null
agent-browser open 'http://localhost:3000/city/tehran' 2>/dev/null && agent-browser wait --load networkidle 2>/dev/null
agent-browser screenshot --full /tmp/shots/tehran-desktop.png 2>/dev/null && echo "  tehran-desktop"
agent-browser open 'http://localhost:3000/city/tehran/category/berenge' 2>/dev/null && agent-browser wait --load networkidle 2>/dev/null
agent-browser screenshot --full /tmp/shots/tehran-category-desktop.png 2>/dev/null && echo "  tehran-category-desktop"
agent-browser set viewport 390 844 2>/dev/null
agent-browser open 'http://localhost:3000/city/tehran' 2>/dev/null && agent-browser wait --load networkidle 2>/dev/null
agent-browser screenshot --full /tmp/shots/tehran-mobile.png 2>/dev/null && echo "  tehran-mobile"
agent-browser find text 'شهرهای استان' click 2>/dev/null && echo "  sheet: باز شد"
sleep 1
agent-browser screenshot /tmp/shots/tehran-mobile-sheet.png 2>/dev/null && echo "  tehran-mobile-sheet (تیک چندشهری)"
agent-browser errors 2>/dev/null || echo "  (no page errors)"
agent-browser close 2>/dev/null

echo "=== [8] لاگ‌ها ==="
echo "--- mock ---"; tail -3 /tmp/mock-city.log
echo "--- bun-dev (errors) ---"
grep -iE "error" /tmp/bun-dev.log | grep -viE "ECONNREFUSED|mock|catch" | tail -5 || echo "  (clean)"
echo "--- dev.log (errors) ---"
grep -iE "error" dev.log | grep -viE "ECONNREFUSED" | tail -8 || echo "  (clean)"

echo "=== DONE ==="
