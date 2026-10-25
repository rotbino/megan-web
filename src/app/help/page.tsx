import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BookOpen,
  ChevronDown,
  Coins,
  CreditCard,
  FileQuestion,
  Headphones,
  Info,
  Megaphone,
  MessageSquareText,
  PackagePlus,
  Scale,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  UserRound,
  UserRoundCheck,
} from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HelpAccordion } from './help-accordion';

export const metadata: Metadata = {
  title: 'راهنما | ایمچ چگونه کار می کند؟',
  description:
    'راهنمای جامع ایمچ: حساب کاربری، ثبت نام و ورود، فروش محصول، ثبت درخواست خرید، احراز هویت، بسته شارژ تبلیغاتی و نردبان، پرسش‌های متداول خریداران و فروشندگان.',
  alternates: { canonical: '/help' },
};

/** چهار کارت راهنمای اصلی — عین باسکول، لینک‌دار */
const GUIDE_CARDS = [
  { icon: UserRound, title: 'حساب کاربری', hint: 'راهنمای ورود و ثبت نام در ایمچ', href: '/help/verify-account' },
  { icon: PackagePlus, title: 'فروش محصول', hint: 'راهنمای فروشندگان ایمچ', href: '/help/become-seller' },
  { icon: Megaphone, title: 'خدمات تبلیغاتی', hint: 'راهنمای بسته شارژ و نردبان', href: '/help/charge-package' },
  { icon: ShoppingCart, title: 'خرید محصول', hint: 'راهنمای خریداران ایمچ', href: '/help/become-buyer' },
];

/** مطالب پیشنهادی — با محتوای بازشو */
const FEATURED = [
  {
    title: 'راهنمای جامع فروشندگان',
    sub: '۱۰ گام کلیدی برای فروش حرفه‌ای در ایمچ',
    body: 'از تکمیل پروفایل و احراز هویت شروع کنید، محصولات را با تصویر باکیفیت و توضیحات کامل ثبت کنید، قیمت‌ها را به‌روز نگه دارید و با نردبان دیده‌شوید. به پیام خریداران سریع پاسخ دهید و معاملات را حضوری انجام دهید تا اعتبار شما رشد کند.',
    href: '/help/become-seller',
  },
  {
    title: 'راهنمای جامع خریداران',
    sub: '۳ گام کلیدی برای خرید حرفه‌ای',
    body: '۱) درخواست خرید عمده خود را با میزان دقیق ثبت کنید. ۲) قیمت‌ها را از فروشندگان مختلف بگیرید و مقایسه کنید. ۳) پس از اطمینان از کیفیت، معامله را حضوری و با رسید کتبی انجام دهید.',
    href: '/help/become-buyer',
  },
  {
    title: 'احراز هویت در ایمچ',
    sub: '',
    body: 'احراز هویت یعنی ارسال مشخصات هویتی صاحب حساب کاربری ایمچ، جهت تایید درستی و واقعی بودن هویت افراد. افراد احراز هویت شده، افرادی هستند که ایمچ نام و مشخصات آن‌ها را با تصویر صاحب حساب مطابقت داده و مدارکشان نزد ایمچ می‌باشد.',
    href: '/help/verify-account',
  },
  {
    title: 'بروز رسانی قیمت محصولات',
    sub: '',
    body: 'از آنجایی که خریداران در ایمچ همیشه به دنبال قیمت‌های به‌روز هستند، محصولاتی که مدت زیادی از آخرین تغییر قیمت آن‌ها گذشته باشد با نوار قرمز مشخص می‌شوند. با کلیک روی لیبل «قیمت فعلی معتبر است» یا وارد کردن قیمت جدید، قیمت آگهی خود را به‌روز کنید.',
    href: '/help/post-product',
  },
];

/** مطالب برجسته — با زمان مطالعه و لینک */
const HIGHLIGHTS = [
  { title: 'ایمچ چگونه کار می‌کند؟', time: '۱ دقیقه مشاهده', href: '/help/about' },
  { title: 'چگونه در ایمچ از امکانات فروشندگان استفاده کنیم؟', time: '۳ دقیقه مشاهده', href: '/help/become-seller' },
  { title: 'گزارش و آمار محصولم را از کجا ببینم؟', time: '۲ دقیقه مطالعه', href: '/help/become-seller' },
  { title: 'چگونه از سرنخ‌های فروش در ایمچ استفاده کنم؟', time: '۲ دقیقه مطالعه', href: '/help/start-conversation' },
];

