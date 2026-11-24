import type { Metadata } from 'next';
import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { ArticleLayout, ArticleP, Figure, SectionTitle, StepItem, TipBox } from '../article-kit';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'راهنمای ثبت درخواست خرید | راهنمای خریداران ایمچ',
  description:
    'راهنمای گام‌به‌گام ثبت درخواست خرید در ایمچ با تصویر: انتخاب دسته‌بندی، اطلاعات محصول مورد نیاز، پیگیری روند تایید یا رد درخواست.',
  alternates: { canonical: '/help/post-rfq' },
};

export default function PostRfqPage() {
  return (
    <ArticleLayout
      title="راهنمای ثبت درخواست خرید"
      intro="تنها با ثبت یک درخواست خرید، ایمچ تمامی آگهی‌های محصول مورد نظر شما را دسته‌بندی‌شده نمایش می‌دهد."
      crumbs={[{ label: 'راهنما', href: '/help' }, { label: 'خرید محصول' }, { label: 'ثبت درخواست خرید' }]}
    >
      <ArticleP>
        در صورتی که خریدار محصولی هستید، تنها با ثبت یک درخواست خرید، ایمچ تمامی آگهی‌های محصول مورد نظر شما را به
        صورت دسته‌بندی‌شده برای شما نمایش می‌دهد. همچنین به مرتبط‌ترین فروشندگان برای محصول درخواستی شما پیامک ارسال
        کرده و ایشان را از درخواست خرید شما مطلع می‌سازد. بنابراین فروشندگان در سریع‌ترین زمان با شما تماس برقرار
        خواهند کرد.
      </ArticleP>

      <StepItem n={1} title="ورود به فرم ثبت درخواست">
        <ArticleP>
          بعد از ثبت‌نام به عنوان خریدار در ایمچ، برای ثبت درخواست خرید ابتدا از پنل کاربری خریدار و از منوی سمت راست
          صفحه، گزینه «ثبت درخواست خرید» را انتخاب کنید.
        </ArticleP>
      </StepItem>

      <section className="space-y-4">
        <StepItem n={2} title="انتخاب دسته‌بندی">
          <ArticleP>
            در صفحه ثبت درخواست خرید، در اولین مرحله، دسته‌بندی مناسب محصول خود را از دسته‌های نام‌برده‌شده انتخاب
            کنید. در صورتی که از قسمت دسته‌بندی‌ها محصول مورد نظر خود را نیافتید، از قسمت جستجو با زدن نام محصول خود،
            دسته‌بندی درست را از بین گزینه‌های پیشنهادی پیدا کنید.
          </ArticleP>
        </StepItem>
        <Figure
          src="/help-img/rfq-step1.png"
          alt="مرحله انتخاب دسته‌بندی در فرم ثبت درخواست خرید ایمچ"
          caption="مرحله اول ثبت درخواست خرید — انتخاب دسته اصلی، زیردسته و نوع کالا."
        />
      </section>

      <section className="space-y-4">
        <StepItem n={3} title="اطلاعات محصول مورد نیاز">
          <ArticleP>
            در مرحله بعد، اطلاعات محصولی را که قصد خرید آن را دارید وارد کنید. الگوریتم‌های جستجوی فروشنده در ایمچ،
            طبق اطلاعات داده‌شده شما در این فرم، فروشندگان را برای شما جستجو می‌کند.
          </ArticleP>
        </StepItem>
        <Figure
          src="/help-img/rfq-step2.png"
          alt="فرم اطلاعات درخواست خرید — نوع، میزان نیازمندی و سابقه خرید"
          caption="مرحله دوم ثبت درخواست خرید — میزان نیازمندی، سابقه خرید عمده و هدف خرید."
        />
        <TipBox title="تذکر" tone="warn">
          میزان نامناسب مقدار مورد نیاز محصول (مقیاس‌های خرده‌فروشی) قابل قبول نیست — عمده بخرید، ارزان‌تر بخرید.
        </TipBox>
      </section>

      <StepItem n={4} title="مشاهده فروشندگان">
        <ArticleP>
          پس از ثبت درخواست، به صفحه فروشندگان محصول مورد نظر خود هدایت خواهید شد و می‌توانید آگهی‌ها را بررسی و با
          فروشندگان ارتباط برقرار کنید.
        </ArticleP>
      </StepItem>

      <section className="space-y-4">
        <SectionTitle>پیگیری روند ثبت درخواست</SectionTitle>
        <ArticleP>
          برای پیگیری روند تایید یا رد درخواست خرید خود، از صفحه «ایمچ من» در پنل کاربری خریدار، گزینه «درخواست‌های من»
          را انتخاب کنید. در صفحه درخواست‌های من، روند تایید درخواست خرید شما با سه زبانه «تایید شده»، «در انتظار
          تایید» و «رد شده» مشخص شده‌اند.
        </ArticleP>
        <TipBox title="چه درخواست‌هایی رد می‌شوند؟" tone="warn">
          درخواست‌هایی که تکراری باشند و یا میزان نامناسب مقدار مورد نیاز محصول برای آن‌ها وارد شده باشد (مقیاس‌های
          خرده‌فروشی قابل قبول نیستند)، توسط کارشناسان ایمچ رد می‌شوند.
        </TipBox>
        <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/5 p-5">
          <Button asChild size="sm" className="rounded-md">
            <Link href="/panel/buy-requests/new">
              <ClipboardList size={15} className="ms-1" /> ثبت درخواست خرید
            </Link>
          </Button>
          <Button asChild size="sm" variant="outline" className="rounded-md">
            <Link href="/buyAd-requests">مشاهده درخواست‌های خرید</Link>
          </Button>
        </div>
      </section>
    </ArticleLayout>
  );
}
