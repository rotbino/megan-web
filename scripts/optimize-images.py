#!/usr/bin/env python3
"""دانلود تصاویر جستجو‌شده و بهینه‌سازی به webp سبک برای دسته‌بندی‌ها و هیرو"""
import json, os, io, urllib.request
from PIL import Image

SRC = '/home/z/my-project/scripts/img-search'
DST = '/home/z/my-project/public/images'
os.makedirs(f'{DST}/categories', exist_ok=True)

def fetch(url):
    with urllib.request.urlopen(url, timeout=60) as r:
        return r.read()

def to_webp(data, dest, size, quality=72):
    im = Image.open(io.BytesIO(data)).convert('RGB')
    im = im.resize(size, Image.LANCZOS)
    im.save(dest, 'WEBP', quality=quality, method=6)
    return os.path.getsize(dest)

# دسته‌ها: مربع کوچک ۲۴۰×۲۴۰
CATS = ['cat-agriculture', 'cat-building', 'cat-metals', 'cat-fashion', 'cat-bags',
        'cat-machinery', 'cat-food', 'cat-cosmetics', 'cat-electronics', 'cat-sports']
for key in CATS:
    jp = f'{SRC}/{key}.json'
    if not os.path.exists(jp):
        print(key, 'NO JSON'); continue
    d = json.load(open(jp))
    if not d.get('success') or not d.get('results'):
        print(key, 'EMPTY'); continue
    dest = f'{DST}/categories/{key.replace("cat-", "")}.webp'
    for res in d['results'][:3]:
        try:
            sz = to_webp(fetch(res['original_url']), dest, (240, 240))
            print(key, '->', sz, 'bytes')
            break
        except Exception as e:
            print(key, 'retry', str(e)[:60])

# هیرو: عریض 1600×640
d = json.load(open(f'{SRC}/hero.json'))
if d.get('success') and d.get('results'):
    dest = f'{DST}/hero.webp'
    for res in d['results'][:3]:
        try:
            sz = to_webp(fetch(res['original_url']), dest, (1600, 640), quality=68)
            print('hero ->', sz, 'bytes'); break
        except Exception as e:
            print('hero retry', str(e)[:60])
