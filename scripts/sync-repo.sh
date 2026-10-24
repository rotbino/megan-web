#!/bin/bash
# همگام‌سازی کپی تمیز ریپو megan-web — با حفظ فایل‌های کاربر (fonts/icons/logos/sw.js/.idea)
set -euo pipefail
SRC=/home/z/my-project
DST=/home/z/my-project/repos/megan-web

# ۱) سورس کامل (rsync بدون حذف فایل‌های موجود مثل src/fonts)
rsync -a --delete \
  --exclude 'fonts/' \
  "$SRC/src/" "$DST/src/"
# فونت‌ها را دستی کپی کن (نه حذف)
mkdir -p "$DST/src/fonts"
cp -f "$SRC"/src/fonts/*.woff "$SRC"/src/fonts/*.woff2 "$DST/src/fonts/" 2>/dev/null || true

# ۲) public (بدون حذف: icons/, logo*.svg, sw.js, push-icon.png — فایل‌های کاربر)
mkdir -p "$DST/public/images/categories"
cp -f "$SRC"/public/images/hero.webp "$DST/public/images/" 2>/dev/null || true
cp -f "$SRC"/public/images/categories/*.webp "$DST/public/images/categories/" 2>/dev/null || true
cp -f "$SRC"/public/manifest.webmanifest "$DST/public/" 2>/dev/null || true
# robots.ts حالا از اپ می‌آید — اگر فایل استاتیک قدیمی هست حذف کن
rm -f "$DST/public/robots.txt" 2>/dev/null || true

# ۳) فایل‌های ریشه
for f in next.config.ts postcss.config.mjs eslint.config.mjs tailwind.config.ts tsconfig.json components.json next-env.d.ts; do
  [ -f "$SRC/$f" ] && cp -f "$SRC/$f" "$DST/$f"
done

# ۴) package.json با نام imach-web
python3 << 'EOF'
import json
pkg = json.load(open('/home/z/my-project/package.json'))
rep = {
    'name': 'imach-web',
    'version': pkg.get('version', '0.1.0'),
    'private': True,
    'scripts': {
        'dev': 'next dev -p 3000',
        'build': 'next build',
        'start': 'next start -p 3000',
        'lint': 'eslint src --ext .ts,.tsx',
    },
}
# وابستگی‌های واقعاً مورد استفاده فرانت‌اند
rep['dependencies'] = {k: v for k, v in pkg['dependencies'].items() if not k.startswith('@mdxeditor')}
json.dump(rep, open('/home/z/my-project/repos/megan-web/package.json', 'w'), indent=2, ensure_ascii=False)
print('package.json written:', rep['name'])
EOF

echo "✓ sync done"
