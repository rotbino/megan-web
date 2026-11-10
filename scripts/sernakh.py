#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ادبیات «سرنخ» (خواسته مالک ۸-۱۱) — جایگزینی «پیگیری» (شیء) با «سرنخ»
در کل رابط؛ «پیگیری» فقط برای عمل (پیگیری سرنخ) می‌ماند."""

import io, os

ROOT = '/home/z/my-project/megan-web'

def sub(path, pairs):
    full = os.path.join(ROOT, path)
    src = io.open(full, encoding='utf-8').read()
    missing = []
    for old, new in pairs:
        if old not in src:
            missing.append(old)
        else:
            src = src.replace(old, new)
    io.open(full, 'w', encoding='utf-8').write(src)
    status = 'OK' if not missing else 'PARTIAL'
    print(f'[{status}] {path}')
    for m in missing:
        print('   MISSING:', m[:70])

# ─── سایدبار پنل: لینک نقش‌محور ───────────────────────────────────────────
src = io.open(os.path.join(ROOT, 'src/components/panel/panel-sidebar.tsx'), encoding='utf-8').read()
src = src.replace("{ href: '/panel/saved', label: 'پیگیری ها', icon: Bookmark },",
                  "{ href: '/panel/saved', label: 'سرنخ‌های فروش', icon: Bookmark },", 1)
src = src.replace("{ href: '/panel/saved', label: 'پیگیری ها', icon: Bookmark },",
                  "{ href: '/panel/saved', label: 'سرنخ‌های خرید', icon: Bookmark },", 1)
io.open(os.path.join(ROOT, 'src/components/panel/panel-sidebar.tsx'), 'w', encoding='utf-8').write(src)
print('[OK] panel-sidebar.tsx')

# ─── صفحهٔ آیمچ من: سه‌تای مهم خریدار (سرنخ‌های خرید) + منوی فروشنده (فروش) ──
src = io.open(os.path.join(ROOT, 'src/app/panel/page.tsx'), encoding='utf-8').read()
src = src.replace("{ href: '/panel/saved', label: 'پیگیری ها', icon: Bookmark },",
                  "{ href: '/panel/saved', label: 'سرنخ‌های خرید', icon: Bookmark },", 1)
src = src.replace("{ href: '/panel/saved', label: 'پیگیری ها', icon: Bookmark },",
                  "{ href: '/panel/saved', label: 'سرنخ‌های فروش', icon: Bookmark },", 1)
io.open(os.path.join(ROOT, 'src/app/panel/page.tsx'), 'w', encoding='utf-8').write(src)
print('[OK] panel/page.tsx')

# ─── دکمهٔ ذخیره + شیت/مودال CRM ──────────────────────────────────────────
sub('src/components/panel/follow/save-follow-button.tsx', [
    ("aria-label={item ? 'مدیریت پیگیری' : 'ذخیره در پیگیری‌ها'}",
     "aria-label={item ? 'مدیریت سرنخ' : `ایجاد سرنخ ${leadKind}`}"),
    ("title={item ? 'مدیریت پیگیری' : 'ذخیره در پیگیری‌ها'}",
     "title={item ? 'مدیریت سرنخ' : `ایجاد سرنخ ${leadKind}`}"),
    ("{item ? 'در پیگیری‌ها' : 'ذخیره در پیگیری‌ها'}",
     "{item ? 'سرنخ فعال' : `ایجاد سرنخ ${leadKind}`}"),
    ("{item ? 'در پیگیری' : 'ذخیره'}",
     "{item ? 'سرنخ فعال' : 'ایجاد سرنخ'}"),
    ("const iconSize = variant === 'block' ? 16 : variant === 'icon' ? 20 : 14;",
     "const iconSize = variant === 'block' ? 16 : variant === 'icon' ? 20 : 14;\n"
     "  // ادبیات سرنخ (خواسته مالک ۸-۱۱): ذخیرهٔ درخواست خرید = سرنخ فروش؛ آگهی = سرنخ خرید\n"
     "  const leadKind = targetType === 'buy_request' ? 'فروش' : 'خرید';"),
    ("toast({ description: 'از پیگیری‌ها حذف شد.' });",
     "toast({ description: 'سرنخ حذف شد.' });"),
    ("اولین پروندهٔ پیگیری‌تان را بسازید",
     "اولین پروندهٔ سرنخ‌تان را بسازید"),
    ("ذخیره در پیگیری",
     "ثبت سرنخ"),
    ("toast({ description: `در پروندهٔ «${saved.folderName}» ذخیره شد.` });",
     "toast({ description: `سرنخ در پروندهٔ «${saved.folderName}» ثبت شد.` });"),
    ("حذف از پیگیری",
     "حذف سرنخ"),
    ("? 'افزودن به پیگیری'",
     "? `ایجاد سرنخ ${leadKind}`"),
    ("? 'وضعیت و یادداشت'",
     "? 'وضعیت سرنخ'"),
    (": 'مدیریت پیگیری';",
     ": `مدیریت سرنخ ${leadKind}`;"),
])

# ─── مدال جزئیات ──────────────────────────────────────────────────────────
sub('src/components/panel/follow/follow-detail-modal.tsx', [
    ("<FollowLabel>وضعیت پیگیری</FollowLabel>", "<FollowLabel>وضعیت سرنخ</FollowLabel>"),
    ("<Trash2 size={14} /> حذف از پیگیری", "<Trash2 size={14} /> حذف سرنخ"),
    ('title="جزئیات پیگیری"', 'title="جزئیات سرنخ"'),
    ('aria-label="جزئیات پیگیری"', 'aria-label="جزئیات سرنخ"'),
    ('>جزئیات پیگیری</h2>', '>جزئیات سرنخ</h2>'),
])

# ─── شیت عملیات سه‌نقطه ───────────────────────────────────────────────────
sub('src/components/panel/follow/follow-action-sheet.tsx', [
    ("toast({ description: 'از پیگیری‌ها حذف شد.' });",
     "toast({ description: 'سرنخ حذف شد.' });"),
    ('<MenuRow icon={Trash2} label="حذف از پیگیری" danger',
     '<MenuRow icon={Trash2} label="حذف سرنخ" danger'),
    ("اولویت بالا در لیست پیگیری‌ها بالاتر نشان داده می‌شود",
     "اولویت بالا در لیست سرنخ‌ها بالاتر نشان داده می‌شود"),
    ("? 'عملیات پیگیری'", "? 'عملیات سرنخ'"),
    (": 'حذف از پیگیری';", ": 'حذف سرنخ';"),
])

# ─── چیپ‌های وضعیت/اولویت (آریا) ─────────────────────────────────────────
sub('src/components/panel/follow/follow-parts.tsx', [
    ('aria-label="اولویت پیگیری"', 'aria-label="اولویت سرنخ"'),
    ('aria-label="وضعیت پیگیری"', 'aria-label="وضعیت سرنخ"'),
])

# ─── صفحهٔ /panel/saved ───────────────────────────────────────────────────
sub('src/app/panel/saved/page.tsx', [
    ('>پیگیری‌ها</h1>', '>سرنخ‌ها</h1>'),
    ('پیگیری امروز سررسیده است', 'سرنخ برای پیگیری امروز دارید'),
    ('امروز پیگیری سررسیده‌ای ندارید', 'امروز سرنخی برای پیگیری ندارید'),
    ('aria-label="جستجو در پیگیری‌ها"', 'aria-label="جستجو در سرنخ‌ها"'),
    ('sheetTitle="وضعیت پیگیری"', 'sheetTitle="وضعیت سرنخ"'),
    ('هنوز چیزی را پیگیری نمی‌کنید.', 'هنوز سرنخی ندارید.'),
    ('روی دکمهٔ «ذخیره» در کارت خریداران یا آگهی‌ها بزنید',
     'روی دکمهٔ «ایجاد سرنخ» در کارت خریداران یا آگهی‌ها بزنید'),
])

print('done')
