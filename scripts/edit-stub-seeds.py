#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""به‌روزرسانی seed های استاب (خواستهٔ مالک ۱۱-۱۱):
- حذف bannerTitleSeed های buyer1/ME تا پیش‌فرض جدید «دفتر خرید + کسب‌وکار» دیده شود
- حذف managerTitle از همهٔ seedها (سمت ثابت «مسوول خرید» شد)
- کسب‌وکار برای seller0 (تولیدی آریا — مثال خود مالک)"""
import io

P = '/home/z/my-project/scripts/stub-backend.mjs'
src = io.open(P, encoding='utf-8').read()

# ── ۱) seed تنظیمات buyer1: بدون عنوان بنر و سمت — پیش‌فرض جدید دیده شود ──
old1 = """BUYER_BOOK_SETTINGS.set('buyer1', {
  bookId: 'phaksh-seyyed', brandColor: '#0891b2', logo: null,
  bannerTitle: 'خریدهای دوره‌ای شرکت آرمان؛ لطفا پیشنهادهای تامین خود را ارسال کنید.',
  managerTitle: 'مسوول خرید',
  supplyTerms:"""
new1 = """BUYER_BOOK_SETTINGS.set('buyer1', {
  bookId: 'phaksh-seyyed', brandColor: '#0891b2', logo: null,
  supplyTerms:"""
assert old1 in src, 'buyer1 seed not found'
src = src.replace(old1, new1, 1)

# ── ۲) buyer2: حذف سمت ──
old2 = """  bannerTitle: 'تامین هفتگی مغازه مواد غذایی کریمی — منتظر پیشنهاد قیمت شما هستیم.',
  managerTitle: 'مدیر مغازه',
});"""
new2 = """  bannerTitle: 'تامین هفتگی مغازه مواد غذایی کریمی — منتظر پیشنهاد قیمت شما هستیم.',
});"""
assert old2 in src, 'buyer2 seed not found'
src = src.replace(old2, new2, 1)

# ── ۳) ME: بدون عنوان بنر (پیش‌فرض «دفتر خرید تولیدی آریا») + شرایط تامین نمونه ──
old3 = """BUYER_BOOK_SETTINGS.set(ME.userName, {
  bannerTitle: 'خریدهای دوره‌ای فروشگاه من — لطفا پیشنهادهای تامین خود را ارسال کنید.',
});"""
new3 = """BUYER_BOOK_SETTINGS.set(ME.userName, {
  supplyTerms: 'فقط تولیدکنندگان پیشنهاد تامین ارسال کنند.\\nهزینه حمل بر عهده تامین‌کننده است.',
});"""
assert old3 in src, 'ME seed not found'
src = src.replace(old3, new3, 1)

# ── ۴) کسب‌وکار seller0 (کاربر نشست) — مثال خود مالک: تولیدی آریا ──
old4 = """      responseRate: 92,
      productCount: 0,
      totalStock: 0,
      products: [],"""
new4 = """      responseRate: 92,
      productCount: 0,
      totalStock: 0,
      // کسب‌وکار کاربر نشست (خواستهٔ مالک ۱۱-۱۱) — پیش‌فرض عنوان بنرِ دفترِ
      // خودش «دفتر خرید تولیدی آریا» می‌شود
      isCompany: true,
      companyName: 'تولیدی آریا',
      businessCategory: 'تولید و پخش مواد غذایی',
      address: 'همدان، شهرک صنعتی، خیابان سوم',
      products: [],"""
assert old4 in src, 'seller0 entry not found'
src = src.replace(old4, new4, 1)

io.open(P, 'w', encoding='utf-8').write(src)
print('OK — stub seeds updated')
