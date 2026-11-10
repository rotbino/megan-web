#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""بازطراحی مینیمال مودال تنظیمات دفتر خرید (خواستهٔ مالک ۱۱-۱۱):
- متن معرفی جدید
- حذف فیلد «سمت شما» (سمت ثابت «مسوول خرید» شد)
- حذف متن‌های راهنما (عنوان بنر / شرایط تامین / لوگو / لینک)
- شرایط تامین: بلندتر + فونت کوچک غیربولد
- فرم تخت و مینیمال (حذف باکس‌های بخش)
- پیش‌نمایش با طراحی جدید جلد (لوگو روی بنر، آواتار، پیش‌فرض «دفتر خرید + کسب‌وکار»)"""
import io, re

P = '/home/z/my-project/src/components/panel/buyer-book/book-settings-button.tsx'
src = io.open(P, encoding='utf-8').read()

def cut(a, b, src, what):
    """حذف بازه از a تا b (شامل هر دو) — b بعد از a جستجو می‌شود"""
    i = src.find(a)
    assert i != -1, f'{what}: start not found'
    j = src.find(b, i + len(a))
    assert j != -1, f'{what}: end not found'
    return src[:i] + src[j + len(b):]

def repl(old, new, src, what, count=1):
    assert old in src, f'{what} not found'
    return src.replace(old, new, count)

# ── ۱) متن معرفی مودال ──
i = src.find('<DialogDescription className="text-start leading-5">')
j = src.find('</DialogDescription>')
assert i != -1 and j != -1
src = src[:i] + ('<DialogDescription className="text-start leading-5">\n'
                 '              تامین‌کنندگان با مشاهده دفتر خرید شما می‌توانند قیمت‌ها و پیشنهادات رقابتی خود را برای شما ارسال کنند.\n'
                 '            ') + src[j:]

# ── ۲) حذف state سمت ──
src = repl("  const [managerDraft, setManagerDraft] = useState('');\n", '', src, 'manager state')
src = repl('    setManagerDraft(settings.managerTitle ?? \'\');\n', '', src, 'manager seed')

# dirty: حذف خط managerTitle
m = re.search(r'\n *\(managerDraft\.trim\(\) \|\| null\) !== \(settings\.managerTitle \?\? null\)', src)
assert m, 'dirty manager line not found'
src = src[:m.start()] + src[m.end():]

# save payload: حذف بلوک managerTitle
src = cut("        ...((managerDraft.trim() || null) !== (settings?.managerTitle ?? null)",
          "          : {}),\n", src, 'save manager payload')

# ── ۳) حذف فیلد «سمت شما» کامل (از کامنت تا پایان div فیلد) ──
a = '                  {/* سمت مسئول خرید — کنار نام */}'
b = '                  {/* شرایط تامین — متن دلخواه برای تامین‌کنندگان (اختیاری) */}'
src = cut(a, b, src, 'manager field')

# ── ۴) حذف راهنمای عنوان بنر ──
a = "                    <p className=\"text-[10.5px] leading-5 text-muted-foreground\">\n                      روی جلد دفتر، بزرگ و با رنگ برندتان دیده می‌شود؛"
i = src.find(a)
assert i != -1, 'banner help not found'
j = src.find('</p>', i) + len('</p>\n')
src = src[:i] + src[j:]

# ── ۵) شرایط تامین: بلندتر + فونت کوچک غیربولد + حذف راهنما ──
src = repl('                      rows={4}\n                      className="rounded-md text-xs leading-6"',
           '                      rows={7}\n                      className="resize-none rounded-md text-[11px] font-normal leading-6"',
           src, 'terms textarea')
a = "                    <p className=\"text-[10.5px] leading-5 text-muted-foreground\">\n                      هر شرط یا توضیحی که تامین‌کنندگان باید"
i = src.find(a)
assert i != -1, 'terms help not found'
j = src.find('</p>', i) + len('</p>\n')
src = src[:i] + src[j:]

# ── ۶) حذف راهنمای لوگو (در LogoBox) ──
a = '        <p className="text-[10.5px] leading-5 text-muted-foreground">\n          لوگو در هدر و جلد دفتر شما می‌نشیند؛'
i = src.find(a)
assert i != -1, 'logo help not found'
j = src.find('</p>', i) + len('</p>\n')
src = src[:i] + src[j:]

# ── ۷) حذف راهنمای لینک دفتر ──
a = '                  <p className="text-[11.5px] leading-5 text-muted-foreground">\n                    لینک دفتر برای فروشندگانی که'
i = src.find(a)
assert i != -1, 'link help not found'
j = src.find('</p>', i) + len('</p>\n')
src = src[:i] + src[j:]

# ── ۸) فرم تخت: حذف باکس «متن‌های دفتر» (کامنت + wrapper) ──
# پیدا کردن شروع باکس متن‌ها و پایان آن (قبل از باکس برند)
a = '                {/* ── متن‌های دفتر'
b = '                {/* ── برند و ظاهر ── */}'
i, j = src.find(a), src.find(b)
assert i != -1 and j != -1 and i < j, 'text section not found'
# داخل باکس متن‌ها: از پایان هدر باکس تا شروع باکس برند — فیلدها را نگه می‌داریم
box = src[i:j]
# حذف wrapper شروع: از کامعت تا پایان <p>متن‌های دفتر</p>
k = box.find('<p className="flex items-center gap-2 text-sm font-bold">')
assert k != -1
k2 = box.find('</p>', k) + len('</p>\n')
inner = box[k2:]
# حذف div بستهٔ باکس متن‌ها در انتهای inner (آخرین </div> قبل از باکس برند) —
# inner با «</div>\n\n» تمام می‌شود (بستهٔ باکس)؛ آن را برمی‌داریم
inner_stripped = inner.rstrip()
assert inner_stripped.endswith('</div>'), 'unexpected section end'
inner_stripped = inner_stripped[:-len('</div>')].rstrip() + '\n'
src = src[:i] + inner_stripped + '\n' + src[j:]

# ── ۹) حذف باکس «برند و ظاهر دفتر» (همان الگو) ──
a = '                {/* ── برند و ظاهر ── */}'
b = '              </div>\n\n              {/* ── فوتر فیکس — عین مودال کاتالوگ ── */}'
i, j = src.find(a), src.find(b)
assert i != -1 and j != -1 and i < j, 'brand section not found'
box = src[i:j]
k = box.find('<p className="flex items-center gap-2 text-sm font-bold">')
assert k != -1
k2 = box.find('</p>', k) + len('</p>\n')
inner = box[k2:]
inner_stripped = inner.rstrip()
assert inner_stripped.endswith('</div>'), 'unexpected brand section end'
inner_stripped = inner_stripped[:-len('</div>')].rstrip() + '\n'
src = src[:i] + inner_stripped + '\n' + src[j:]

io.open(P, 'w', encoding='utf-8').write(src)
print('OK — modal minimal redesign applied')
