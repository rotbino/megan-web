#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""پیش‌نمایش مودال تنظیمات با طراحی جدید جلد (خواستهٔ مالک ۱۱-۱۱):
لوگو روی بنر، آواتار/حرف اول در ردیف هویت، «مسوول خرید: نام»، پیش‌فرض «دفتر خرید + کسب‌وکار»"""
import io

P = '/home/z/my-project/src/components/panel/buyer-book/book-settings-button.tsx'
src = io.open(P, encoding='utf-8').read()

a = '                  {/* پیش‌نمایش زندهٔ جلد دفتر — بنر عنوان‌دار + لوگو + سمت + نام */}'
b = '                  </div>\n\n              </div>\n\n              {/* ── فوتر فیکس — عین مودال کاتالوگ ── */}'
i, j = src.find(a), src.find(b)
assert i != -1 and j != -1 and i < j, 'preview block not found'

new_preview = '''                  {/* پیش‌نمایش زندهٔ جلد دفتر — طراحی جدید (خواستهٔ مالک ۱۱-۱۱):
                      لوگو روی بنر، تصویر پروفایل در ردیف هویت، «مسوول خرید: نام» */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold">پیش‌نمایش</p>
                    <div className="overflow-hidden rounded-lg border">
                      {/* بنر — لوگوی کسب‌وکار بالا + عنوان */}
                      <div
                        className="flex flex-col gap-1.5 px-3 py-2.5"
                        style={{
                          background: `linear-gradient(135deg, ${previewAccent} 0%, color-mix(in srgb, ${previewAccent} 72%, black) 100%)`,
                        }}
                      >
                        {logoDraft ? (
                          <img
                            src={logoDraft}
                            alt="لوگو"
                            className="size-8 w-fit rounded-lg border border-white/50 bg-white/90 object-cover"
                          />
                        ) : (
                          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-extrabold text-white">
                            <BookOpen size={9} strokeWidth={2.4} />
                            دفتر خرید
                          </span>
                        )}
                        <p className="line-clamp-2 whitespace-pre-line text-[11px] font-extrabold leading-5 text-white">
                          {bannerDraft.trim() ||
                            `دفتر خرید ${previewCompanyName || previewName}`}
                        </p>
                      </div>
                      {/* ردیف هویت — تصویر پروفایل + «مسوول خرید: نام» */}
                      <div className="flex items-center gap-2.5 bg-card px-3 py-2.5">
                        {user?.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt="تصویر پروفایل"
                            className="size-9 shrink-0 rounded-lg border object-cover"
                          />
                        ) : (
                          <span
                            className="grid size-9 shrink-0 place-items-center rounded-lg text-base font-black text-white shadow-sm"
                            style={{ backgroundColor: previewAccent }}
                          >
                            {previewName.charAt(0) || 'د'}
                          </span>
                        )}
                        <p className="min-w-0 truncate text-[13px] font-extrabold">
                          <span
                            className="text-[10px] font-bold"
                            style={{ color: colorDraft || 'var(--primary)' }}
                          >
                            مسوول خرید:{" "}
                          </span>
                          {previewName}
                        </p>
                        <span
                          className="ms-auto flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: previewAccent }}
                        >
                          <Bookmark size={12} />
                          ذخیره دفتر
                        </span>
                      </div>
                    </div>
                  </div>
'''
src = src[:i] + new_preview + '              </div>\n\n              {/* ── فوتر فیکس — عین مودال کاتالوگ ── */}' + src[j + len(b):]

# previewCompanyName — نام کسب‌وکار از پروفایل برای پیش‌فرض عنوان
anchor = "  const previewName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'نام شما';"
assert anchor in src
src = src.replace(anchor, anchor + "\n  // نام کسب‌وکار پروفایل — پیش‌فرض عنوان بنر «دفتر خرید + کسب‌وکار» (خواستهٔ مالک ۱۱-۱۱)\n  const previewCompanyName = profile?.profile.companyName?.trim() || '';", 1)

io.open(P, 'w', encoding='utf-8').write(src)
print('OK — preview redesigned')
