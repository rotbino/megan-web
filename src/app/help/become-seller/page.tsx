import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowLeft,
  BellRing,
  BookOpenCheck,
  LineChart,
  MessageSquareText,
  PackagePlus,
  Star,
  TrendingUp,
  UserRound,
  UserRoundCheck,
  Wallet,
} from 'lucide-react';
import { ArticleLayout, ArticleP, SectionTitle, StepItem, TipBox } from '../article-kit';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'چگونه بفروشیم؟ | راهنمای فروشندگان ایمچ',
  description:
    '۱۰ گام کلیدی برای فروش حرفه‌ای در ایمچ: از ایجاد حساب کاربری و احراز هویت تا ثبت آگهی، نردبان، پاسخ به خریداران و مدیریت فروش.',
  alternates: { canonical: '/help/become-seller' },
};

const STEPS = [
  {
    icon: UserRound,
    title: 'ایجاد حساب کاربری',
    body: 'برای فعالیت و ورود به ایمچ، ابتدا باید یک حساب کاربری رایگان به عنوان فروشنده ایجاد کنید. با طی چند مرحله ساده و ثبت مشخصات خود، در عرض چند دقیقه وارد پروفایل تجاری خود شوید.',
  },
  {
    icon: UserRoundCheck,
    title: 'احراز هویت',
    body: 'برای جلب اعتماد مشتریان، پس از ورود به حساب کاربری، اطلاعات هویتی خود را تایید کنید. احراز هویت در ایمچ طی یک فرآیند دو مرحله‌ای ساده انجام می‌شود. افراد احراز هویت‌شده با نماد تیک مشخص می‌شوند و مطمئن‌تر برای معاملات هستند.',
    link: { href: '/help/verify-account', label: 'راهنمای احراز هویت' },
  },
  {
    icon: PackagePlus,
    title: 'ثبت آگهی محصول',
    body: 'پس از ثبت نام در ایمچ، غرفه آنلاین خود را بسازید و محصولاتتان را به نمایش بگذارید. هر چه محصولات بیشتری ثبت کنید، شانس دیده شدن توسط خریداران بیشتر می‌شود.',
    link: { href: '/help/post-product', label: 'راهنمای ثبت محصول' },
  },
  {
    icon: BellRing,
    title: 'پاسخ به درخواست‌های خرید',
    body: 'خریداران در ایمچ برای یافتن و خرید محصول مورد نظرشان، درخواست خرید ثبت می‌کنند. شما می‌توانید از صفحه خریداران با آنها ارتباط برقرار کرده و به درخواست‌هایشان پاسخ دهید.',
  },
  {
    icon: Star,
    title: 'به‌روزرسانی قیمت محصولات',
    body: 'به‌روزرسانی مستمر قیمت محصولات، یکی از روش‌های انتقال محصول شما به بالای لیست و افزایش بازدید و فروش است. خریداران با دیدن قیمت‌های به‌روز، بیشتر به فروشنده و صحت حساب کاربری او اعتماد می‌کنند.',
  },
  {
    icon: TrendingUp,
    title: 'نردبان کردن محصولات',
    body: 'اعمال نردبان محصولات شما را به بالای لیست آن دسته منتقل می‌کند و به عنوان اولین محصولات به خریداران نمایش داده می‌شوند که باعث افزایش فروش می‌شود. تنها قابلیت تبلیغاتی ایمچ، نردبان یک‌ماهه است که هزینه آن از شارژ کیف پول شما کسر می‌شود.',
    link: { href: '/help/charge-package', label: 'بسته شارژ تبلیغاتی و فواید نردبان' },
  },
  {
    icon: BookOpenCheck,
    title: 'ذخیره و دسته‌بندی مشتریان',
    body: 'با استفاده از گزینه نشان کردن، مشتریان خود را در لیست‌های دلخواه ذخیره کنید و با برچسب‌های مختلف علامت‌گذاری کنید. ایجاد لیست‌های مختلف مشتریان به بهبود پیگیری معاملات و شبکه‌سازی با آن‌ها کمک می‌کند.',
  },
  {
    icon: MessageSquareText,
    title: 'در ارتباط ماندن با مشتریان',
    body: 'پاسخگویی مداوم و سریع به مشتریان در پیام‌رسان ایمچ، ضمن جلب اعتماد بیشتر، درصد پاسخگویی شما را افزایش داده و باعث تبلیغ بیشتر شما در ایمچ می‌شود.',
    link: { href: '/help/start-conversation', label: 'راهنمای ارسال پیام تجاری' },
  },
  {
    icon: LineChart,
    title: 'بررسی گزارش محصولات',
    body: 'پس از ثبت محصولات در ایمچ، گزارش و آمارهای محصول به بهینه‌سازی فروش شما کمک می‌کنند. این گزارش‌ها شامل بازدیدهای هفته اخیر، بازدیدهای کل، بازدیدکنندگان محصول شما، و افرادی که برای آن محصول برای شما پیام ارسال کرده‌اند، می‌باشد.',
  },
  {
    icon: Wallet,
    title: 'تکمیل پروفایل کاربری',
    body: 'مراحل تکمیل پروفایل شما برای بهبود نمایش به خریداران طراحی شده است. با تکمیل این مراحل ساده، اعتبار خود را در ایمچ افزایش دهید و پروفایل خود را حرفه‌ای‌تر کنید.',
  },
];

