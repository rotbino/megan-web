/**
 * متن قرارداد بازاریابی ایمچ — با مقادیر داینامیک از تنظیمات (درصد سهم،
 * تعداد سال‌ها و منابع پرداخت مشمول کمیسیون). با تغییر تنظیمات ادمین،
 * متن قراردادِ کاربران جدید به‌روز می‌شود؛ شرایط بازاریاب‌های فعلی
 * (snapshot ثبت‌شده هنگام پذیرش) تغییر نمی‌کند.
 */

import type { AffiliateSettings } from '@/lib/affiliate';
import { toFa } from '@/lib/format';

export function ContractText({ settings }: { settings: AffiliateSettings }) {
  const sources: string[] = [];
  if (settings.commissionOnPackage) sources.push('خرید بسته‌های عضویت');
  if (settings.commissionOnWalletCharge) sources.push('شارژ کیف پول');
  const sourcesText = sources.length ? sources.join(' و ') : 'فعلاً هیچ منبعی فعال نیست';

  const clauses: { title: string; body: string }[] = [
    {
      title: 'موضوع قرارداد',
      body:
        'کاربر (بازاریاب) با کد رفرال اختصاصی خود، مشتریان را از طریق لینک دعوت به ایمچ معرفی می‌کند. ' +
        'نقش «بازاریاب» نقشی سیستمی و کاملاً مستقل از نقش کاربر در بازار (خریدار، فروشنده، عمده‌فروش و...) است و برای هر کاربری قابل فعال‌سازی است.',
    },
    {
      title: `سهم بازاریاب — ${toFa(settings.level1Percent)}٪`,
      body:
        `از مبلغ هر پرداخت تاییدشده‌ی مشتریان معرفی‌شده (دعوت‌شده‌ها)، معادل ${toFa(settings.level1Percent)}٪ به کیف پول ایمچ بازاریاب واریز می‌شود. ` +
        'واریز پس از تایید پرداخت مشتری (فیش یا درگاه) انجام می‌شود؛ تا پیش از تایید، سهم در وضعیت «در انتظار» است.',
    },
    {
      title: `سهم مدیر بازاریابی از زیرمجموعه‌ها — ${toFa(settings.level2Percent)}٪`,
      body:
        `در صورتی که ادمین نقش «مدیر بازاریابی» به کاربر بدهد، علاوه بر سهم مستقیم (${toFa(settings.level1Percent)}٪)، ` +
        `از مبلغ هر پرداخت تاییدشده‌ی مشتریانِ بازاریابان زیرمجموعه‌ی او نیز ${toFa(settings.level2Percent)}٪ به کیف پول وی واریز می‌شود. ` +
        `مدیر بازاریابی می‌تواند مستقیم هم مشتری دعوت کند و سهم مستقیم او جدا از سهم زیرمجموعه‌ها محاسبه می‌شود.`,
    },
    {
      title: 'پرداخت‌های مشمول کمیسیون',
      body: `کمیسیون فقط به پرداخت‌های زیر تعلق می‌گیرد: ${sourcesText}. سایر پرداخت‌ها مشمول سهم بازاریاب نیستند.`,
    },
    {
      title: `مدت سهم‌بری — ${toFa(settings.commissionYears)} سال`,
      body: `از تاریخ ثبت‌نام هر مشتری، به مدت ${toFa(settings.commissionYears)} سال پرداخت‌های او مشمول سهم بازاریاب معرفی‌کننده است؛ پس از آن سهمی تعلق نمی‌گیرد.`,
    },
    {
      title: 'ثبت شرایط قرارداد',
      body:
        'شرایط این قرارداد (درصدها، منابع پرداخت و مدت سهم‌بری) در همین لحظه‌ی پذیرش برای بازاریاب ثبت می‌شود. ' +
        'تغییرات آتی تنظیمات برنامه فقط روی قرارداد بازاریاب‌های جدید اعمال می‌شود و شرایط بازاریاب‌های فعلی را تغییر نمی‌دهد.',
    },
    {
      title: 'تعهدات بازاریاب',
      body:
        'بازاریاب متعهد است از ارسال تبلیغات مزاحم و اسپم، ارائه اطلاعات غلط و هر اقدام خلاف قوانین ایمچ پرهیز کند. ' +
        'در صورت تخلف، ادمین می‌تواند حساب بازاریابی را غیرفعال کند.',
    },
  ];

  return (
    <div className="space-y-3 text-xs leading-6 text-foreground/85">
      <p className="font-bold text-foreground">قرارداد همکاری در فروش (بازاریابی) ایمچ</p>
      <ol className="space-y-2.5">
        {clauses.map((c, i) => (
          <li key={c.title} className="flex gap-2">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
              {toFa(i + 1)}
            </span>
            <span>
              <b className="text-foreground">{c.title}:</b> {c.body}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
