import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, BadgePercent, CreditCard, Eye, TrendingUp, Wallet } from 'lucide-react';
import { ArticleLayout, ArticleP, BulletList, Figure, SectionTitle, StepItem, TipBox } from '../article-kit';
import { Button } from '@/components/ui/button';
import { priceFa } from '@/lib/format';
import { LADDER_MONTHLY_PRICE } from '@/lib/mock/data';

export const metadata: Metadata = {
  title: 'خرید بسته شارژ تبلیغاتی و فواید نردبان | راهنمای ایمچ',
  description:
    'راهنمای بسته شارژ تبلیغاتی ایمچ: فواید نردبان محصول، هزینه نردبان یک‌ماهه، شارژ کیف پول کارت به کارت با پکیج‌های جایزه و مراحل فعال‌سازی نردبان.',
  alternates: { canonical: '/help/charge-package' },
};

const LADDER_BENEFITS = [
  'قرارگرفتن محصول شما در صدر لیست محصولات همان دسته‌بندی، به عنوان اولین آگهی‌هایی که خریداران می‌بینند.',
  'افزایش چشمگیر بازدید آگهی و شانس دیده‌شدن توسط خریداران عمده در سراسر کشور.',
  'حفظ جایگاه در طول دوره نردبان (یک ماه) بدون نیاز به به‌روزرسانی دستی.',
  'کسر هزینه به‌سادگی از شارژ کیف پول — بدون نیاز به پرداخت جداگانه برای هر بار فعال‌سازی.',
];

export default function ChargePackagePage() {
  return (
    <ArticleLayout
      title="خرید بسته شارژ تبلیغاتی و فواید نردبان"
      intro="تنها قابلیت تبلیغاتی ایمچ، نردبان است؛ محصول شما را برای یک ماه به صدر لیست می‌رساند."
      crumbs={[{ label: 'راهنما', href: '/help' }, { label: 'خدمات تبلیغاتی' }, { label: 'بسته شارژ تبلیغاتی' }]}
    >
      <ArticleP>
        در ایمچ، برخلاف بسیاری از بازارگاه‌ها، membership ویژه یا فروشنده VIP نداریم. تمام امکانات ایمچ برای همه
        کاربران یکسان است و تنها قابلیت تبلیغاتی، <b>نردبان</b> است. با نردبان، محصول شما به مدت یک ماه در صدر لیست
        محصولات دسته‌بندی خود قرار می‌گیرد و پیش از سایر آگهی‌ها به خریداران نمایش داده می‌شود.
      </ArticleP>

      <section className="space-y-3">
        <SectionTitle>فواید نردبان محصول</SectionTitle>
        <div className="flex items-start gap-3 rounded-lg border border-primary/25 bg-primary/5 p-4">
          <span className="grid size-10 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground">
            <TrendingUp size={19} />
          </span>
          <div>
            <p className="text-sm font-extrabold">هزینه نردبان هر محصول: {priceFa(LADDER_MONTHLY_PRICE)} برای یک ماه (۳۰ روز)</p>
            <p className="mt-1 text-xs leading-6 text-muted-foreground">
              هزینه نردبان از شارژ کیف پول شما کسر می‌شود؛ بدون نیاز به ارتقا یا پرداخت اشتراک.
            </p>
          </div>
        </div>
        <BulletList items={LADDER_BENEFITS} />
      </section>

      <section className="space-y-4">
        <SectionTitle>مراحل فعال‌سازی نردبان</SectionTitle>
        <StepItem n={1} title="شارژ کیف پول (کارت به کارت)">
          <ArticleP>
            ابتدا از پنل کاربری، صفحه «کیف پول» را انتخاب کنید. یکی از پکیج‌های شارژ را انتخاب کنید، مبلغ را به شماره
            کارت ایمچ کارت به کارت کنید و تصویر فیش را برای ما بفرستید. پس از تایید ادمین، شارژ به کیف پول شما اضافه
            می‌شود.
          </ArticleP>
        </StepItem>
        <Figure
          src="/help-img/wallet.png"
          alt="صفحه شارژ کیف پول ایمچ با پکیج‌های کارت به کارت"
          caption="صفحه کیف پول — انتخاب پکیج شارژ، شماره کارت ایمچ و آپلود تصویر فیش."
        />
        <TipBox title="پکیج‌های شارژ با جایزه">
          پکیج ۱۰۰ هزار تومانی بدون جایزه، پکیج ۲۰۰ هزار تومانی با ۱۰٪ جایزه (۲۲۰ هزار تومان شارژ) و پکیج ۴۰۰ هزار
          تومانی با ۲۰٪ جایزه (۴۸۰ هزار تومان شارژ). حداقل شارژ {priceFa(LADDER_MONTHLY_PRICE)} است — برابر هزینه نردبان
          یک‌ماهه هر محصول.
        </TipBox>
        <StepItem n={2} title="نردبان آگهی از «محصولات من»">
          <ArticleP>
            پس از آنکه موجودی کیف پول شما کافی شد، از منوی «محصولات من»، روی دکمه «نردبان» آگهی مورد نظر کلیک کنید.
            در پنجره پرداخت، جزئیات هزینه را ببینید و با تایید، نردبان برای یک ماه فعال می‌شود.
          </ArticleP>
        </StepItem>
        <Figure
          src="/help-img/ladder-modal.png"
          alt="پنجره پرداخت هزینه نردبان در ایمچ"
          caption="پنجره پرداخت هزینه نردبان — یک‌ماهه ۳۰ روزه، کسر از کیف پول."
        />
        <TipBox title="نکته">
          آگهی‌های نردبان‌شده با برچسب «نردبان فعال» در لیست «محصولات من» مشخص می‌شوند و در صفحه محصولات همان دسته،
          بالای نتیجه «مرتبط‌ترین» نمایش داده می‌شوند.
        </TipBox>
      </section>

      <section className="space-y-3">
        <SectionTitle>چرا شارژ کیف پول؟</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border bg-card p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <span className="mx-auto grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
              <CreditCard size={17} />
            </span>
            <p className="mt-2 text-xs font-extrabold">پرداخت کارت به کارت</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">بدون نیاز به درگاه پرداخت آنلاین؛ فقط آپلود تصویر فیش.</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <span className="mx-auto grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
              <BadgePercent size={17} />
            </span>
            <p className="mt-2 text-xs font-extrabold">جایزه شارژ بیشتر</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">تا ۲۰٪ جایزه روی پکیج‌های بزرگ‌تر شارژ.</p>
          </div>
          <div className="rounded-lg border bg-card p-4 text-center shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <span className="mx-auto grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
              <Eye size={17} />
            </span>
            <p className="mt-2 text-xs font-extrabold">شفافیت کامل</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">تاریخچه تراکنش‌ها و وضعیت تایید فیش در همان صفحه قابل پیگیری است.</p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/5 p-5">
        <Button asChild size="sm" className="rounded-md">
          <Link href="/panel/wallet">
            <Wallet size={15} className="ms-1" /> شارژ کیف پول
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline" className="rounded-md">
          <Link href="/panel/products">
            <TrendingUp size={15} className="ms-1" /> نردبان آگهی از محصولات من <ArrowLeft size={13} />
          </Link>
        </Button>
      </div>
    </ArticleLayout>
  );
}
