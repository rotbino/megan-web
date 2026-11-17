'use client';

import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Factory,
  Info,
  Loader2,
  ShoppingBasket,
  Sprout,
  Store,
  Truck,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/mock/auth';
import { apiFetch } from '@/lib/api/client';
import { cn } from '@/lib/utils';

/**
 * سرویس‌های تخصصی ایمچ برای فروش عمده (بازطراحی ۱۷-۱۱):
 * صفحهٔ معرفی طرح‌های آیندهٔ ایمچ — همهٔ سرویس‌ها فعلاً در مرحلهٔ
 * «ثبت‌نام و نیازسنجی» هستند و هنوز اجرا نشده‌اند؛ علاقه‌مندان با یکی
 * از دو دکمهٔ هر طرح (خریدار / فروشنده) اعلام علاقه‌مندی می‌کنند.
 *  • میدان‌یار — تأمین بار میدان‌های تره‌بار و خریداران بزرگ کشاورزی
 *  • خرید از کارخانه — خرید تکی به قیمت تولید از تولیدکننده/واردکننده
 *  • پخشیار — اتصال خرده‌فروشان به تولیدکننده و واردکنندهٔ دست اول
 *  • همخرید — تجمیع نیاز هر شهر و مناقصهٔ تأمین‌کنندگان
 * فرم سریع است: فقط صنف الزامی است (نام کسب‌وکار اختیاری)؛ نام و موبایل
 * از حساب کاربر خوانده می‌شود. هر کاربر در هر سرویس یک رکورد دارد —
 * ثبت با نقش دوم، نقش را به «خریدار و فروشنده» ارتقا می‌دهد.
 * مهمان اول به مودال ورود/ثبت‌نام ایمچ هدایت می‌شود (نیات service-signup)
 * و بعد از ورود، فرم همان سرویس و همان نقشی که انتخاب کرده باز می‌شود.
 * دادهٔ پایلوت localStorage نسخهٔ قبل (فقط فروشنده)، یک‌بار بی‌صدا با نقش
 * فروشنده به سرور منتقل و پاک می‌شود.
 */

const STORAGE_KEY = 'imach:service-signup';

/** نقش ثبت‌شده — both یعنی با هر دو نقش اعلام علاقه کرده */
type SignupRole = 'buyer' | 'seller' | 'both';

interface ServiceSignup {
  role: SignupRole;
  guild: string;
  business: string;
  at: number;
}

/** قرارداد ردیف بک‌اند — POST /service-signups/getMine و save */
interface ServiceSignupRow {
  serviceId: string;
  role: SignupRole;
  guild: string;
  businessName: string;
  updatedAt: string;
}

interface ServiceDef {
  id: string;
  title: string;
  /** توضیح کوتاه — زیر عنوان سرویس */
  tagline: string;
  /** توضیح بلند چند خطی — تعریف کامل طرح */
  description: string;
  icon: typeof Store;
  /** رنگ تم کارت — کلاس‌های tailwind برای کاشی آیکون */
  tile: string;
  badge: string;
  /** نکات کلیدی سرویس */
  points: string[];
}

const ROLE_LABEL: Record<SignupRole, string> = {
  buyer: 'خریدار',
  seller: 'فروشنده',
  both: 'خریدار و فروشنده',
};

/** نقش دکمه‌ای که کاربر کلیک کرده — مقدار مجاز ارسال به بک‌اند */
type ButtonRole = 'buyer' | 'seller';

/** آیا ثبت‌نام موجود، این نقش را پوشش می‌دهد؟ */
const hasRole = (s: ServiceSignup | undefined, role: ButtonRole) =>
  Boolean(s && (s.role === role || s.role === 'both'));