/** پرسش‌های همیشگی — عین باسکول (با جایگزینی ایمچ) */
const FAQS = [
  {
    q: 'چطور می توانم به فروشندگان اعتماد کنم؟',
    a: 'فروشندگان احراز هویت شده، افرادی هستند که ایمچ نام و مشخصات آن‌ها را با تصویر صاحب حساب مطابقت داده و مدارکشان نزد ایمچ می‌باشد. افراد احراز هویت شده با نماد تیک سبز در ایمچ مشخص می‌شوند و طبیعتاً افرادی مطمئن‌تر برای انجام معاملات هستند. حتماً معاملات را بصورت حضوری انجام دهید و از واریز پول از راه دور جدا خودداری فرمایید.',
  },
  {
    q: 'چگونه می توانم برنامه ایمچ را نصب کنم؟',
    a: 'با استفاده از برنامه ایمچ بر روی تلفن همراه خود به راحتی از امکانات ایمچ استفاده کنید و با طرف مقابل زودتر ارتباط بگیرید. می‌توانید با تلفن همراه خود به وبسایت ایمچ وارد شده و از صفحه «ایمچ من» اقدام به نصب اپلیکیشن کنید.',
  },
  {
    q: 'پیامک «خریدار جدید» آمده ولی در ایمچ پیامی ندارم.',
    a: 'بعد از ثبت محصول شما، ایمچ مرتبط‌ترین خریدارانی را که با احتمال بیشتری خریدار محصول شما هستند از طریق پیامک معرفی می‌کند. خریداران پیشنهاد شده تا ۴ ساعت پس از ارسال پیامک از قسمت «خریداران پیشنهادی» قابل مشاهده و دسترسی هستند؛ می‌توانید با ایشان چت کنید یا از طریق شماره تماسشان معامله کنید. تعداد بسیار زیادی از خریداران نیز از قسمت منوی «خریداران» قابل مشاهده هستند.',
  },
  {
    q: 'به چه علت آگهی محصول رد می شود؟',
    a: 'آگهی‌هایی که مغایر با قوانین فعلی ایران، ناقض حریم خصوصی افراد، دارای هرگونه توهین به ادیان رسمی کشور، آداب، رسوم، قومیت‌ها، لهجه‌ها و گویش‌های مختلف هستند؛ درج کالاهای ممنوعه یا بذر و دانه آن‌ها؛ درخواست کمک‌های نقدی یا پیش‌پرداخت برای معامله‌های از راه دور و درج شماره حساب در متن آگهی؛ بارگذاری تصاویر بی‌کیفیت و نامناسب؛ درج شماره تماس یا لوگو برند روی تصاویر محصول؛ و وارد کردن میزان موجودی نامناسب (مقیاس‌های خرده‌فروشی قابل قبول نیستند) رد می‌شوند.',
  },
  {
    q: 'چطور می توانم نام کاربری خود را عوض کنم؟',
    a: 'افراد فقط با نام اصلی خود می‌توانند در ایمچ فعالیت نمایند؛ لذا برای تغییر نام کاربری حساب، نیاز به انجام مراحل احراز هویت جهت تایید نام اصلی صاحب حساب است. پس از ارسال مدارک، در صورت تایید صحت مدارک، ایمچ نام کاربری ایشان را به نام مدارک ارسال شده تغییر می‌دهد. برای پیگیری از طریق گفتگو با پشتیبانی اقدام کنید.',
  },
];

/** خدمات ایمچ */
const SERVICES = [
  { icon: Scale, label: 'مطالب بیشتر: قوانین و مقررات در ایمچ', href: '/help/rules' },
  { icon: CreditCard, label: 'پرداخت امن در ایمچ', href: '/help/secure-payment' },
  { icon: TrendingUp, label: 'خدمات تبلیغاتی و نردبان', href: '/help/charge-package' },
];

