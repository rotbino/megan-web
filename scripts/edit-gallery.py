#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""انتقال تصاویر/مجوزها از سایدبار به انتهای دفتر (خواسته مالک ۱۱-۱۱) + فیلدهای غنی‌شده در سایدبار"""
import io

P = '/home/z/my-project/src/components/buyer-book/public/book-public-content.tsx'
src = io.open(P, encoding='utf-8').read()

# ── ۱) حذف بلوک تصاویر/مجوزها از سایدبار (از کامنت تا پایان شرطی) ──
start_marker = '          {/* تصاویر و مجوزهای کسب‌وکار — عین کاتالوگ */}'
end_marker = '        </aside>'
i_start = src.find(start_marker)
i_end = src.find(end_marker)
assert i_start != -1 and i_end != -1 and i_start < i_end, 'sidebar gallery block not found'
src = src[:i_start] + src[i_end:]

# ── ۲) سایدبار: توضیحات و آدرس از فیلدهای غنی‌شده ──
old_desc = "              {buyer.businessDesc?.trim() || 'این خریدار هنوز توضیحی برای کسب‌وکارش ننوشته است.'}"
new_desc = "              {businessDesc || 'این خریدار هنوز توضیحی برای کسب‌وکارش ننوشته است.'}"
assert old_desc in src, 'businessDesc not found'
src = src.replace(old_desc, new_desc, 1)

old_addr = '''              {buyer.address?.trim() && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin size={13} className="shrink-0 text-(--catalog-accent)/70" />
                  <dt className="shrink-0">آدرس:</dt>
                  <dd className="truncate font-bold text-foreground" title={buyer.address}>{buyer.address}</dd>
                </div>
              )}'''
new_addr = '''              {address && (
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <MapPin size={13} className="shrink-0 text-(--catalog-accent)/70" />
                  <dt className="shrink-0">آدرس:</dt>
                  <dd className="truncate font-bold text-foreground" title={address}>{address}</dd>
                </div>
              )}'''
assert old_addr in src, 'address block not found'
src = src.replace(old_addr, new_addr, 1)

# ── ۳) بخش انتهایی: تصاویر و مجوزها بعد از نظرات، تمام‌عرض ──
anchor = '      {/* ─── امضای iMach — عین کاتالوگ ─── */}'
assert anchor in src, 'footer anchor not found'
bottom_section = '''      {/* ─── تصاویر و مجوزهای کسب‌وکار (خواستهٔ مالک ۱۱-۱۱: در انتهای دفتر،
              تمام‌عرض — هر اطلاعات کامل‌تری از خریدار، تماس فروشنده را آسان‌تر
              می‌کند؛ در نبودِ فیلدهای دفتر، از پروفایل عمومی getSeller می‌آید) ─── */}
      {(gallery.length > 0 || certificates.length > 0) && (
        <section id="buyer-gallery" aria-labelledby="buyer-gallery-title" className="mt-8 scroll-mt-24">
          <h2 id="buyer-gallery-title" className="mb-3 flex items-center gap-2 text-base font-extrabold">
            <span className="grid size-7 place-items-center rounded-lg bg-(--catalog-accent)/10 text-(--catalog-accent)">
              <Camera size={15} />
            </span>
            تصاویر و مجوزهای کسب و کار
          </h2>

          {gallery.length > 0 && (
            <div>
              <h3 className="mb-2 text-xs font-bold text-muted-foreground">تصاویر کسب و کار</h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {gallery.map((g, i) => (
                  <a
                    key={`${g.url}-${i}`}
                    href={g.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block aspect-square overflow-hidden rounded-lg border bg-secondary"
                    title="مشاهده تصویر کامل"
                  >
                    <img
                      src={g.thumbUrl ?? g.url}
                      alt={`تصویر کسب‌وکار ${i + 1}`}
                      className="size-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}

          {certificates.length > 0 && (
            <div className={gallery.length > 0 ? 'mt-5 border-t pt-5' : ''}>
              <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                <FileCheck2 size={13} className="text-(--catalog-accent)/70" />
                مجوزها و گواهی‌ها
              </h3>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {certificates.map((c, i) => (
                  <a
                    key={`${c.url}-${i}`}
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative block aspect-square overflow-hidden rounded-lg border bg-secondary"
                    title="مشاهده مجوز کامل"
                  >
                    <img
                      src={c.thumbUrl ?? c.url}
                      alt={`مجوز ${i + 1}`}
                      className="size-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  </a>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

'''
src = src.replace(anchor, bottom_section + anchor, 1)

io.open(P, 'w', encoding='utf-8').write(src)
print('OK — gallery moved to bottom, sidebar enriched')
