import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { ArticleLayout, ArticleP, BulletList, Figure, SectionTitle, StepItem, TipBox } from '../article-kit';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'راهنمای احراز هویت در ایمچ | راهنما',
  description:
    'راهنمای احراز هویت در ایمچ: مدارک لازم (کارت ملی از رو و پشت، سلفی با گواهی دست‌نوشته)، مراحل دوگانه، نمونه تصاویر صحیح و مدرک اختیاری کسب‌وکار (جواز کسب یا آگهی ثبت شرکت).',
  alternates: { canonical: '/help/verify-account' },
};

/** متن گواهی دست‌نوشته — همانند فرم احراز هویت */
const NOTE_TEXT = 'اینجانب ................................، کارت ملی خود را جهت احراز هویت در ایمچ ارسال می‌نمایم.';

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
            برای احراز هویت وارد پنل کاربری خود («ایمچ من») شوید و از منوی کنار صفحه، «احراز هویت» را انتخاب کنید.
          </ArticleP>
        </StepItem>
        <Figure
          src="/help-img/verify/verification-3.png"
          alt="ورود به بخش احراز هویت از پنل کاربری (نمونه باسکول)"
          caption="ورود به بخش احراز هویت از پنل کاربری — نمونه تصویر باسکول"
        />
      </section>

      <StepItem n={2} title="مرحله اول — تصویر کارت ملی (رو و پشت)">
        <ArticleP>
          تصویر <b>روی کارت ملی</b> و <b>پشت کارت ملی</b> صاحب حساب کاربری را طبق نمونه صحیح در قسمت افزودن تصویر
          بارگذاری کنید. توصیه می‌کنیم حتماً به موارد خطای تصاویر دقت کنید (دست روی کارت، بریدگی کارت، تاری و انعکاس)
          و از تکرار این موارد بپرهیزید.
        </ArticleP>
      </StepItem>
      <Figure
        src="/help-img/verify/verification-1.png"
        alt="نمونه تصویر صحیح و نادرست از کارت ملی — راهنمای باسکول"
        caption="نمونه تصویر صحیح و نادرست از کارت ملی — تصویر صحیح: کامل، بدون دست و بدون تاری (نمونه باسکول)"
      />

      <section className="space-y-4">
        <StepItem n={3} title="مرحله دوم — سلفی با گواهی دست‌نوشته">
          <ArticleP>
            گواهی احراز هویت خواسته‌شده را تهیه نمایید و با آن عکس بگیرید و پس از بارگذاری، بر روی دکمه «ارسال نهایی»
            کلیک کنید. سعی شود نوشته گواهی به‌صورت واضح و درشت و تصویر گرفته‌شده طبق نمونه صحیح، واضح باشد.
          </ArticleP>
          <ArticleP>
            کسب‌وکارها و شرکت‌ها می‌توانند در همین گام، تصویر <b>جواز کسب یا آگهی ثبت شرکت (روزنامه رسمی)</b> را نیز
            بارگذاری کنند. ارسال این مدرک اختیاری است و برای جلب اعتماد و اعتبار بیشتر در نزد خریداران توصیه می‌شود.
          </ArticleP>
        </StepItem>
        <div className="rounded-lg border border-primary/25 bg-primary/5 p-4">
          <p className="text-xs font-extrabold text-primary">متن گواهی دست‌نوشته</p>
          <p className="mt-2 rounded-md border border-dashed border-primary/35 bg-card px-3 py-2.5 text-center text-[13px] font-bold leading-7">
            {NOTE_TEXT}
          </p>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            این متن را با ماژیک، درشت و خوانا روی کاغذ سفید بنویسید، کارت ملی را به آن بچسبانید و همراه هر دو، از خودتان
            سلفی واضح بگیرید. متن آماده این گواهی با نام خودتان، در گام دوم فرم احراز هویت نمایش داده می‌شود.
          </p>
        </div>
        <Figure
          src="/help-img/verify/verification-2.png"
          alt="نمونه سلفی صحیح و نادرست با کارت ملی و گواهی دست‌نوشته — راهنمای باسکول"
          caption="نمونه سلفی با کارت ملی چسبیده به گواهی دست‌نوشته — تصویر صحیح: واضح، نزدیک و خوانا (نمونه باسکول)"
        />
      </section>

      <TipBox title="پس از ارسال مدارک">
        پس از انجام ۲ مرحله گفته‌شده و ارسال مدارک، طی حداکثر ۲ روز کاری درستی و صحت مدارک شما توسط کارشناسان ایمچ
        بررسی می‌شود و در صورت عدم وجود نقص در مدارک، احراز هویت شما تایید می‌شود و نشان{' '}
        <ShieldCheck size={12} className="inline translate-y-0.5 text-emerald-600" /> به حساب شما اضافه می‌شود.
      </TipBox>

      <section className="space-y-3">
        <SectionTitle>مدرک کسب‌وکار و شرکت‌ها (اختیاری)</SectionTitle>
        <ArticleP>
          صاحبان کسب‌وکار و شرکت‌هایی که با عنوان تجاری یا برند خود قصد فعالیت در ایمچ را دارند، برای جلوگیری از
          ابهامات تجاری و اعتبار بیشتر در نزد خریداران، می‌توانند علاوه بر مدارک هویتی مدیرعامل یا صاحب برند (گام ۱ و ۲
          بالا)، تصویر <b>جواز کسب</b> یا <b>آگهی ثبت شرکت (روزنامه رسمی)</b> را نیز در گام دوم فرم بارگذاری کنند.
          ارسال این مدرک اختیاری است و در بررسی و تأیید سریع‌تر مدارک شما مؤثر است.
        </ArticleP>
        <div className="rounded-lg border bg-card p-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <p className="text-xs font-extrabold">مدارک مورد نیاز کسب‌وکارها و شرکت‌ها:</p>
          <BulletList
            items={[
              'مدارک هویتی شخصی: روی کارت ملی + پشت کارت ملی + سلفی با گواهی دست‌نوشته (الزامی برای همه)',
              'تصویر جواز کسب یا آگهی ثبت شرکت (روزنامه رسمی) — اختیاری، برای اعتبار بیشتر',
              'سایر موارد مورد نیاز در ادامه انجام مراحل بالا توسط پشتیبان ایمچ به شما اعلام می‌شود.',
            ]}
          />
        </div>
        <ArticleP>
          در صورت نیاز به راهنمایی، از قسمت «ایمچ من» و دکمه گفتگو با پشتیبان اقدام کنید. پشتیبان ایمچ از طریق همین
          قسمت با شما در ارتباط خواهد بود.
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
