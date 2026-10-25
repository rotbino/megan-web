'use client';

/**
 * راهنما (مرکز راهنمای ایمچ) — عین MHTML باسکول:
 * «ایمچ چگونه کار می‌کند؟ / هر آنچه که در ایمچ باید بدانید» +
 * چهار کارت موضوعی (حساب کاربری/فروش/تبلیغات/خرید) + مطالب پیشنهادی +
 * مطالب برجسته + پرسش‌های همیشگی (آکاردئون) + CTA پشتیبانی آنلاین.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  ChevronDown,
  ChevronLeft,
  HelpCircle,
  LifeBuoy,
  Megaphone,
  Package,
  ShoppingCart,
  UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/panel/panel-parts';
import { cn } from '@/lib/utils';

const TOPIC_CARDS = [
  { title: 'حساب کاربری', hint: 'راهنمای ورود و ثبت نام در ایمچ', icon: UserRound, href: '/panel/support' },
  { title: 'فروش محصول', hint: 'راهنمای فروشندگان ایمچ', icon: Package, href: '/panel/products/new' },
  { title: 'خدمات تبلیغاتی', hint: 'راهنمای تبلیغات و بسته های ویژه', icon: Megaphone, href: '/panel/pricing' },
  { title: 'خرید محصول', hint: 'راهنمای خریداران ایمچ', icon: ShoppingCart, href: '/panel/buy-requests/new' },
];

const SUGGESTED_ARTICLES = [
  { title: 'راهنمای جامع فروشندگان', hint: '۱۰ گام کلیدی برای فروش حرفه‌ای در ایمچ' },
  { title: 'راهنمای جامع خریداران', hint: '۳ گام کلیدی برای خرید حرفه‌ای در ایمچ' },
  { title: 'احراز هویت در ایمچ', hint: 'احراز هویت یعنی ارسال مشخصات هویتی صاحب حساب کاربری، جهت تایید درستی و واقعی بودن هویت افراد.' },
  { title: 'بروز رسانی قیمت محصولات', hint: 'محصولاتی که مدت زیادی از آخرین تغییر قیمت آنها گذشته باشد، با نوار قرمز مشخص می‌شوند.' },
];

const FEATURED = [
  { title: 'ایمچ چگونه کار می‌کند؟', time: '۱ دقیقه مشاهده' },
  { title: 'چگونه در ایمچ از امکانات فروشندگان استفاده کنیم؟', time: '۳ دقیقه مشاهده' },
  { title: 'گزارش و آمار محصولم را از کجا ببینیم؟', time: '۲ دقیقه مطالعه' },
  { title: 'چگونه از سرنخ‌های فروش در ایمچ استفاده کنم؟', time: '۲ دقیقه مطالعه' },
];

const FAQS = [
  {
    q: 'چطور می‌توانم به فروشندگان اعتماد کنم؟',
    a: 'فروشندگان احراز هویت‌شده افرادی هستند که ایمچ نام و مشخصات آن‌ها با تصویر صاحب حساب مطابقت داده و مدارکشان نزد ایمچ می‌باشد. افراد احراز هویت‌شده با نشان تأیید مشخص می‌شوند و طبیعتاً مطمئن‌تر برای انجام معاملات هستند. حتماً معاملات را بصورت حضوری انجام دهید و از واریز پول از راه دور جداً خودداری فرمایید.',
  },
  {
    q: 'چگونه می‌توانم برنامه ایمچ را نصب کنم؟',
    a: 'با استفاده از برنامه ایمچ بر روی تلفن همراه خود به‌راحتی از امکانات ایمچ استفاده کنید و با طرف مقابل زودتر ارتباط بگیرید. می‌توانید با تلفن همراه به وبسایت ایمچ وارد شده و از صفحه «ایمچ من» گزینه نصب اپلیکیشن را انتخاب کنید.',
  },
  {
    q: 'پیامک «خریدار جدید» آمده ولی در ایمچ پیامی ندارم.',
    a: 'بعد از ثبت محصول، ایمچ مرتبط‌ترین خریدارانی را که با احتمال بیشتری خریدار محصول شما هستند از طریق پیامک معرفی می‌کند. خریداران پیشنهادشده تا ۴ ساعت پس از ارسال پیامک، از قسمت «خریداران پیشنهادی» قابل مشاهده و دسترسی هستند؛ می‌توانید چت کنید یا تماس بگیرید و معامله کنید.',
  },
  {
    q: 'به چه علت آگهی محصول رد می‌شود؟',
    a: 'آگهی‌هایی که مغایر با قوانین فعلی ایران باشند، ناقض حریم خصوصی افراد، دارای هرگونه توهین به ادیان رسمی کشور، آداب و رسوم، قومیت‌ها و لهجه‌های مختلف؛ درج کالاهای منوعه؛ درخواست کمک‌های نقدی یا پیش‌پرداخت برای معامله‌های از راه دور و درج شماره حساب در متن آگهی؛ بارگذاری تصاویر بی‌کیفیت و نامناسب؛ درج شماره تماس یا لوگو برند روی تصاویر محصول؛ و وارد کردن میزان موجودی نامناسب (مقیاس خرده‌فروشی) رد می‌شوند.',
  },
  {
    q: 'چطور می‌توانم نام کاربری خود را عوض کنم؟',
    a: 'افراد فقط با نام اصلی خود می‌توانند در ایمچ فعالیت نمایند؛ لذا برای تغییر نام کاربری حساب، نیاز به انجام مراحل احراز هویت جهت تایید نام اصلی صاحب حساب است. پس از ارسال مدارک، در صورت تایید صحت مدارک، ایمچ نام کاربری را به نام مدارک تغییر می‌دهد. برای پیگیری از طریق «گفتگو با پشتیبان» اقدام کنید.',
  },
];

export default function GuidePage() {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-extrabold">ایمچ چگونه کار می‌کند؟</h1>
        <p className="mt-1 text-sm text-muted-foreground">هر آنچه که در ایمچ باید بدانید</p>
      </div>

      {/* کارت‌های موضوعی */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {TOPIC_CARDS.map(({ title, hint, icon: Icon, href }) => (
          <Link
            key={title}
            href={href}
            className="group flex flex-col items-start rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:border-primary/40"
          >
            <span className="grid size-10 place-items-center rounded-md bg-primary/5 text-primary">
              <Icon size={19} />
            </span>
            <p className="mt-3 text-sm font-bold">{title}</p>
            <p className="mt-1 flex items-center gap-1 text-[11px] leading-5 text-muted-foreground">
              {hint}
              <ChevronLeft size={12} className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
            </p>
          </Link>
        ))}
      </div>

      {/* مطالب پیشنهادی به شما */}
      <PanelCard>
        <p className="text-sm font-bold">مطالب پیشنهادی به شما</p>
        <div className="mt-3 divide-y divide-border/70 rounded-md border">
          {SUGGESTED_ARTICLES.map((a) => (
            <button
              key={a.title}
              type="button"
              className="flex w-full items-start justify-between gap-3 px-4 py-3 text-start transition-colors hover:bg-secondary/40"
              onClick={() => setOpen(open === a.title ? null : a.title)}
            >
              <span className="min-w-0">
                <span className="block text-sm font-bold">{a.title}</span>
                <span className="mt-1 block text-[11px] leading-5 text-muted-foreground">{a.hint}</span>
              </span>
              <span className="shrink-0 rounded-md border bg-card px-2.5 py-1 text-[11px] font-bold text-primary">
                مشاهده
              </span>
            </button>
          ))}
        </div>
      </PanelCard>

      {/* مطالب برجسته */}
      <PanelCard>
        <p className="text-sm font-bold">مطالب برجسته</p>
        <ul className="mt-3 divide-y divide-border/70">
          {FEATURED.map((f) => (
            <li key={f.title} className="flex items-center justify-between gap-3 py-2.5">
              <span className="flex min-w-0 items-center gap-2 text-xs leading-6">
                <BookOpen size={15} className="shrink-0 text-muted-foreground/60" />
                {f.title}
              </span>
              <span className="shrink-0 text-[11px] text-muted-foreground">{f.time}</span>
            </li>
          ))}
        </ul>
      </PanelCard>

      {/* پرسش‌های همیشگی */}
      <PanelCard>
        <p className="text-sm font-bold">پرسش‌های همیشگی</p>
        <div className="mt-3 divide-y divide-border/70 rounded-md border">
          {FAQS.map(({ q, a }) => {
            const isOpen = open === q;
            return (
              <div key={q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? null : q)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start text-sm font-bold transition-colors hover:bg-secondary/40"
                >
                  {q}
                  <ChevronDown
                    size={16}
                    className={cn('shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                  />
                </button>
                {isOpen && <p className="px-4 pb-3.5 text-xs leading-6 text-muted-foreground">{a}</p>}
              </div>
            );
          })}
        </div>

        {/* مطالب بیشتر */}
        <div className="mt-4 flex items-center justify-between gap-3 rounded-md border bg-secondary/30 px-3.5 py-3">
          <span className="text-xs leading-6">
            <span className="block font-bold">قوانین و مقررات در ایمچ</span>
            <span className="text-[11px] text-muted-foreground">آشنایی با شرایط و مقررات ایمچ</span>
          </span>
          <span className="shrink-0 rounded-md border bg-card px-2.5 py-1 text-[11px] font-bold text-primary">مشاهده</span>
        </div>
      </PanelCard>

      {/* CTA پشتیبانی */}
      <PanelCard className="text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
          <HelpCircle size={22} />
        </span>
        <p className="mt-3 text-sm font-bold">پاسخ پرسش خود را پیدا نکردید؟</p>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          برای راهنمایی بیشتر و یا اعلام مشکل خود از طریق پشتیبانی آنلاین ایمچ سوال خود را بپرسید.
        </p>
        <Button asChild size="sm" className="mt-4 rounded-md">
          <Link href="/panel/support">
            <LifeBuoy size={14} /> پشتیبانی آنلاین
          </Link>
        </Button>
      </PanelCard>
    </div>
  );
}