export default function BecomeSellerPage() {
  return (
    <ArticleLayout
      title="گام‌های کلیدی برای فروش حرفه‌ای در ایمچ"
      intro="از ایجاد حساب کاربری تا مدیریت فروش — همه آنچه یک فروشنده در ایمچ باید بداند."
      crumbs={[{ label: 'راهنما', href: '/help' }, { label: 'چگونه بفروشیم' }]}
    >
      {/* شروع فعالیت */}
      <SectionTitle>شروع فعالیت در ایمچ</SectionTitle>
      <div className="space-y-5 rounded-lg border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {STEPS.slice(0, 3).map((s, i) => (
          <StepItem key={s.title} n={i + 1} title={s.title}>
            <ArticleP>{s.body}</ArticleP>
            {s.link && (
              <Link href={s.link.href} className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                {s.link.label} <ArrowLeft size={12} />
              </Link>
            )}
          </StepItem>
        ))}
      </div>
      <TipBox title="ارتباط با خریداران لحظه‌ای">
        کاربرانی که در جستجوی محصول شما هستند، به صورت نوار وضعیت از قسمت بالای لیست خریداران در دسترس هستند.
      </TipBox>

      {/* افزایش فروش */}
      <SectionTitle>افزایش فروش در ایمچ</SectionTitle>
      <div className="space-y-5 rounded-lg border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {STEPS.slice(3, 6).map((s, i) => (
          <StepItem key={s.title} n={i + 4} title={s.title}>
            <ArticleP>{s.body}</ArticleP>
            {s.link && (
              <Link href={s.link.href} className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                {s.link.label} <ArrowLeft size={12} />
              </Link>
            )}
          </StepItem>
        ))}
      </div>

      {/* مدیریت فروش */}
      <SectionTitle>مدیریت فروش در ایمچ</SectionTitle>
      <div className="space-y-5 rounded-lg border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        {STEPS.slice(6).map((s, i) => (
          <StepItem key={s.title} n={i + 7} title={s.title}>
            <ArticleP>{s.body}</ArticleP>
            {s.link && (
              <Link href={s.link.href} className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                {s.link.label} <ArrowLeft size={12} />
              </Link>
            )}
          </StepItem>
        ))}
      </div>

      {/* CTA */}
      <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/5 p-5">
        <Button asChild size="sm" className="rounded-md">
          <Link href="/panel/products/new">
            <PackagePlus size={15} className="ms-1" /> ثبت اولین محصول
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="rounded-md">
          <Link href="/help/charge-package">
            <TrendingUp size={15} className="ms-1" /> بسته شارژ تبلیغاتی
          </Link>
        </Button>
      </div>
    </ArticleLayout>
  );
}
