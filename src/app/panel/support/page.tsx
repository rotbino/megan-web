'use client';

/**
 * پشتیبانی — عین MHTML باسکول:
 * «سامی جابر عزیز، سلام!» + «پاسخگویی به سوالات شما» + پرسش‌های متداول
 * با تب‌های (فروشندگان/خریداران/احراز هویت) + آکاردئون + «گفتگو با پشتیبان» (توضیحات).
 */

import { useState } from 'react';
import { ChevronDown, LifeBuoy, Send, Users } from 'lucide-react';
import { usePanelProfile } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PanelCard } from '@/components/panel/panel-parts';
import { cn } from '@/lib/utils';

type FaqTab = 'sellers' | 'buyers' | 'verification';

const FAQS: Record<FaqTab, { q: string; a: string }[]> = {
  sellers: [
    {
      q: 'چگونه می توانم برنامه ایمچ را نصب کنم؟',
      a: 'با تلفن همراه خود به وبسایت ایمچ وارد شوید و از صفحه «ایمچ من» گزینه نصب اپلیکیشن را انتخاب کنید؛ از صفحه باز شده اقدام به نصب کنید.',
    },
    {
      q: 'به چه علت آگهی محصول رد می شود؟',
      a: 'آگهی‌های مغایر قوانین، با شماره تماس یا لوگو روی تصاویر، تصاویر بی‌کیفیت یا نامرتبط، و موجودی با مقیاس خرده‌فروشی رد می‌شوند.',
    },
    {
      q: 'چگونه از سرنخ‌های فروش در ایمچ استفاده کنم؟',
      a: 'خریداران پیشنهاد شده تا ۴ ساعت پس از ارسال پیامک، در بخش «خریداران پیشنهادی» قابل مشاهده‌اند؛ می‌توانید چت کنید یا تماس بگیرید.',
    },
    {
      q: 'گزارش و آمار محصولم را از کجا ببینم؟',
      a: 'از صفحه «محصولات من»، ردیف هر آگهی، بازدید و موجودی و کف قیمت را نشان می‌دهد؛ جزئیات کامل در صفحه آگری شما در بازار.',
    },
  ],
  buyers: [
    {
      q: 'تایید درخواست خرید چقدر طول می‌کشد؟',
      a: 'درخواست‌های خرید معمولاً در کمتر از چند ساعت توسط کارشناسان ایمچ بررسی و تایید می‌شوند؛ نتیجه در «درخواست های من» قابل مشاهده است.',
    },
    {
      q: 'چگونه به فروشندگان اعتماد کنم؟',
      a: 'فروشندگان احراز هویت شده با نشان تأیید مشخص می‌شوند؛ در هر صورت معاملات را حضوری انجام دهید و از واریز پول از راه دور خودداری کنید.',
    },
    {
      q: 'چگونه درخواست خرید ثبت کنم؟',
      a: 'از منوی پنل «ثبت درخواست خرید» را انتخاب کنید؛ ابتدا دسته بندی و بعد نوع کالا و میزان نیازمندی را وارد کنید تا قیمت‌ها به شما برسد.',
    },
    {
      q: 'پیامک «فروشنده جدید» آمده ولی در ایمچ پیامی ندارم.',
      a: 'فروشندگان پیشنهادی مرتبط با درخواست شما، از قسمت «پیشنهادی» در پنل قابل مشاهده و دسترسی هستند.',
    },
  ],
  verification: [
    {
      q: 'احراز هویت یعنی چه؟',
      a: 'ارسال مشخصات هویتی صاحب حساب جهت تایید درستی و واقعی بودن هویت افراد؛ افراد احراز شده با نشان ویژه مشخص می‌شوند.',
    },
    {
      q: 'چه مدارکی برای احراز هویت لازم است؟',
      a: 'تصویر کارت ملی و یک سلفی همراه با آن؛ برای حساب‌های حقوقی، مدارک ثبت شرکت نیز لازم است.',
    },
    {
      q: 'احراز هویت چقدر طول می‌کشد؟',
      a: 'پس از ارسال مدارک، بررسی معمولاً در همان روز کاری انجام می‌شود و نتیجه به شما اعلام می‌گردد.',
    },
    {
      q: 'چرا احراز هویت لازم است؟',
      a: 'افراد احراز شده طبیعتاً مطمئن‌تر برای انجام معاملات هستند و پاسخ سریع‌تری از طرف مقابل دریافت می‌کنند.',
    },
  ],
};

const TABS: { key: FaqTab; label: string }[] = [
  { key: 'sellers', label: 'فروشندگان' },
  { key: 'buyers', label: 'خریداران' },
  { key: 'verification', label: 'احراز هویت' },
];

export default function SupportPage() {
  const { data: profile } = usePanelProfile();
  const { toast } = useToast();
  const [tab, setTab] = useState<FaqTab>('buyers');
  const [open, setOpen] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  const firstName = profile?.userInfo.firstName ?? 'کاربر';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-extrabold">
          {firstName} عزیز، سلام!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">پاسخگویی به سوالات شما</p>
      </div>

      {/* پرسش‌های متداول */}
      <PanelCard>
        <div className="flex items-center gap-2">
          <Users size={16} className="text-primary" />
          <p className="text-sm font-bold">پرسش‌های متداول</p>
        </div>

        {/* تب‌ها */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setTab(key);
                setOpen(null);
              }}
              className={cn(
                'shrink-0 rounded-md border px-3.5 py-1.5 text-xs font-bold transition-colors',
                tab === key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:border-primary/40',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* آکاردئون پرسش‌ها */}
        <div className="mt-3 divide-y divide-border/70 rounded-md border">
          {FAQS[tab].map(({ q, a }) => {
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
                {isOpen && (
                  <p className="px-4 pb-3.5 text-xs leading-6 text-muted-foreground">{a}</p>
                )}
              </div>
            );
          })}
        </div>
      </PanelCard>

      {/* گفتگو با پشتیبان */}
      <PanelCard>
        <div className="flex items-center gap-2">
          <LifeBuoy size={16} className="text-primary" />
          <p className="text-sm font-bold">گفتگو با پشتیبان</p>
        </div>
        <p className="mt-1 text-xs leading-6 text-muted-foreground">
          پاسخ پرسش خود را پیدا نکردید؟ برای راهنمایی بیشتر و یا اعلام مشکل خود، توضیحات را بنویسید.
        </p>
        <Textarea
          dir="rtl"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="mt-3 resize-none text-sm leading-7"
          placeholder="توضیحات"
        />
        <Button
          size="sm"
          className="mt-3 rounded-md"
          disabled={message.trim().length < 5}
          onClick={() => {
            toast({ description: 'پیام شما برای پشتیبانی ارسال شد؛ به‌زودی پاسخ می‌گیرید.' });
            setMessage('');
          }}
        >
          <Send size={14} /> ارسال پیام
        </Button>
      </PanelCard>
    </div>
  );
}
