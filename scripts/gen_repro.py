#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""تولید repro استاتیک صفحهٔ /panel/messages با CSS کامپایل‌شدهٔ خود پروژه —
برای تست بصری اسکرول داخلی چت و ثابت‌ماندن هدر."""

CONTACTS = [
    ("پشتیبانی ایمچ", "پیام‌های مدیریت ایمچ اینجا می‌آید", True),
    ("علی رضایی", "قیمت هر کیلو: ۱۵٬۰۰۰ تومان", False),
    ("محمد کریمی", "سلام، موجودی دارید؟", False),
    ("حسین احمدی", "تا آخر هفته ارسال می‌کنم", False),
    ("رضا محمدی", "چند روزه تحویل می‌دید؟", False),
    ("مریم صادقی", "فاکتور رسمی میدید؟", False),
    ("جواد نوری", "نمونه دارید بفرستید؟", False),
    ("سعید باقری", "قیمت پایه چنده؟", False),
    ("فاطمه یزدی", "سلام وقت بخیر", False),
    ("امیر حسینی", "برای ۲ تن چطوره؟", False),
    ("ناصر قمی", "تخفیف حجمی دارید؟", False),
    ("لیلا سلطانی", "آدرس انبار کجاست؟", False),
    ("بهرام رستمی", "پرداخت امن ایمچ اوکیه؟", False),
    ("مهدی توکلی", "لیست قیمت جدید رو زدم", False),
    ("زهرا موسوی", "مرسی از پیگیری", False),
    ("کامران عزیزی", "فردا تماس می‌گیرم", False),
    ("یدالله شریفی", "حمل با شما یا با ما؟", False),
    ("پیمان فرهادی", "قرارداد امضا شد", False),
]

MSGS = [
    ("them", "سلام وقت بخیر"),
    ("me", "سلام، خوش آمدید"),
    ("them", "مایلم دربارهٔ قیمت عمده صحبت کنیم"),
    ("me", "بفرمایید، برای چه حجمی؟"),
    ("them", "حدود ۵۰۰ کیلو شروع"),
    ("me", "برای این حجم قیمت ویژه داریم"),
    ("me", "قیمت هر کیلو: ۱۴٬۵۰۰ تومان"),
    ("them", "برای ۱ تن چطور می‌شه؟"),
    ("me", "۱ تن بشه ۱۳٬۸۰۰"),
    ("them", "ارسال به تهران چند روزه؟"),
    ("me", "۴۸ ساعته با باربری قراردادی"),
    ("them", "هزینهٔ حمل با کیست؟"),
    ("me", "تا انبار تهران با ماست"),
    ("them", "عالی، نمونه هم می‌فرستید؟"),
    ("me", "چرا، آدرس بفرمایید"),
    ("them", "تهران، بازار بزرگ، راستهٔ ۳"),
    ("me", "ثبت شد؛ تا فردا عصر می‌رسد"),
    ("them", "پرداخت امن ایمچ امکانش هست؟"),
    ("me", "بله، لینک پرداخت امن می‌سازم"),
    ("them", "ممنون از راهنمایی"),
    ("me", "قربانتون، در خدمتیم"),
    ("them", "یک سوال دیگه هم داشتم"),
    ("them", "برای سفارش ماهانه تخفیف دارید؟"),
    ("me", "بله، قرارداد ماهانه ۵٪ جایزه داره"),
    ("them", "خیلی خوبه"),
    ("me", "پیش‌فاکتور رو براتون می‌فرستم"),
    ("them", "الان چک می‌کنم"),
    ("me", "هر وقت آماده بودید خبر بدید"),
    ("them", "پرداخت انجام شد"),
    ("me", "دریافت شد، ممنون! سفارش ثبت شد و فردا ارسال می‌شود."),
]

contacts_html = []
for i, (name, last, is_support) in enumerate(CONTACTS):
    if is_support:
        contacts_html.append(f'''
      <li class="pb-1">
        <button type="button" class="flex w-full items-center gap-3 rounded-md px-2 py-3 text-start transition-colors bg-primary/10">
          <span class="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">H</span>
          <span class="min-w-0 flex-1">
            <span class="flex items-center justify-between gap-2">
              <span class="truncate text-sm font-bold text-primary">{name}</span>
              <span class="shrink-0 text-[10px] text-muted-foreground">۲ روز پیش</span>
            </span>
            <span class="mt-0.5 flex items-center justify-between gap-2">
              <span class="truncate text-xs text-muted-foreground">{last}</span>
              <span class="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">۲</span>
            </span>
          </span>
        </button>
      </li>''')
    else:
        contacts_html.append(f'''
      <li>
        <button type="button" class="flex w-full items-center gap-3 rounded-md px-2 py-3 text-start transition-colors {'bg-primary/10' if i == 2 else 'hover:bg-secondary/70'}">
          <span class="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-xs font-extrabold">{name[0]}</span>
          <span class="min-w-0 flex-1">
            <span class="flex items-center justify-between gap-2">
              <span class="truncate text-sm font-bold">{name}</span>
              <span class="shrink-0 text-[10px] text-muted-foreground">۱۰:۳۰</span>
            </span>
            <span class="mt-0.5 flex items-center justify-between gap-2">
              <span class="truncate text-xs text-muted-foreground">{last}</span>
            </span>
          </span>
        </button>
      </li>''')

msgs_html = []
for i, (who, text) in enumerate(MSGS):
    mine = who == "me"
    base = "w-fit whitespace-pre-wrap break-words shadow-sm transition-colors max-w-[85%] rounded-xl px-3 py-2 text-[13px] leading-6 sm:max-w-[75%] sm:rounded-2xl sm:px-4 sm:py-2.5 sm:text-[13.5px] sm:leading-7"
    tone = "rounded-br-md border border-primary/25 bg-primary/15 text-foreground" if mine else "rounded-bl-md border border-border/70 bg-card text-foreground"
    check = '<span class="ms-1.5 inline-flex translate-y-px items-center align-middle text-[10px] font-medium text-primary sm:ms-2">✓✓</span>' if mine and i > 5 else ""
    msgs_html.append(f'''
              <div class="flex w-full {'justify-end' if mine else 'justify-start'}">
                <div dir="auto" class="{base} {tone}">{text}{check}</div>
              </div>''')

html = f'''<!DOCTYPE html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>repro — پیام‌ها</title>
<link rel="stylesheet" href="app.css">
<style>
  body {{ margin: 0; }}
</style>
</head>
<body class="font-sans antialiased bg-background text-foreground">
  <!-- ریشهٔ layout.tsx -->
  <div class="flex min-h-screen flex-col">
    <!-- PanelShell -->
    <div class="min-h-screen bg-background lg:flex lg:h-dvh lg:min-h-0 lg:flex-col">
      <!-- سایدبار دسکتاپ (ساده‌شده) -->
      <aside class="fixed inset-y-0 right-0 z-30 hidden w-[250px] flex-col border-s border-border bg-card lg:flex">
        <div class="flex h-[59px] shrink-0 items-center gap-2 border-b border-border px-4 font-extrabold">آیمچ من</div>
        <div class="flex min-h-0 flex-1 flex-col overflow-y-auto p-3 text-sm">
          <div class="rounded-md bg-secondary px-3 py-2 font-bold">داشبورد</div>
          <div class="mt-1 rounded-md px-3 py-2 text-muted-foreground">محصولات من</div>
          <div class="mt-1 rounded-md px-3 py-2 text-muted-foreground">خریداران</div>
          <div class="mt-1 rounded-md bg-primary/10 px-3 py-2 font-bold text-primary">پیام‌ها</div>
          <div class="mt-1 rounded-md px-3 py-2 text-muted-foreground">درخواست‌های خرید</div>
          <div class="mt-1 rounded-md px-3 py-2 text-muted-foreground">کیف پول</div>
          <div class="mt-1 rounded-md px-3 py-2 text-muted-foreground">پروفایل</div>
          <div class="mt-1 rounded-md px-3 py-2 text-muted-foreground">پشتیبانی</div>
          <div class="mt-1 rounded-md px-3 py-2 text-muted-foreground">نظرسنجی</div>
        </div>
      </aside>

      <!-- هدر موبایل پنل -->
      <header class="sticky top-0 z-20 flex h-14 items-center gap-2.5 border-b border-border bg-background px-3 shadow-[0_1px_5px_rgba(0,0,0,0.06)] lg:hidden">
        <span class="flex shrink-0 items-center text-xl font-black text-primary">M</span>
        <h1 class="truncate text-[15px] font-extrabold leading-none">پیام‌ها</h1>
      </header>

      <!-- ناحیهٔ محتوا -->
      <div class="min-w-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:mr-[250px]">
        <!-- هدر دسکتاپ -->
        <div class="mb-5 hidden h-[59px] shrink-0 items-center justify-between gap-3 border-b border-border bg-background px-6 shadow-[0_1px_5px_rgba(0,0,0,0.06)] lg:flex">
          <div class="flex min-w-0 items-center gap-3">
            <h1 class="truncate text-[15px] font-extrabold leading-none">پیام‌ها</h1>
            <span class="flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-amber-400 px-3.5 text-xs font-bold text-white">ارتقا به فروشنده ویژه</span>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <span class="flex min-w-0 items-center gap-2.5 rounded-full p-1 ps-3 text-sm font-bold">کاربر ایمچ
              <span class="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">ک</span>
            </span>
            <span class="grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground">خانه</span>
          </div>
        </div>

        <!-- main — ظرف اسکرول دسکتاپ -->
        <main class="min-h-screen min-w-0 p-3 sm:p-4 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:p-6">
          <!-- صفحهٔ پیام‌ها -->
          <div class="mx-auto max-w-5xl space-y-4 lg:flex lg:h-full lg:flex-col lg:gap-4 lg:space-y-0">
            <div class="grid grid-cols-1 gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[320px_1fr] lg:grid-rows-[minmax(0,1fr)]">
              <!-- لیست مخاطبان -->
              <section class="order-2 flex flex-col rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5 lg:order-1">
                <div class="flex items-center justify-between">
                  <p class="text-sm font-bold">مخاطب <span class="text-muted-foreground">(۱۸)</span></p>
                </div>
                <div class="relative mt-3">
                  <input class="flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base md:text-sm" placeholder="جستجوی مکالمه…">
                </div>
                <ul class="mt-3 divide-y divide-border/70 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain lg:touch-pan-y">{''.join(contacts_html)}
                </ul>
                <div class="mt-4 rounded-md border bg-secondary/30 p-3">
                  <p class="flex items-center gap-1.5 text-xs font-bold">ارسال برای دوستان</p>
                  <p class="mt-1.5 text-[11px] leading-5 text-muted-foreground">با معرفی ایمچ به همکارانتان، بازار بزرگ‌تر و قیمت‌های بهتری داشته باشید.</p>
                  <div class="mt-2 flex items-center gap-2">
                    <button class="inline-flex h-8 flex-1 items-center justify-center rounded-md border text-[11px]">تلگرام</button>
                    <button class="inline-flex h-8 flex-1 items-center justify-center rounded-md border text-[11px]">واتس آپ</button>
                    <button class="inline-flex h-8 flex-1 items-center justify-center rounded-md border text-[11px]">ایمیل</button>
                  </div>
                </div>
              </section>

              <!-- نمای چت -->
              <section class="order-1 flex h-[60dvh] flex-col rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] sm:p-5 lg:order-2 lg:h-full lg:min-h-0">
                <div class="flex shrink-0 items-center gap-3 border-b border-border/70 pb-3">
                  <span class="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-xs font-extrabold text-primary">ع</span>
                  <div class="min-w-0 flex-1">
                    <p class="flex min-w-0 items-center gap-2 text-sm font-bold"><span class="truncate">علی رضایی</span></p>
                    <p class="truncate text-[11px] text-muted-foreground">مکالمه روی: گردو کاغذی درجه یک</p>
                  </div>
                  <div class="flex shrink-0 items-center gap-1">
                    <button class="inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[11px]">ویرایش قیمت</button>
                    <button class="grid size-8 place-items-center rounded-md text-muted-foreground">⚑</button>
                  </div>
                </div>
                <div class="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y space-y-2 sm:space-y-3 px-0.5 py-3 sm:px-1 sm:py-4 sm:bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] sm:[background-size:18px_18px]">{''.join(msgs_html)}
                </div>
                <form class="flex shrink-0 gap-2 border-t border-border/70 pt-3" onsubmit="return false">
                  <input class="flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 text-base md:text-sm" placeholder="برای شروع مکالمه پیامی بنویسید">
                  <button class="inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">➤</button>
                </form>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
  <!-- نوار پایین موبایل (ساده‌شده) -->
  <nav class="mobile-bottom-nav fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card lg:hidden">
    <div class="flex h-[58px] items-center justify-around text-[11px] text-muted-foreground">
      <span class="flex flex-col items-center gap-0.5">خانه</span>
      <span class="flex flex-col items-center gap-0.5">دسته‌ها</span>
      <span class="flex flex-col items-center gap-0.5 font-bold text-primary">پیام‌ها</span>
      <span class="flex flex-col items-center gap-0.5">پنل</span>
    </div>
  </nav>
</body>
</html>'''

with open('/tmp/render/repro.html', 'w', encoding='utf-8') as f:
    f.write(html)
print('written', len(html), 'bytes')
