import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { ArticleLayout, ArticleP, BulletList, Figure, SectionTitle, StepItem, TipBox } from '../article-kit';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'راهنمای احراز هویت در ایمچ | راهنما',
  description:
    'راهنمای احراز هویت حقیقی و حقوقی در ایمچ: مدارک لازم، مراحل دوگانه ارسال کارت ملی و گواهی، و مدارک اشخاص حقوقی.',
  alternates: { canonical: '/help/verify-account' },
};

export default function VerifyAccountPage() {
  return (
    <ArticleLayout
      title="راهنمای احراز هویت در ایمچ"
      intro="احراز هویت یعنی ارسال مشخصات هویتی صاحب حساب کاربری ایمچ، جهت تایید درستی و واقعی بودن هویت افراد."
      crumbs={[{ label: 'راهنما', href: '/help' }, { label: 'حساب کاربری' }, { label: 'احراز هویت' }]}
    >
      <ArticleP>
        افراد احراز هویت‌شده، افرادی هستند که ایمچ نام و مشخصات آن‌ها را با تصویر صاحب حساب مطابقت داده و مدارکشان نزد
        ایمچ می‌باشد. احراز هویت در ایمچ طی یک فرآیند دو مرحله‌ای ساده انجام می‌گیرد. افراد احراز هویت‌شده با نماد{' '}
        <ShieldCheck size={13} className="inline translate-y-0.5 text-emerald-600" aria-label="نشان احراز هویت" /> در ایمچ مشخص
        می‌شوند و طبیعتاً افرادی مطمئن‌تر برای انجام معاملات هستند.
      </ArticleP>

      <section className="space-y-4">
        <StepItem n={1} title="ورود به صفحه احراز هویت">
          <ArticleP>
            برای احراز هویت وارد پنل کاربری خود («ایمچ من») شوید و از منوی سمت راست صفحه، «احراز هویت» را انتخاب کنید.
          </ArticleP>
        </StepItem>
        <Figure
          src="/help-img/verification.png"
          alt="فرم احراز هویت ایمچ — بارگذاری تصویر کارت ملی و سلفی با گواهی"
          caption="صفحه احراز هویت در پنل کاربری ایمچ — دو مرحله بارگذاری مدارک."
        />
      </section>

      <StepItem n={2} title="مرحله اول — تصویر کارت ملی">
        <ArticleP>
          تصویر کارت ملی صاحب حساب کاربری را طبق نمونه صحیح در قسمت افزودن تصویر بارگذاری کنید. توصیه می‌کنیم حتماً به
          موارد خطای تصاویر دقت کنید و از تکرار این موارد بپرهیزید.
        </ArticleP>
      </StepItem>

      <StepItem n={3} title="مرحله دوم — گواهی احراز هویت">
        <ArticleP>
          گواهی احراز هویت خواسته‌شده را تهیه نمایید و با آن عکس بگیرید و پس از بارگذاری، بر روی دکمه «ارسال نهایی»
          کلیک کنید. سعی شود نوشته گواهی به‌صورت واضح و درشت و تصویر گرفته‌شده طبق نمونه صحیح، واضح باشد.
        </ArticleP>
      </StepItem>

      <TipBox title="پس از ارسال مدارک">
        پس از انجام ۲ مرحله گفته‌شده و ارسال مدارک، طی حداکثر ۲ روز کاری درستی و صحت مدارک شما توسط کارشناسان ایمچ
        بررسی می‌شود و در صورت عدم وجود نقص در مدارک، احراز هویت شما تایید می‌شود و نشان{' '}
        <ShieldCheck size={12} className="inline translate-y-0.5 text-emerald-600" /> به حساب شما اضافه می‌شود.
      </TipBox>

      <section className="space-y-3">
        <SectionTitle>مدارک لازم جهت احراز هویت اشخاص حقوقی</SectionTitle>
        <ArticleP>
          صاحبان حساب کاربری ایمچ که با عنوان شرکت تجاری یا برندشان قصد فعالیت در ایمچ را دارند، جهت جلوگیری از
          ابهامات تجاری، نیاز است علاوه بر ارسال مدارک هویتی مدیرعامل و یا صاحب برند، مدارک ثبت شرکت و یا جواز کسب را
          برای پشتیبانی ایمچ ارسال نمایند. در غیر این صورت ایمچ حساب کاربری ایشان را تا انجام فرآیند کامل احراز هویت
          به حالت تعلیق در خواهد آورد.
        </ArticleP>
        <div className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-xs font-extrabold">مدارک مورد نیاز:</p>
          <BulletList
            items={[
              'تصویر کارت ملی مدیرعامل',
              'تصویر یک گواهی دست‌نوشته به همراه خود مدیرعامل',
              'تصویر آگهی ثبت شرکت (روزنامه رسمی)',
              'سایر موارد مورد نیاز در ادامه انجام مراحل بالا توسط پشتیبان ایمچ به شما اعلام می‌شود.',
            ]}
          />
        </div>
        <ArticleP>
          کاربران می‌توانند از قسمت «ایمچ من» و دکمه گفتگو با پشتیبان، اقدام به ارسال مدارک خود فرمایند. پشتیبان ایمچ از
          طریق همین قسمت با شما در ارتباط خواهد بود.
        </ArticleP>
      </section>

      <div className="flex flex-wrap items-center justify-center gap-2 rounded-lg border border-primary/25 bg-primary/5 p-5">
        <Button asChild size="sm" className="rounded-md">
          <Link href="/panel/verification">
            <ShieldCheck size={15} className="ms-1" /> شروع احراز هویت
          </Link>
        </Button>
      </div>
    </ArticleLayout>
  );
}