export default function HelpPage() {
  return (
    <>
      <Header />
      <main className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-8 lg:px-6">
          {/* سرصفحه */}
          <div className="text-center">
            <h1 className="text-xl font-extrabold sm:text-2xl">ایمچ چگونه کار می کند؟</h1>
            <p className="mt-2 text-sm text-muted-foreground">هر آنچه که در ایمچ باید بدانید</p>
          </div>

          {/* چهار کارت اصلی */}
          <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {GUIDE_CARDS.map(({ icon: Icon, title, hint, href }) => (
              <Link
                key={title}
                href={href}
                className="flex flex-col items-center rounded-lg border bg-card p-5 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:border-primary/40"
              >
                <span className="grid size-12 place-items-center rounded-md bg-primary/10 text-primary">
                  <Icon size={22} />
                </span>
                <p className="mt-3 text-sm font-extrabold">{title}</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{hint}</p>
              </Link>
            ))}
          </div>

          {/* مطالب پیشنهادی */}
          <section className="mt-10">
            <h2 className="flex items-center gap-2 text-base font-extrabold">
              <BookOpen size={18} className="text-primary" /> مطالب پیشنهادی به شما
            </h2>
            <div className="mt-4 divide-y divide-border/70 rounded-lg border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {FEATURED.map((f) => (
                <HelpAccordion key={f.title} title={f.title} subtitle={f.sub} body={f.body} href={f.href} />
              ))}
            </div>
          </section>

          {/* مطالب برجسته */}
          <section className="mt-10">
            <h2 className="text-base font-extrabold">مطالب برجسته</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {HIGHLIGHTS.map(({ title, time, href }) => (
                <li key={title}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 rounded-lg border bg-card p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:border-primary/40"
                  >
                    <FileQuestion size={18} className="shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold leading-5">{title}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{time}</p>
                    </div>
                    <ChevronDown size={15} className="shrink-0 text-muted-foreground/40" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* پرسش‌های همیشگی */}
          <section className="mt-10">
            <h2 className="text-base font-extrabold">پرسش های همیشگی</h2>
            <div className="mt-4 divide-y divide-border/70 rounded-lg border bg-card shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              {FAQS.map((f) => (
                <HelpAccordion key={f.q} title={f.q} body={f.a} />
              ))}
            </div>
          </section>

          {/* راهنماهای پرکاربرد */}
          <section className="mt-10">
            <h2 className="text-base font-extrabold">راهنماهای پرکاربرد</h2>
            <ul className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {[
                { icon: MessageSquareText, label: 'چگونه پیام تجاری ارسال کنیم؟', href: '/help/start-conversation' },
                { icon: PackagePlus, label: 'چگونه آگهی محصول ثبت کنیم؟', href: '/help/post-product' },
                { icon: ShoppingCart, label: 'راهنمای ثبت درخواست خرید', href: '/help/post-rfq' },
                { icon: UserRoundCheck, label: 'راهنمای احراز هویت', href: '/help/verify-account' },
                { icon: Info, label: 'درباره ایمچ', href: '/help/about' },
                { icon: ShieldCheck, label: 'قوانین و مقررات', href: '/help/rules' },
              ].map(({ icon: Icon, label, href }) => (
                <li key={label}>
                  <Link
                    href={href}
                    className="flex items-center gap-2.5 rounded-lg border bg-card p-3.5 text-xs font-bold shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:border-primary/40"
                  >
                    <Icon size={16} className="shrink-0 text-primary" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* خدمات ایمچ */}
          <section className="mt-10 grid gap-3 sm:grid-cols-3">
            {SERVICES.map(({ icon: Icon, label, href }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-2.5 rounded-lg border bg-card p-3.5 text-xs font-bold shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-colors hover:border-primary/40"
              >
                <Icon size={17} className="shrink-0 text-primary" />
                {label}
              </Link>
            ))}
          </section>

          {/* پشتیبانی */}
          <div className="mt-10 rounded-lg border border-primary/25 bg-primary/5 p-6 text-center">
            <p className="text-sm font-extrabold text-primary">پاسخ پرسش خود را پیدا نکردید؟</p>
            <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
              برای راهنمایی بیشتر و یا اعلام مشکل خود از طریق پشتیبانی آنلاین ایمچ سوال خود را بپرسید.
            </p>
            <Link
              href="/panel/support"
              className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-xs font-bold text-primary-foreground transition-colors hover:bg-primary/90"
            >
              <Headphones size={15} /> پشتیبانی آنلاین
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
