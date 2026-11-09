#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# تست یک‌جای «بازار عمده شهری» — چون پروسه‌های پس‌زمینه بعد از هر فراخوانی
# کشته می‌شوند، کل سناریوی تست در همین یک اجرا انجام می‌شود:
#   ماک :4000 → سرور dev :3000 → curl صفحات → assertions → اسکرین‌شات
# اجرا:  bash scripts/test-city-markets.sh
# ─────────────────────────────────────────────────────────────────────────────
set -u
cd /home/z/my-project

echo "=== [1] mock backend (:4000) ==="
node scripts/mock-backend-city.mjs > /tmp/mock-city.log 2>&1 &
sleep 1
curl -s -m 3 -X POST http://127.0.0.1:4000/api/v1/locations/getAllProvinces \
  -H 'Content-Type: application/json' -d '{}' | head -c 100; echo

echo "=== [2] dev server (:3000) ==="
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

echo "=== [3] صفحات ==="
fetch / /tmp/home.html
fetch /city /tmp/city-dir.html
fetch /city/tehran /tmp/city-tehran.html
fetch /city/hamedan /tmp/city-hamedan.html
MALAYER=$(node -e 'console.log(encodeURIComponent("ملایر"))')
fetch "/city/$MALAYER" /tmp/city-malayer.html
echo "404-check(/city/atlantis): $(curl -s -m 90 -o /dev/null -w '%{http_code}' 'http://localhost:3000/city/atlantis')"
fetch /sitemap.xml /tmp/sitemap.xml

echo "=== [4] assertions ==="
# ری‌اکت بین متن‌های مجاور <!-- --> می‌گذارد → قبل از grep حذف می‌شود
check() { if sed 's/<!-- -->//g' "$1" 2>/dev/null | grep -qF -- "$2"; then echo "  PASS: $3"; else echo "  FAIL: $3"; fi; }
check /tmp/home.html          'بازار عمده شهرها'      'صفحه اول: باکس شهرها'
check /tmp/home.html          '/city/tehran'          'صفحه اول: چیپ تهران'
check /tmp/city-dir.html       'بازار عمده شهرهای ایران'  'دایرکتوری: h1'
check /tmp/city-dir.html       'استان تهران'             'دایرکتوری: گروه استان تهران'
check /tmp/city-dir.html       "href=\"/city/$MALAYER\""  'دایرکتوری: لینک فارسی ملایر'
check /tmp/city-tehran.html    'بازار عمده تهران'         'تهران: h1'
check /tmp/city-tehran.html    'آگهی فعال'                'تهران: آمار آگهی'
check /tmp/city-tehran.html    'فروشندگان ویژه تهران'      'تهران: ریل VIP'
check /tmp/city-tehran.html    'رضا محمدی'                'تهران: VIP — رضا'
check /tmp/city-tehran.html    'اکبر حسنی'                'تهران: VIP — اکبر'
check /tmp/city-tehran.html    'برنج هاشمی درجه یک'        'تهران: کارت محصول'
check /tmp/city-tehran.html    'بازار عمده مشهد'          'تهران: لینک بقیه شهرها'
check /tmp/city-hamedan.html   'بازار عمده همدان'         'همدان: h1'
check /tmp/city-hamedan.html    'فروشندگان ویژه همدان'      'همدان: ریل VIP — جواد'
check /tmp/city-malayer.html   'بازار عمده ملایر'         'ملایر: h1 (URL فارسی)'
check /tmp/city-malayer.html   'ثبت نشده'                'ملایر: fallback'
check /tmp/city-malayer.html   'استان همدان'              'ملایر: fallback استان'
check /tmp/city-malayer.html    'برنج هاشمی اسانلو'      'ملایر: آگهی استان در fallback'
check /tmp/sitemap.xml          '/city/tehran'            'sitemap: بازار شهرها'
check /tmp/sitemap.xml          '/city/hamedan'          'sitemap: همدان'

echo "=== [5] اسکرین‌شات ==="
mkdir -p /tmp/shots
agent-browser set viewport 1440 900 2>/dev/null
agent-browser open http://localhost:3000/ 2>/dev/null && agent-browser wait --load networkidle 2>/dev/null
agent-browser screenshot /tmp/shots/home-desktop.png 2>/dev/null && echo "  home-desktop"
agent-browser open http://localhost:3000/city/tehran 2>/dev/null && agent-browser wait --load networkidle 2>/dev/null
agent-browser screenshot --full /tmp/shots/tehran-desktop.png 2>/dev/null && echo "  tehran-desktop"
agent-browser open http://localhost:3000/city 2>/dev/null && agent-browser wait --load networkidle 2>/dev/null
agent-browser screenshot --full /tmp/shots/city-dir-desktop.png 2>/dev/null && echo "  city-dir-desktop"
agent-browser set viewport 390 844 2>/dev/null
agent-browser open http://localhost:3000/ 2>/dev/null && agent-browser wait --load networkidle 2>/dev/null
agent-browser screenshot /tmp/shots/home-mobile.png 2>/dev/null && echo "  home-mobile"
agent-browser open http://localhost:3000/city/tehran 2>/dev/null && agent-browser wait --load networkidle 2>/dev/null
agent-browser screenshot --full /tmp/shots/tehran-mobile.png 2>/dev/null && echo "  tehran-mobile"
agent-browser errors 2>/dev/null || echo "  (no page errors)"
agent-browser close 2>/dev/null

echo "=== [6] لاگ‌ها ==="
echo "--- mock ---"; tail -3 /tmp/mock-city.log
echo "--- bun-dev (errors) ---"
grep -iE "error" /tmp/bun-dev.log | grep -viE "ECONNREFUSED|mock|catch" | tail -5 || echo "  (clean)"
echo "--- dev.log (errors) ---"
grep -iE "error" dev.log | grep -viE "ECONNREFUSED" | tail -8 || echo "  (clean)"

echo "=== DONE ==="
