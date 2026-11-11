'use client';

import { useEffect, useRef, useState } from 'react';
import { BadgePercent, CheckCircle2, Info, Loader2, Store, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/mock/auth';
import { apiFetch } from '@/lib/api/client';
import { cn } from '@/lib/utils';

/**
 * سرویس‌های تخصصی ارزش‌افزوده ایمچ (خواستهٔ مالک ۱۱-۱۲ — دور ۲):
 * چارچوب سرویس‌های تخصصی عمده‌فروشی برای آینده — فعلاً فقط فرم و عنوان سرویس‌ها:
 *  • ریتو — سفارش‌گیری مستقیم خرده‌فروش از تولیدکنندگان به قیمت تولید
 *  • همخرید — خرید گروهی از تولیدکنندگان به قیمت تولید
 *  • فرصت‌های خرید ویژه (به‌زودی) — کالای مازاد و تخفیف‌های ویژهٔ تأمین‌کنندگان
 *    (از تحلیل ایده‌های ارزش‌افزوده مالک ۱۱-۱۲ — اعلام مسیر، بدون فرم)
 * فروشنده‌ها با دکمهٔ روی باکس سرویس ثبت‌نام می‌کنند (صنف + نام کسب‌وکار)؛
 * مهمان اول به مودال ورود/ثبت‌نام ایمچ هدایت می‌شود (نیات service-signup)
 * و بعد از ورود، فرم همان سرویسی که انتخاب کرده بود باز می‌شود.
 * ثبت‌نام‌ها در بک‌اند ذخیره می‌شوند (service-signups — مالک از پنل ادمین
 * می‌بیند هر سرویس چه کسانی ثبت‌نام کرده‌اند). دادهٔ پایلوت localStorage
 * نسخهٔ قبل، یک‌بار بی‌صدا به سرور منتقل و پاک می‌شود.
 */

const STORAGE_KEY = 'imach:service-signup';

interface ServiceSignup {
  guild: string;
  business: string;
  at: number;
}

/** قرارداد ردیف بک‌اند — POST /service-signups/getMine و save */
interface ServiceSignupRow {
  serviceId: string;
  guild: string;
  businessName: string;
  updatedAt: string;
}

interface ServiceDef {
  id: string;
  title: string;
  tagline: string;
  icon: typeof Store;
  /** active = فرم ثبت‌نام باز است؛ soon = فقط اعلام مسیر (بدون دکمه) */
  status: 'active' | 'soon';
  /** نکات کلیدی سرویس — زیر شرح رسمی */
  points: string[];
}

/** سرویس‌های صفحه — شرح هر سرویس فعال همان تعریف رسمی خودش است */
const SERVICES: ServiceDef[] = [
  {
    id: 'ritu',
    status: 'active',
    title: 'سرویس ریتو',
    tagline: 'سفارش‌گیری مستقیم خرده‌فروش از تولیدکنندگان به قیمت تولید',
    icon: Store,
    points: [
      'قیمت درب کارخانه شفاف و قابل مقایسه',
      'حداقل سفارش و شرایط حمل و تحویل مشخص',
      'ارتباط مستقیم خرده‌فروش با تولیدکننده، بدون واسطه‌های غیرضروری',
    ],
  },
  {
    id: 'hamkharid',
    status: 'active',
    title: 'سرویس همخرید',
    tagline: 'خرید گروهی از تولیدکنندگان به قیمت تولید',
    icon: Users,
    points: [
      'تجمیع سفارش فروشگاه‌ها برای رسیدن به حجم تخفیف تولیدکننده',
      'هر فروشگاه سهم خود را از محل توافق‌شده تحویل می‌گیرد',
      'قدرت خرید گروهی با قیمت تولید، برای خریدار کوچک',
    ],
  },
  {
    id: 'special-offers',
    status: 'soon',
    title: 'فرصت‌های خرید ویژه',
    tagline: 'عرضهٔ کالای مازاد و تخفیف‌های ویژهٔ تولیدکنندگان و شرکت‌های پخش',
    icon: BadgePercent,
    points: [
      'موجودی مازاد تولیدکننده‌ها و بیش‌موجودی شرکت‌های پخش با قیمت ویژه',
      'تخفیف ویژه بدون انتظار برای تکمیل حد نصاب گروهی',
      'فرصت‌های محدود و لحظه‌ای برای خرید ارزان‌تر',
    ],
  },
];

const INPUT_CLASS =
  'h-10 w-full rounded-md border border-input bg-card px-3 text-sm shadow-xs transition-colors placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary';

export function ServicesView() {
  const { user, requireAuth } = useAuth();
  const [registered, setRegistered] = useState<Record<string, ServiceSignup>>({});
  /** سرویسی که فرم/dialog آن باز است — null یعنی بسته */
  const [active, setActive] = useState<string | null>(null);
  /** true = نمای موفقیت (بعد از ثبت یا بازگشایی سرویس ثبت‌شده) */
  const [done, setDone] = useState(false);
  const [guild, setGuild] = useState('');
  const [business, setBusiness] = useState('');
  /** سرویسی که مهمان روی آن کلیک کرد — بعد از ورود فرم همان باز می‌شود */
  const [pendingService, setPendingService] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** همگام‌سازی با سرور برای چه کاربری انجام شده (phone) — خروج = ریست */
  const syncedForRef = useRef<string | null>(null);

  // بازیابی ثبت‌نام‌های پایلوت قبلی از حافظهٔ مرورگر — فقط بعد از مونت
  // (الگوی هیدریشن). بعد از همگام‌سازی موفق با سرور، این کش پاک می‌شود.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // خواندن حافظه مرورگر فقط بعد از مونت ممکن است (الگوی استاندارد هیدریشن)
        setRegistered(JSON.parse(raw));
      }
    } catch {
      /* نشست خراب — نادیده */
    }
  }, []);

  // منبع حقیقت ثبت‌نام‌ها بک‌اند است (خواستهٔ مالک ۱۱-۱۲: داده از مرورگر
  // فروشنده به پنل ادمین برسد). با ورود کاربر: ثبت‌نام‌های سرور خوانده و
  // دادهٔ پایلوت localStorage (نسخهٔ قبل از بک‌اند) بی‌صدا منتقل و پاک می‌شود.
  // خروج در همین صفحه → دادهٔ کاربر قبلی پاک می‌شود (صفحهٔ عمومی است).
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
      let local: Record<string, ServiceSignup> = {};
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
          if (SERVICES.some((s) => s.id === r.serviceId && s.status === 'active')) {
            next[r.serviceId] = {
              guild: r.guild,
              business: r.businessName,
              at: Date.parse(r.updatedAt) || 0,
            };
          }
        }
        // مهاجرت پایلوت: ثبت‌نام محلیِ هنوز روی سرور نیست → بی‌صدا ارسال
        const missing = Object.entries(local).filter(([id]) => !next[id]);
        let allPushed = true;
        if (missing.length > 0) {
          const settled = await Promise.allSettled(
            missing.map(([id, s]) =>
              apiFetch('/service-signups/save', {
                serviceId: id,
                guild: s.guild,
                businessName: s.business,
              }),
            ),
          );
          settled.forEach((res, i) => {
            // موفق یا ناموفق، در نمایش همین جلسه همان مقدار محلی می‌ماند
            next[missing[i][0]] = missing[i][1];
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

  // مهمان که بعد از مودال ورود لاگین شد → فرم همان سرویسی که کلیک کرده بود
  // باز شود. همان الگوی «تنظیم state هنگام رندر» (بدون افکت — عین edit-item-dialog):
  // پس از صفر شدن pendingService شرط دیگر برقرار نمی‌شود و رندر همگرا می‌ماند.
  if (user && pendingService) {
    setPendingService(null);
    setActive(pendingService);
    setDone(false);
    setGuild('');
    setBusiness('');
    setError(null);
    setSaving(false);
  }

  const service = active ? SERVICES.find((s) => s.id === active) ?? null : null;
  const saved = active ? registered[active] : undefined;

  const openForm = (id: string) => {
    setActive(id);
    setDone(false);
    setGuild('');
    setBusiness('');
    setError(null);
  };

  /** دکمهٔ باکس سرویس — ثبت‌شده → نمایش وضعیت؛ مهمان → مودال ورود؛ لاگین → فرم */
  const onCta = (id: string) => {
    if (registered[id]) {
      setActive(id);
      setDone(true);
      return;
    }
    if (!requireAuth('service-signup')) {
      setPendingService(id);
      return;
    }
    openForm(id);
  };

  /** ثبت درخواست — ذخیرهٔ واقعی روی بک‌اند (هر کاربر در هر سرویس یک رکورد) */
  const submit = async () => {
    const g = guild.trim();
    const b = business.trim();
    if (!active || !g || !b || saving) return;
    setSaving(true);
    setError(null);
    try {
      const row = await apiFetch<ServiceSignupRow>('/service-signups/save', {
        serviceId: active,
        guild: g,
        businessName: b,
      });
      setRegistered((prev) => ({
        ...prev,
        [active]: {
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

  const valid = guild.trim().length > 0 && business.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-6">
      {/* بنر عنوان — سبک بنر صفحه‌های عمومی سایت */}
      <header className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-8 text-center">
        <h1 className="text-xl font-extrabold sm:text-2xl">سرویس‌های تخصصی ارزش‌افزوده ایمچ</h1>
        <p className="mx-auto mt-3 max-w-2xl text-xs leading-6 text-muted-foreground sm:text-sm sm:leading-7">
          سرویس‌های تخصصی عمده‌فروشی ایمچ مسیر خرید را مستقیم به تولیدکننده وصل می‌کنند.
          اگر تولیدکننده، شرکت پخش یا تأمین‌کنندهٔ کالا هستید و دوست دارید در این طرح‌ها
          به‌عنوان فروشنده حضور داشته باشید، همین حالا در سرویس مورد نظرتان ثبت‌نام کنید.
        </p>
      </header>

      {/* باکس سرویس‌ها — دو سرویس فعال کنار هم، کارت «به‌زودی» تمام‌عرض زیر آن‌ها */}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {SERVICES.map((s) => {
          const Icon = s.icon;
          const isRegistered = Boolean(registered[s.id]);
          return (
            <section
              key={s.id}
              className={cn(
                'flex flex-col rounded-lg border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
                s.status === 'soon' && 'bg-muted/30 md:col-span-2',
              )}
            >
              <div className="flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={24} />
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pt-1.5">
                  <h2 className="text-base font-extrabold">{s.title}</h2>
                  {s.status === 'soon' ? (
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-bold text-secondary-foreground">
                      به‌زودی
                    </span>
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                      در حال آماده‌سازی
                    </span>
                  )}
                </div>
              </div>

              {/* شرح سرویس — تعریف رسمی همان سرویس */}
              <p className="mt-4 rounded-md bg-secondary/60 px-3.5 py-2.5 text-[13px] font-bold leading-6">
                {s.tagline}
              </p>

              {/* نکات کلیدی — چه چیزی برای فروشنده/خریدار حل می‌شود */}
              <ul className="mt-4 space-y-2 text-[13px] leading-6 text-muted-foreground">
                {s.points.map((p) => (
                  <li key={p} className="flex items-start gap-2">
                    <span className="mt-[9px] size-1.5 shrink-0 rounded-full bg-primary/50" aria-hidden />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-auto pt-5">
                {s.status === 'soon' ? (
                  <p className="rounded-md border border-dashed bg-card px-3 py-2.5 text-center text-xs font-bold text-muted-foreground">
                    ثبت‌نام این سرویس بعداً باز می‌شود
                  </p>
                ) : isRegistered ? (
                  <Button
                    variant="outline"
                    className="h-auto w-full rounded-md whitespace-normal py-2.5 leading-6"
                    onClick={() => onCta(s.id)}
                  >
                    <CheckCircle2 size={16} className="me-1.5 shrink-0 text-emerald-500" />
                    ثبت‌نام شما در این سرویس دریافت شد
                  </Button>
                ) : (
                  <Button
                    className="h-auto w-full rounded-md whitespace-normal py-2.5 leading-6"
                    onClick={() => onCta(s.id)}
                  >
                    علاقه‌مند به فعالیت در این سرویس به‌عنوان فروشنده هستم
                  </Button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {/* توضیح فرآیند — ثبت‌نام یعنی چه */}
      <p className="mt-6 flex items-center justify-center gap-2 rounded-lg border bg-card p-4 text-center text-xs leading-6 text-muted-foreground">
        <Info size={15} className="shrink-0 text-primary" />
        ثبت‌نام شما ابراز علاقه‌مندی است؛ با ثبت‌نام، جزو اولین فروشندگان همان سرویس قرار می‌گیرید
        و پس از راه‌اندازی کامل، ایمچ برای هماهنگی مراحل بعد با شما در تماس است.
      </p>

      {/* فرم ثبت‌نام فروشندهٔ سرویس — صنف + نام کسب‌وکار */}
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
                <p className="mt-3 text-sm font-extrabold">درخواست عضویت شما ثبت شد</p>
              </div>
              <div className="space-y-2 rounded-md bg-secondary/60 p-3.5 text-[13px]">
                <p className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-muted-foreground">صنف</span>
                  <span className="text-end font-bold">{saved.guild}</span>
                </p>
                <p className="flex items-center justify-between gap-3">
                  <span className="shrink-0 text-muted-foreground">نام کسب‌وکار</span>
                  <span className="text-end font-bold">{saved.business}</span>
                </p>
              </div>
              <p className="text-xs leading-6 text-muted-foreground">
                شما جزو اولین فروشندگان {service.title} قرار گرفتید؛ پس از راه‌اندازی کامل سرویس،
                ایمچ برای هماهنگی مراحل بعد با شما در تماس است.
              </p>
              <DialogFooter className="justify-center">
                <Button className="rounded-md" onClick={closeDialog}>
                  متوجه شدم
                </Button>
              </DialogFooter>
            </div>
          ) : service ? (
            /* فرم — صنف + نام کسب‌وکار */
            <div className="space-y-4">
              <p className="text-xs leading-6 text-muted-foreground">
                برای حضور در این سرویس به‌عنوان فروشنده، صنف و نام کسب‌وکار خود را وارد کنید.
              </p>
              <div>
                <label
                  htmlFor={`svc-guild-${service.id}`}
                  className="mb-1.5 block text-xs font-bold text-muted-foreground"
                >
                  صنف
                </label>
                <input
                  id={`svc-guild-${service.id}`}
                  value={guild}
                  onChange={(e) => setGuild(e.target.value)}
                  placeholder="مثلاً لبنیات"
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
                  نام کسب‌وکار
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
                  {saving ? 'در حال ثبت…' : 'ثبت درخواست عضویت'}
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
