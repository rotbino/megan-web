#!/bin/bash
# جستجو و دانلود تصاویر دسته‌بندی‌ها + هیرو + بنر — سپس بهینه‌سازی به webp سبک
set -u
OUT=/home/z/my-project/scripts/img-search
mkdir -p "$OUT"

declare -A Q=(
  [cat-agriculture]="iranian pistachio harvest agricultural products bulk"
  [cat-building]="construction building materials cement bricks stack"
  [cat-metals]="industrial metal steel coils factory minerals"
  [cat-fashion]="colorful fabric rolls textile wholesale"
  [cat-bags]="leather bags and shoes display"
  [cat-machinery]="industrial machinery factory equipment"
  [cat-food]="iranian food products groceries bulk dates nuts"
  [cat-cosmetics]="cosmetics skincare products bottles"
  [cat-electronics]="home appliances electronics store"
  [cat-sports]="sports equipment balls gifts"
)

run() {
  local key="$1"; local query="$2"
  z-ai image-search -q "$query" -c 3 --no-rank --gl us -o "$OUT/$key.json" >/dev/null 2>&1
}

# اجرای موازی (دسته‌ها)
for key in "${!Q[@]}"; do
  run "$key" "${Q[$key]}" &
done
wait
echo "search done"

# انتخاب اولین نتیجه و دانلود
python3 << 'EOF'
import json, os, urllib.request
OUT = '/home/z/my-project/scripts/img-search'
for f in sorted(os.listdir(OUT)):
    if not f.endswith('.json'): continue
    key = f[:-5]
    try:
        d = json.load(open(os.path.join(OUT, f)))
        if d.get('success') and d.get('results'):
            url = d['results'][0]['original_url']
            dest = os.path.join(OUT, key + '.img')
            urllib.request.urlretrieve(url, dest)
            print(key, 'OK', os.path.getsize(dest))
        else:
            print(key, 'FAIL', d.get('error', 'empty'))
    except Exception as e:
        print(key, 'ERR', e)
EOF
