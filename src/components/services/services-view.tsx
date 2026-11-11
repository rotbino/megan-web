'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, Info, Store, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuth } from '@/lib/mock/auth';

/**
 * سرویس‌های تخصصی ارزش‌افزوده ایمچ (خواستهٔ مالک ۱۱-۱۲ — دور ۲):
 * چارچوب سرویس‌های تخصصی عمده‌فروشی برای آینده — فعلاً فقط فرم و عنوان سرویس‌ها:
 *  • ریتو — سفارش‌گیری مستقیم خرده‌فروش از تولیدکنندگان به قیمت تولید
 *  • همخرید — خرید گروهی از تولیدکنندگان به قیمت تولید
 * فروشنده‌ها با دکمهٔ روی باکس سرویس ثبت‌نام می‌کنند (صنف + نام کسب‌وکار)؛
 * مهمان اول به ورود/ثبت‌نام ایمچ هدایت می‌شود (مودال ورود با نیات
 * service-signup) و بعد از ورود، فرم همان سرویسی که انتخاب کرده بود باز
 * می‌شود. ثبت‌نام فعلاً در حافظهٔ مرورگر فروشنده ذخیره می‌شود (پایلوت فرم) —
 * جمع‌آوری روی بک‌اند در فاز راه‌اندازی هر سرویس اضافه می‌شود.
 */

const STORAGE_KEY = 'imach:service-signup';

interface ServiceSignup {
  guild: string;
  business: string;
  at: number;
}

interface ServiceDef {
  id: string;
  title: string;
  tagline: string;
  icon: typeof Store;
}

/** سرویس‌های فعال فرم (خواستهٔ مالک) — شرح هر سرویس همان تعریف رسمی خودش است */
const SERVICES: ServiceDef[] = [
  {
    id: 'ritu',
    title: 'سرویس ریتو',
    tagline: 'سفارش‌گیری مستقیم خرده‌فروش از تولیدکنندگان به قیمت تولید',
    icon: Store,
  },
  {
    id: 'hamkharid',
    title: 'سرویس همخرید',
    tagline: 'خرید گروهی از تولیدکنندگان به قیمت تولید',
    icon: Users,
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

  // بازیابی ثبت‌نام‌های قبلی از حافظهٔ مرورگر — فقط بعد از مونت (الگوی هیدریشن)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- خواندن حافظه مرورگر فقط بعد از مونت ممکن است (الگوی استاندارد هیدریشن)
        setRegistered(JSON.parse(raw));
      }
    } catch {
      /* نشست خراب — نادیده */
    }
  }, []);

  // مهمان که بعد از مودال ورود لاگین شد → فرم همان سرویسی که کلیک کرده بود
  // باز شود. همان الگوی «تنظیم state هنگام رندر» (بدون افکت — عین edit-item-dialog):
  // پس از صفر شدن pendingService شرط دیگر برقرار نمی‌شود و رندر همگرا می‌ماند.
  if (user && pendingService) {
    setPendingService(null);
    setActive(pendingService);
    setDone(false);
    setGuild('');
    setBusiness('');
  }

  const service = active ? SERVICES.find((s) => s.id === active) ?? null : null;
  const saved = active ? registered[active] : undefined;

  const openForm = (id: string) => {
    setActive(id);
    setDone(false);
    setGuild('');
    setBusiness('');
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

  const submit = () => {
    const g = guild.trim();
    const b = business.trim();
    if (!active || !g || !b) return;
    const next = { ...registered, [active]: { guild: g, business: b, at: Date.now() } };
    setRegistered(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* حافظه پر است — فقط در state */
    }
    setDone(true);
  };

  const closeDialog = () => {
    setActive(null);
    setDone(false);
  };

  const valid = guild.trim().length > 0 && business.trim().length > 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-6">
      {/* بنر عنوان — سبک بنر صفحه‌های عمومی سایت */}
      <header className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-8 text-center">
        <h1 className="text-xl font-extrabold sm:text-2xl">سرویس‌های تخصصی ارزش‌افزوده ایمچ</h1>
        <p className="mx-auto mt-3 max-w-2xl text-xs leading-6 text-muted-foreground sm:text-sm sm:leading-7">
          سرویس‌های تخصصی عمده‌فروشی ایمچ مسیر خرید را مستقیم به تولیدکننده وصل می‌کنند.
          اگر تولیدکننده هستید و دوست دارید در این طرح‌ها به‌عنوان فروشنده حضور داشته باشید،
          همین حالا در سرویس مورد نظرتان ثبت‌نام کنید.
        </p>
      </header>

      {/* باکس سرویس‌ها */}
      <div className="mt-8 grid gap-5 md:grid-cols-2">
        {SERVICES.map((s) => {
          const Icon = s.icon;
          const isRegistered = Boolean(registered[s.id]);
          return (
            <section
              key={s.id}
              className="flex flex-col rounded-lg border bg-card p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
            >
              <div className="flex items-start gap-3">
                <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon size={24} />
                </span>
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pt-1.5">
                  <h2 className="text-base font-extrabold">{s.title}</h2>
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                    در حال آماده‌سازی
                  </span>
                </div>
              </div>

              {/* شرح سرویس — تعریف رسمی همان سرویس */}
              <p className="mt-4 rounded-md bg-secondary/60 px-3.5 py-2.5 text-[13px] font-bold leading-6">
                {s.tagline}
              </p>

              <div className="mt-auto pt-5">
                {isRegistered ? (
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
              <DialogFooter className="gap-2">
                <Button variant="outline" className="rounded-md" onClick={closeDialog}>
                  انصراف
                </Button>
                <Button className="rounded-md" disabled={!valid} onClick={submit}>
                  ثبت درخواست عضویت
                </Button>
              </DialogFooter>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