/** ۴ طرح صفحهٔ /services — اسامی و توضیحات از مالک (۱۷-۱۱) */
const SERVICES: ServiceDef[] = [
  {
    id: 'maidan-yar',
    title: 'سرویس میدان‌یار',
    tagline: 'سرویس تأمین بار میدان‌های تره‌بار و خریداران بزرگ محصولات کشاورزی',
    description:
      'میدان‌یار کشاورزان و تأمین‌کنندگان محصولات کشاورزی را مستقیماً به بارفروشان میدان‌های تره‌بار وصل می‌کند؛ همچنین هر کارخانه یا صادرکننده‌ای که به محصولات کشاورزی در حد تناژ نیاز دارد می‌تواند از این سرویس استفاده کند. ایمچ به‌عنوان واسطهٔ امانی میان خریدار و فروشنده قرار می‌گیرد.',
    icon: Sprout,
    tile: 'bg-emerald-50 text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700',
    points: [
      'اتصال مستقیم کشاورز و تأمین‌کننده به بارفروشان میدان‌های تره‌بار',
      'مناسب کارخانه‌ها و صادرکنندگانی که به محصولات کشاورزی در حد تناژ نیاز دارند',
      'ایمچ به‌عنوان واسطهٔ امانی، معامله را امن و قابل پیگیری می‌کند',
    ],
  },
  {
    id: 'factory-buy',
    title: 'سرویس خرید از کارخانه',
    tagline: 'سرویس خرید تکی به قیمت تولید',
    description:
      'این سرویس خریداران و حتی مصرف‌کنندگان را مستقیماً به تولیدکنندگان و واردکنندگان کالاهای خاص وصل می‌کند تا بتوانند کالا را به قیمت خرید اما به‌صورت تکی یا در حجم کم خریداری کنند.',
    icon: Factory,
    tile: 'bg-sky-50 text-sky-600',
    badge: 'bg-sky-50 text-sky-700',
    points: [
      'خرید مستقیم از تولیدکننده و واردکنندهٔ کالاهای خاص، بدون واسطه',
      'قیمت تولید برای خرید تکی یا حجم کم',
      'دسترسی خریدار و مصرف‌کننده به قیمت درب کارخانه',
    ],
  },
  {
    id: 'pakhshyar',
    title: 'سرویس پخشیار',
    tagline: 'سرویس اتصال خرده‌فروشان به تولیدکننده و واردکننده',
    description:
      'پخشیار خرده‌فروشان را مستقیماً به تولیدکنندگان و واردکنندگان دست اول وصل می‌کند؛ به‌خصوص تولیدکنندگان هم‌شهری که نزدیک‌ترین و مقرون‌به‌صرفه‌ترین منبع تأمین هر شهر هستند.',
    icon: Truck,
    tile: 'bg-amber-50 text-amber-600',
    badge: 'bg-amber-50 text-amber-700',
    points: [
      'تأمین مستقیم خرده‌فروش از تولیدکننده و واردکنندهٔ دست اول',
      'تأکید ویژه بر تولیدکنندگان هم‌شهری — حمل سریع‌تر و هزینهٔ کمتر',
      'جایگزین زنجیرهٔ چندواسطه‌ای پخش سنتی',
    ],
  },
  {
    id: 'hamkharid',
    title: 'سرویس همخرید',
    tagline: 'سرویس خرید گروهی از تولیدکنندگان و تأمین‌کنندگان',
    description:
      'در این سرویس نیازهای خرده‌فروشان، خریداران و حتی مصرف‌کنندگان هر شهر تجمیع می‌شود و برای تأمین‌کنندگانی که با قیمت بهتر می‌توانند تأمین کنند به مناقصه گذاشته می‌شود.',
    icon: Users,
    tile: 'bg-violet-50 text-violet-600',
    badge: 'bg-violet-50 text-violet-700',
    points: [
      'تجمیع نیازهای خرده‌فروشان، خریداران و مصرف‌کنندگان هر شهر',
      'مناقصه میان تأمین‌کنندگان برای رسیدن به بهترین قیمت',
      'قدرت خرید گروهی، حتی برای خریدار کوچک',
    ],
  },
];

const INPUT_CLASS =
  'h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary';

