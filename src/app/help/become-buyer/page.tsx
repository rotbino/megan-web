import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, HandCoins, Headphones, PackageSearch, PhoneCall, ShieldCheck, UserRoundCheck } from 'lucide-react';
import { ArticleLayout, ArticleP, BulletList, SectionTitle, StepItem, TipBox } from '../article-kit';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'چگونه بخریم؟ | راهنمای خریداران ایمچ',
  description:
    'راهنمای گام‌به‌گام خرید عمده در ایمچ: یافتن محصول و فروشنده، ثبت درخواست خرید، ارتباط با فروشندگان و پرداخت امن — در ۳ گام کلیدی.',
  alternates: { canonical: '/help/become-buyer' },
};

const CONTACT_WAYS = [
  { icon: PhoneCall, title: 'برقراری تماس با فروشندگان', text: 'برای استعلام موجودی و توافق برای معامله با فروشندگان حاضر در ایمچ تماس بگیرید.' },
  { icon: PackageSearch, title: 'ارسال پیام به فروشندگان', text: 'برای دریافت جزئیات بیشتر محصول، برای فروشندگان پیام ارسال کنید.' },
  { icon: Headphones, title: 'پاسخ‌دهی به اعلام قیمت فروشندگان', text: 'فروشندگان به درخواست خرید شما پاسخ داده و قیمت پیشنهادی و جزئیات محصول خود را از طریق پیام‌رسان ایمچ برای شما ارسال می‌کنند.' },
];

export default function BecomeBuyerPage() {
  return (
    <ArticleLayout
      title="گام‌های کلیدی برای خرید محصولات در ایمچ"
      intro="با این ۳ گام ساده، خرید عمده خود را در ایمچ شروع کنید؛ از یافتن محصول تا پرداخت امن."
      crumbs={[{ label: 'راهنما', href: '/help' }, { label: 'چگونه بخریم' }]}
    >
      {/* گام ۱ */}
      <section className="space-y-4">
        <StepItem n={1} title="یافتن محصول و فروشنده">
          <ArticleP>
            محصول مورد نظر خود را در ایمچ جستجو کنید و قیمت و جزئیات پیشنهادی فروشندگان مختلف آن محصول را بررسی کنید.
            برای دسترسی به قیمت‌ها کافی است با شماره موبایل خود وارد حساب کاربری شوید.
          </ArticleP>
        </StepItem>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-xs font-extrabold">ثبت درخواست خرید</p>
            <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
              با ثبت یک درخواست خرید، فروشندگان محصول مورد نظر شما از قصد خریدتان مطلع شده و برای ارائه قیمت با شما ارتباط خواهند گرفت.
            </p>
            <Link href="/buyAd-requests" className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
              ثبت درخواست خرید <ArrowLeft size={12} />
            </Link>
          </div>
          <div className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <p className="text-xs font-extrabold">لیست فروشندگان پیشنهادی</p>
            <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
              ایمچ، فروشندگان مرتبط با محصولات مورد نظر شما را در صفحه «فروشندگان پیشنهادی» دسته‌بندی می‌کند.
              با مرور این لیست، در زمان جستجوی محصول خود، صرفه‌جویی کنید.
            </p>
          </div>
        </div>
      </section>

      {/* گام ۲ */}
      <section className="space-y-4">
        <StepItem n={2} title="ارتباط با فروشندگان">
          <ArticleP>پس از یافتن فروشنده، از یکی از این سه راه با او در ارتباط باشید:</ArticleP>
        </StepItem>
        <div className="space-y-3">
          {CONTACT_WAYS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3 rounded-lg border bg-card p-3.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
              <span className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Icon size={17} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-extrabold">{title}</p>
                <p className="mt-1 text-xs leading-6 text-muted-foreground">{text}</p>
              </div>
            </div>
          ))}
        </div>
        <TipBox title="ذخیره و دسته‌بندی مشتریان">
          با استفاده از گزینه «نشان کردن»، مشتریان خود را در لیست‌های دلخواه ذخیره کنید و با برچسب‌های مختلف علامت‌گذاری کنید.
          ایجاد لیست‌های مختلف مشتریان به بهبود پیگیری معاملات و شبکه‌سازی با آن‌ها کمک می‌کند.
        </TipBox>
      </section>

      {/* گام ۳ */}
      <section className="space-y-4">
        <StepItem n={3} title="پرداخت امن ایمچ">
          <ArticleP>
            پس از توافق با فروشنده، می‌توانید با پرداخت وجه معامله از طریق سامانه پرداخت امن ایمچ، با اطمینان خاطر از دریافت
            محصول خود، معامله کنید. سیستم پرداخت امن ایمچ تا زمان دریافت بار توسط خریدار، وجه معامله را نگهداری می‌کند و
            پس از تایید طرفین درباره رعایت تمام مفاد قرارداد، مبلغ معامله به حساب فروشنده منتقل می‌شود.
          </ArticleP>
          <Button asChild size="sm" className="rounded-md">
            <Link href="/help/secure-payment">
              <HandCoins size={15} className="ms-1" /> راهنمای پرداخت امن
            </Link>
          </Button>
        </StepItem>
      </section>

      {/* احراز هویت */}
      <section className="space-y-3">
        <SectionTitle>احراز هویت</SectionTitle>
        <div className="flex items-start gap-3 rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <UserRoundCheck size={19} />
          </span>
          <div>
            <ArticleP>
              برای جلب اعتماد فروشندگان، پس از ورود به حساب کاربری، اطلاعات هویتی خود را تایید کنید.
              احراز هویت در ایمچ طی یک فرآیند دو مرحله‌ای ساده انجام می‌شود. افراد احراز هویت‌شده با نماد{' '}
              <ShieldCheck size={13} className="inline translate-y-0.5 text-emerald-600" aria-label="نشان احراز هویت" /> مشخص می‌شوند
              و مطمئن‌تر برای معاملات هستند.
            </ArticleP>
            <Link href="/help/verify-account" className="mt-2 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
              راهنمای احراز هویت <ArrowLeft size={12} />
            </Link>
          </div>
        </div>
      </section>

      {/* نکات خرید امن */}
      <section className="space-y-3">
        <SectionTitle>پیش از اولین خرید</SectionTitle>
        <BulletList
          items={[
            'معامله حضوری امن‌ترین راه معامله است؛ کالا را ببینید، بررسی کنید و همان زمان مبلغ را پرداخت نمایید.',
            'به دیدن رسید پرداخت اینترنتی اکتفا نکنید و شخصاً از واریز مبلغ مطمئن شوید.',
            'هرگز پیش از دریافت کالا، هزینه‌ای تحت عنوان بیعانه، شیرینی یا رزرو پرداخت نکنید.',
            'از فروشنده بخواهید تصاویر واضح و اطلاعات کافی از کالا در اختیار شما بگذارد.',
          ]}
        />
        <TipBox title="توصیه ایمچ" tone="warn">
          ایمچ همواره انجام معاملات را به‌صورت حضوری توصیه می‌کند. از واریز پول از راه دور جدا خودداری فرمایید.
        </TipBox>
      </section>
    </ArticleLayout>
  );
}
