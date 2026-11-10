#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""ویرایش جلد دفتر خرید: آواتار به‌جای لوگو + «مسوول خرید: نام» یک‌خطی (خواسته مالک ۱۱-۱۱)"""
import io, sys

P = '/home/z/my-project/src/components/buyer-book/public/book-public-content.tsx'
src = io.open(P, encoding='utf-8').read()

# ── ۱) بلوک لوگو/آواتار روی جلد: فقط تصویر پروفایل کاربر ──
old_logo = '''              {settings.logo ? (
                <img
                  src={settings.logo}
                  alt={`لوگوی ${buyerName}`}
                  className="size-full rounded-2xl border-4 border-card bg-card object-cover shadow-md"
                />
              ) : buyer.avatarUrl ? ('''
new_logo = '''              {buyer.avatarUrl ? ('''
assert old_logo in src, 'logo block not found'
src = src.replace(old_logo, new_logo, 1)

# کامنت بالای بلوک آواتار
old_c = '            {/* لوگو (تنظیمات دفتر) یا آواتار — روی جلد افتاده */}'
new_c = ('            {/* تصویر پروفایل کاربر — روی جلد افتاده (خواستهٔ مالک ۱۱-۱۱:\n'
         '                به‌جای لوگو، تصویر خود کاربر؛ لوگو رفته بالا روی بنر) */}')
assert old_c in src, 'logo comment not found'
src = src.replace(old_c, new_c, 1)

# ── ۲) سمت + نام: «مسوول خرید: نام» در یک خط — حذف پاراگراف جداگانهٔ سمت ──
# بخش سمت قدیمی (p جدا) + شروع h1
i_mgr = src.find('              {/* سمت مسئول خرید')
i_h1 = src.find('              <h1 className="flex min-w-0 flex-wrap items-center gap-2 text-xl')
assert i_mgr != -1 and i_h1 != -1 and i_mgr < i_h1, 'manager block not found'
# متن بین کامنت سمت تا شروع h1 را حذف و h1 جدید بساز
between = src[i_mgr:i_h1]
src = src[:i_mgr] + src[i_h1:]
# حالا h1 قدیمی: افزودن پیشوند «مسوول خرید:»
old_h1_open = '              <h1 className="flex min-w-0 flex-wrap items-center gap-2 text-xl font-extrabold leading-8 sm:text-2xl">\n                <span className="truncate">{buyerName}</span>'
new_h1_open = ('              <h1 className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xl font-extrabold leading-8 sm:text-2xl">\n'
               '                <span className="shrink-0 text-[13px] font-bold text-(--catalog-accent) sm:text-[15px]">\n'
               '                  مسوول خرید:\n'
               '                </span>\n'
               '                <span className="truncate">{buyerName}</span>')
assert old_h1_open in src, 'h1 open not found'
src = src.replace(old_h1_open, new_h1_open, 1)

# کامنت بخش سمت + نام
old_mc = '            {/* سمت + نام + متا */}'
new_mc = '            {/* سمت + نام + متا — «مسوول خرید: نام» در یک خط (خواستهٔ مالک ۱۱-۱۱) */}'
assert old_mc in src, 'meta comment not found'
src = src.replace(old_mc, new_mc, 1)

io.open(P, 'w', encoding='utf-8').write(src)
print('OK — cover edits applied')