export function ServicesView() {
  const { user, requireAuth } = useAuth();
  const [registered, setRegistered] = useState<Record<string, ServiceSignup>>({});
  /** سرویس و نقشی که فرم/dialog آن باز است — null یعنی بسته */
  const [active, setActive] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<ButtonRole>('seller');
  /** true = نمای موفقیت (بعد از ثبت یا بازگشینی سرویس ثبت‌شده) */
  const [done, setDone] = useState(false);
  const [guild, setGuild] = useState('');
  const [business, setBusiness] = useState('');
  /** سرویس+نقشی که مهمان روی آن کلیک کرد — بعد از ورود فرم همان باز می‌شود */
  const [pending, setPending] = useState<{ id: string; role: ButtonRole } | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** همگام‌سازی با سرور برای چه کاربری انجام شده (phone) — خروج = ریست */
  const syncedForRef = useRef<string | null>(null);

  // منبع حقیقت ثبت‌نام‌ها بک‌اند است. با ورود کاربر: ثبت‌نام‌های سرور خوانده
  // می‌شوند و دادهٔ پایلوت localStorage (نسخهٔ قبل از بک‌اند — فقط نقش فروشنده)
  // بی‌صدا منتقل و پاک می‌شود. خروج در همین صفحه → دادهٔ کاربر قبلی پاک می‌شود.
  useEffect(() => {
    if (!user) {
      if (syncedForRef.current !== null) {
        syncedForRef.current = null;
        // خروج در همین صفحه: دادهٔ کاربر قبلی نمایش عمومی نمی‌ماند
        setRegistered({});
      }
      return;
    }
    if (syncedForRef.current === user.phone) return;
    syncedForRef.current = user.phone;
    void (async () => {
      // دادهٔ پایلوت محلی — قبل از هر چیز بخوان
      let local: Record<string, { guild: string; business: string; at: number }> = {};
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) local = JSON.parse(raw);
      } catch {
        /* نشست خراب — نادیده */
      }
      try {
        const remote = await apiFetch<ServiceSignupRow[]>('/service-signups/getMine');
        const next: Record<string, ServiceSignup> = {};
        for (const r of remote) {
          if (SERVICES.some((s) => s.id === r.serviceId)) {
            next[r.serviceId] = {
              role: r.role,
              guild: r.guild,
              business: r.businessName,
              at: Date.parse(r.updatedAt) || 0,
            };
          }
        }
        // مهاجرت پایلوت: ثبت‌نام محلیِ هنوز روی سرور نیست → بی‌صدا با نقش
        // فروشنده ارسال (پایلوت قبلی فقط برای فروشنده‌ها بود)
        const missing = Object.entries(local).filter(
          ([id]) => SERVICES.some((s) => s.id === id) && !next[id],
        );
        let allPushed = true;
        if (missing.length > 0) {
          const settled = await Promise.allSettled(
            missing.map(([id, s]) =>
              apiFetch('/service-signups/save', {
                serviceId: id,
                role: 'seller',
                guild: s.guild,
                businessName: s.business,
              }),
            ),
          );
          settled.forEach((res, i) => {
            // موفق یا ناموفق، در نمایش همین جلسه همان مقدار محلی می‌ماند
            next[missing[i][0]] = { role: 'seller', ...missing[i][1] };
            if (res.status === 'rejected') allPushed = false;
          });
        }
        // کش پایلوت فقط وقتی پاک می‌شود که همه‌چیز روی سرور نشسته باشد
        if (allPushed) {
          try {
            localStorage.removeItem(STORAGE_KEY);
          } catch {
            /* noop */
          }
        }
        setRegistered(next);
      } catch {
        /* سرور در دسترس نیست — دادهٔ پایلوت محلی نمایش داده می‌شود */
      }
    })();
  }, [user]);

  // مهمان که بعد از مودال ورود لاگین شد → فرم همان سرویس و نقشی که کلیک
  // کرده باز شود. همان الگوی «تنظیم state هنگام رندر» (بدون افکت — عین
  // edit-item-dialog): پس از صفر شدن pending شرط دیگر برقرار نمی‌شود.
  if (user && pending) {
    const p = pending;
    setPending(null);
    setActive(p.id);
    setActiveRole(p.role);
    setDone(false);
    // اگر با نقش دیگری ثبت‌نام کرده، صنف/کسب‌وکارش پیش‌پر می‌شود
    const prev = registered[p.id];
    setGuild(prev?.guild ?? '');
    setBusiness(prev?.business ?? '');
    setError(null);
    setSaving(false);
  }

  const service = active ? SERVICES.find((s) => s.id === active) ?? null : null;
  const saved = active ? registered[active] : undefined;

  const openForm = (id: string, role: ButtonRole) => {
    setActive(id);
    setActiveRole(role);
    setDone(false);
    // پیش‌پر از ثبت‌نام موجود در همان سرویس (نقش دیگر)
    const prev = registered[id];
    setGuild(prev?.guild ?? '');
    setBusiness(prev?.business ?? '');
    setError(null);
  };

  /** دکمهٔ نقش هر کارت — ثبت‌شده در همان نقش → نمایش وضعیت؛ مهمان → مودال
   *  ورود؛ لاگین → فرم سریع همان نقش */
  const onCta = (id: string, role: ButtonRole) => {
    if (hasRole(registered[id], role)) {
      setActive(id);
      setActiveRole(role);
      setDone(true);
      return;
    }
    if (!requireAuth('service-signup')) {
      setPending({ id, role });
      return;
    }
    openForm(id, role);
  };

  /** ثبت درخواست — ذخیرهٔ واقعی روی بک‌اند (هر کاربر در هر سرویس یک رکورد) */
  const submit = async () => {
    const g = guild.trim();
    const b = business.trim();
    if (!active || !g || saving) return;
    setSaving(true);
    setError(null);
    try {
      const row = await apiFetch<ServiceSignupRow>('/service-signups/save', {
        serviceId: active,
        role: activeRole,
        guild: g,
        businessName: b,
      });
      setRegistered((prev) => ({
        ...prev,
        [active]: {
          role: row?.role ?? activeRole,
          guild: row?.guild ?? g,
          business: row?.businessName ?? b,
          at: Date.now(),
        },
      }));
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ثبت درخواست ناموفق بود — دوباره تلاش کنید.');
    } finally {
      setSaving(false);
    }
  };

  const closeDialog = () => {
    setActive(null);
    setDone(false);
    setError(null);
  };

  const valid = guild.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-6">
      {/* بنر عنوان — طرح‌های آیندهٔ ایمچ، مرحلهٔ ثبت‌نام و نیازسنجی */}
      <header className="overflow-hidden rounded-lg border border-primary/25 bg-gradient-to-bl from-primary/10 via-primary/5 to-transparent px-4 py-8 text-center sm:py-10">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-card px-3 py-1 text-[11px] font-bold text-primary">
          <Info size={13} />
          ۴ طرح در حال ثبت‌نام و نیازسنجی
        </span>
        <h1 className="mt-4 text-xl font-extrabold sm:text-2xl">
          سرویس‌های تخصصی ایمچ برای فروش عمده
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-xs leading-6 text-muted-foreground sm:text-sm sm:leading-7">
          این طرح‌ها ایده‌هایی برای آیندهٔ ایمچ هستند که به‌تدریج اجرا می‌شوند و فعلاً در
          مرحلهٔ ثبت‌نام و نیازسنجی قرار دارند. اگر علاقه‌مند هستید، همین حالا نقش خود را
          در هر طرح اعلام کنید تا با شروع اجرای آن سرویس، جزو اولینهایی باشید که ایمچ با
          شما هماهنگ می‌کند.
        </p>
      </header>

      {/* کارت طرح‌ها — ۴ سرویس، هرکدام دو دکمهٔ خریدار/فروشنده */}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {SERVICES.map((s, idx) => {
          const Icon = s.icon;
          const reg = registered[s.id];
          return (
            <section
              key={s.id}
              className="flex flex-col rounded-lg border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.07)]"
            >
              <div className="flex items-start gap-3">
                <span className={cn('grid size-12 shrink-0 place-items-center rounded-lg', s.tile)}>
                  <Icon size={24} />
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pt-1.5">
                  <h2 className="text-base font-extrabold">{s.title}</h2>
                  <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', s.badge)}>
                    در حال نیازسنجی
                  </span>
                  <span className="ms-auto pt-0.5 text-xs font-black text-muted-foreground/40" aria-hidden>
                    {['۰۱', '۰۲', '۰۳', '۰۴'][idx]}
                  </span>
                </div>
              </div>

              {/* توضیح کوتاه — یک خط تعریف طرح */}
              <p className="mt-4 rounded-md bg-secondary/60 px-3.5 py-2.5 text-[13px] font-bold leading-6">
                {s.tagline}
              </p>

              {/* توضیح بلند — تعریف کامل سرویس */}
              <p className="mt-3 text-[13px] leading-7 text-foreground/85">{s.description}</p>

              {/* نکات کلیدی — چه چیزی حل می‌شود */}
              <ul className="mt-3 space-y-2 text-[13px] leading-6 text-muted-foreground">
                {s.points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-primary/50" aria-hidden />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              {/* دو دکمهٔ ثبت‌نام — خریدار / فروشنده */}
              <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
                <Button
                  variant={hasRole(reg, 'buyer') ? 'outline' : 'secondary'}
                  className={cn(
                    'h-auto rounded-md whitespace-normal py-2.5 text-[13px] leading-6',
                    hasRole(reg, 'buyer') && 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800',
                  )}
                  onClick={() => onCta(s.id, 'buyer')}
                >
                  {hasRole(reg, 'buyer') ? (
                    <CheckCircle2 size={16} className="me-1.5 shrink-0 text-emerald-500" />
                  ) : (
                    <ShoppingBasket size={15} className="me-1.5 shrink-0" />
                  )}
                  {hasRole(reg, 'buyer') ? 'ثبت‌نام خریدار دریافت شد' : 'علاقه‌مند به‌عنوان خریدار'}
                </Button>
                <Button
                  className="h-auto rounded-md whitespace-normal py-2.5 text-[13px] leading-6"
                  onClick={() => onCta(s.id, 'seller')}
                >
                  {hasRole(reg, 'seller') ? (
                    <CheckCircle2 size={16} className="me-1.5 shrink-0 text-emerald-500" />
                  ) : (
                    <Store size={15} className="me-1.5 shrink-0" />
                  )}
                  {hasRole(reg, 'seller') ? 'ثبت‌نام فروشنده دریافت شد' : 'علاقه‌مند به‌عنوان فروشنده'}
                </Button>
              </div>
            </section>
          );
        })}
      </div>

      {/* توضیح فرآیند — ثبت‌نام یعنی چه */}
      <p className="mt-6 flex items-center justify-center gap-2 rounded-lg border bg-card p-4 text-center text-xs leading-6 text-muted-foreground">
        <Info size={15} className="shrink-0 text-primary" />
        ثبت‌نام، اعلام علاقه‌مندی و شرکت در نیازسنجی است؛ اجرای سرویس‌ها به‌تدریج و بر اساس
        همین استقبال اولویت‌بندی می‌شود و ایمچ پیش از شروع هر طرح با شما هماهنگ می‌کند.
      </p>

      {/* فرم سریع ثبت‌نام — نقش (از دکمهٔ کلیک‌شده) + صنف + کسب‌وکار اختیاری */}
      <Dialog open={Boolean(service)} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="rounded-lg sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-start">ثبت‌نام در {service?.title}</DialogTitle>
          </DialogHeader>

          {service && done && saved ? (
            /* نمای موفقیت — چیزی که ثبت شده */
            <div className="space-y-4">
              <div className="text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-500">
                  <CheckCircle2 size={28} />
                </span>
                <p className="mt-3 text-sm font-extrabold">
                  ثبت‌نام شما به‌عنوان {ROLE_LABEL[saved.role]} دریافت شد
                </p>
              </div>
              <div className="space-y-2 rounded-md bg-secondary/60 p-3.5 text-[13px]">
                <p className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-muted-foreground">نقش</span>
                  <span className="text-end font-bold">{ROLE_LABEL[saved.role]}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-muted-foreground">صنف</span>
                  <span className="text-end font-bold">{saved.guild}</span>
                </p>
                {saved.business ? (
                  <p className="flex items-center justify-between gap-3">
                    <span className="shrink-0 text-muted-foreground">نام کسب‌وکار</span>
                    <span className="text-end font-bold">{saved.business}</span>
                  </p>
                ) : null}
              </div>
              <p className="text-xs leading-6 text-muted-foreground">
                {service.title} هنوز اجرا نشده و فعلاً در مرحلهٔ ثبت‌نام و نیازسنجی است؛ با
                شروع اجرای طرح، ایمچ برای هماهنگی مراحل بعد با شما در تماس است.
              </p>
              <DialogFooter className="justify-center">
                <Button className="rounded-md" onClick={closeDialog}>
                  متوجه شدم
                </Button>
              </DialogFooter>
            </div>
          ) : service ? (
            /* فرم سریع — فقط صنف الزامی است */
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold',
                    activeRole === 'buyer'
                      ? 'bg-emerald-50 text-emerald-700'
                      : 'bg-sky-50 text-sky-700',
                  )}
                >
                  {activeRole === 'buyer' ? <ShoppingBasket size={13} /> : <Store size={13} />}
                  نقش شما: {activeRole === 'buyer' ? 'خریدار' : 'فروشنده'}
                </span>
              </div>
              <p className="text-xs leading-6 text-muted-foreground">
                فقط چند ثانیه طول می‌کشد — صنف خود را وارد کنید و ثبت کنید. نام و شمارهٔ
                موبایل از حساب کاربری شما خوانده می‌شود.
              </p>
              <div>
                <label
                  htmlFor={`svc-guild-${service.id}`}
                  className="mb-1.5 block text-xs font-bold text-muted-foreground"
                >
                  صنف <span className="text-destructive">*</span>
                </label>
                <input
                  id={`svc-guild-${service.id}`}
                  value={guild}
                  onChange={(e) => setGuild(e.target.value)}
                  placeholder={
                    activeRole === 'buyer'
                      ? 'مثلاً سوپرمارکت، رستوران یا خرده‌فروش'
                      : 'مثلاً تولیدکنندهٔ لبنیات'
                  }
                  aria-label="صنف"
                  maxLength={60}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label
                  htmlFor={`svc-biz-${service.id}`}
                  className="mb-1.5 block text-xs font-bold text-muted-foreground"
                >
                  نام کسب‌وکار <span className="font-normal">(اختیاری)</span>
                </label>
                <input
                  id={`svc-biz-${service.id}`}
                  value={business}
                  onChange={(e) => setBusiness(e.target.value)}
                  placeholder="مثلاً تولیدی نگین"
                  aria-label="نام کسب‌وکار"
                  maxLength={80}
                  className={INPUT_CLASS}
                />
              </div>
              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-xs font-bold leading-5 text-destructive">
                  {error}
                </p>
              )}
              <DialogFooter className="gap-2">
                <Button variant="outline" className="rounded-md" onClick={closeDialog} disabled={saving}>
                  انصراف
                </Button>
                <Button className="rounded-md" disabled={!valid || saving} onClick={submit}>
                  {saving ? <Loader2 size={14} className="me-1.5 animate-spin" /> : null}
                  {saving ? 'در حال ثبت…' : 'ثبت درخواست'}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
