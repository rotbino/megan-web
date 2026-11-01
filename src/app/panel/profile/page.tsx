'use client';

/**
 * پروفایل — صفحه اختصاصی پروفایل کاربر در پنل (خواسته کاربر):
 * از «ایمچ من» روی پروفایل که بزنی اینجا می‌آی؛ دکمه «ویرایش پروفایل»
 * به فرم ویرایش می‌رود. الگو از صفحه پروفایل عمومی باسکول:
 * نام + نقش + «X روز در ایمچ» + اشتراک‌گذاری + درباره کسب‌وکار + شهر + محصولات + نظرات.
 *
 * هماهنگ کامل با صفحه ویرایش پروفایل (خواسته مالک ۱-۱۱): هر چیزی که در
 * ویرایش هست اینجا هم دیده می‌شود — میزان تکمیل، موبایل، آدرس، اطلاعات
 * حقوقی، تصاویر مربوطه و گواهی‌ها.
 * + کارت «ظاهر ایمچ» (تم تیره + رنگ دلخواه) جلوی چشم، بالای صفحه.
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Building2,
  Check,
  Copy,
  FileCheck2,
  ImageIcon,
  MapPin,
  MessageSquare,
  Package,
  Pencil,
  Phone,
  ShieldCheck,
  Star,
  UserRound,
} from 'lucide-react';
import { usePanelProfile, useMyProducts } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { AppearanceCard } from '@/components/panel/appearance-card';
import { dateFa, toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function PanelProfilePage() {
  const { data: profile } = usePanelProfile();
  const { data: mine } = useMyProducts();
  const { user } = useAuth();
  const { toast } = useToast();
  // پیش‌نمایش تمام‌صفحهٔ تصویر/گواهی
  const [preview, setPreview] = useState<{ url: string; alt: string } | null>(null);

  if (!profile) {
    return <div className="grid h-64 place-items-center text-sm text-muted-foreground">در حال بارگذاری…</div>;
  }

  const { userInfo: u, profile: pf } = profile;
  const daysInAimch = Math.max(
    1,
    Math.round((Date.now() - new Date(u.createdAt.replace(' ', 'T')).getTime()) / 86_400_000),
  );
  const confirmedCount = mine?.counts.confirmed ?? 0;

  // ─── میزان تکمیل — همان وزن‌گذاری صفحهٔ ویرایش (۸ بخش) ───
  const sections = [
    { label: 'اطلاعات پایه', pct: 15, done: Boolean(u.firstName.trim() && u.lastName.trim() && u.provinceId && u.cityId) },
    { label: 'اطلاعات شما', pct: 8, done: Boolean((pf.address ?? '').trim()) },
    { label: 'اطلاعات حقوقی', pct: 8, done: pf.isCompany && Boolean(pf.companyName.trim()) },
    { label: 'درباره کسب و کار', pct: 11, done: (pf.description ?? '').trim().length >= 100 },
    { label: 'تصاویر مربوطه', pct: 8, done: profile.gallery.length > 0 },
    { label: 'گواهی‌ها', pct: 8, done: profile.certificates.length > 0 },
    { label: 'احراز هویت', pct: 34, done: u.isVerified },
  ];
  const completion = Math.min(100, sections.reduce((a, s) => a + (s.done ? s.pct : 0), 0));
  const completionLabel = completion >= 85 ? 'عالی' : completion >= 55 ? 'متوسط' : 'ضعیف';

  const copyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/profile/${u.userName}`);
      toast({ description: 'کپی شد.' });
    } catch {
      toast({ description: `لینک پروفایل: /profile/${u.userName}` });
    }
  };

  /** آدرس ذخیره‌شده «تهران - تهران» → نمایش «تهران، تهران» */
  const addressText = (pf.address ?? '').trim().replace(' - ', '، ');

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* کارت هویت */}
      <PanelCard>
        <div className="flex flex-wrap items-center gap-4">
          {u.avatarUrl ? (
            // آواتار واقعی — آپلودی از ویرایش پروفایل
            <img src={u.avatarUrl} alt={`تصویر ${u.firstName}`} className="grid size-16 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="grid size-16 shrink-0 place-items-center rounded-full bg-primary/10 text-xl font-extrabold text-primary">
              {u.firstName.charAt(0)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-2 text-lg font-extrabold">
              {u.firstName} {u.lastName}
              <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-bold text-muted-foreground">
                {user?.role === 'buyer' ? 'خریدار' : 'فروشنده'}
              </span>
              {u.isVerified && (
                <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600">
                  <Check size={12} /> احراز هویت شده
                </span>
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{toFa(daysInAimch)} روز در ایمچ</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              شناسه عمومی: <span dir="ltr" className="font-bold">{u.userName}</span>
            </p>
          </div>
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <Button asChild className="rounded-md">
              <Link href="/panel/profile/edit">
                <Pencil size={15} /> ویرایش پروفایل
              </Link>
            </Button>
            <Button variant="outline" className="rounded-md" onClick={() => void copyProfileLink()}>
              <Copy size={15} /> ارسال برای دوستان
            </Button>
          </div>
        </div>

        {/* میزان تکمیل پروفایل — همان سنجهٔ صفحهٔ ویرایش */}
        <div className="mt-4 rounded-md bg-secondary/70 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold">میزان تکمیل پروفایل</span>
            <span className="font-extrabold">
              {toFa(completion)}٪ —{' '}
              <span className={cn(
                completionLabel === 'عالی' ? 'text-emerald-600' : completionLabel === 'متوسط' ? 'text-amber-600' : 'text-red-500',
              )}>
                {completionLabel}
              </span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-background">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                completionLabel === 'عالی' ? 'bg-emerald-500' : completionLabel === 'متوسط' ? 'bg-amber-500' : 'bg-red-400',
              )}
              style={{ width: `${Math.max(8, completion)}%` }}
            />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {sections.map((s) => (
              <span
                key={s.label}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  s.done ? 'bg-emerald-50 text-emerald-600' : 'bg-card text-muted-foreground',
                )}
              >
                {s.label} {toFa(s.pct)}٪
              </span>
            ))}
          </div>
        </div>
      </PanelCard>

      {/* ظاهر ایمچ — تم تیره + رنگ دلخواه (جلوی چشم، بالای صفحه) */}
      <AppearanceCard />

      {/* درباره کسب‌وکار */}
      <PanelCard>
        <h2 className="mb-2 flex items-center gap-2 text-sm font-extrabold">
          <UserRound size={17} className="text-primary" /> درباره کسب‌وکار
        </h2>
        {pf.description ? (
          <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">{pf.description}</p>
        ) : (
          <p className="rounded-md bg-secondary/60 p-3 text-xs leading-6 text-muted-foreground">
            هنوز متنی درباره کسب‌وکار خود ننوشته‌اید — از «ویرایش پروفایل» شروع کنید تا اعتماد طرف مقابل جلب شود.
          </p>
        )}
        <dl className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-3 text-xs">
            <MapPin size={15} className="shrink-0 text-muted-foreground" />
            <dt className="text-muted-foreground">شهر:</dt>
            <dd className="font-bold">{u.province}، {u.city}</dd>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-3 text-xs">
            <Package size={15} className="shrink-0 text-muted-foreground" />
            <dt className="text-muted-foreground">عضویت از:</dt>
            <dd className="font-bold">{dateFa(u.createdAt)}</dd>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-3 text-xs">
            <Phone size={15} className="shrink-0 text-muted-foreground" />
            <dt className="text-muted-foreground">موبایل:</dt>
            <dd dir="ltr" className="font-mono font-bold">{toFa(u.phone)}</dd>
          </div>
          <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-3 text-xs">
            <MapPin size={15} className="shrink-0 text-muted-foreground" />
            <dt className="text-muted-foreground">آدرس:</dt>
            <dd className="min-w-0 truncate font-bold" title={addressText || undefined}>
              {addressText || '—'}
            </dd>
          </div>
          {pf.isCompany && pf.companyName && (
            <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-3 text-xs sm:col-span-2">
              <Building2 size={15} className="shrink-0 text-muted-foreground" />
              <dt className="text-muted-foreground">شرکت:</dt>
              <dd className="font-bold">{pf.companyName}</dd>
              <span className="ms-auto flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                <ShieldCheck size={13} /> اطلاعات حقوقی ثبت شده
              </span>
            </div>
          )}
        </dl>
      </PanelCard>

      {/* تصاویر کسب‌وکار (گالری) — همان تصاویر بخش ویرایش */}
      <PanelCard>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <ImageIcon size={17} className="text-primary" /> تصاویر کسب‌وکار
          </h2>
          <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
            <Link href="/panel/profile/edit">افزودن تصویر</Link>
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">محصولات | شرکت | کارکنان — برای طرف مقابل در پروفایل عمومی شما دیده می‌شود.</p>
        {profile.gallery.length === 0 ? (
          <div className="mt-3 rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            هنوز تصویری ثبت نشده است — از «ویرایش پروفایل» تا ۸ تصویر اضافه کنید.
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-3">
            {profile.gallery.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setPreview({ url: img.url, alt: 'تصویر کسب‌وکار' })}
                className="size-20 shrink-0 overflow-hidden rounded-md border bg-secondary transition-opacity hover:opacity-85"
                aria-label="نمایش تصویر"
              >
                <img src={img.thumbUrl ?? img.url} alt="تصویر کسب‌وکار" className="size-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </PanelCard>

      {/* گواهی‌ها — همان گواهی‌های بخش ویرایش */}
      <PanelCard>
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <FileCheck2 size={17} className="text-primary" /> گواهی‌ها
          </h2>
          <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
            <Link href="/panel/profile/edit">افزودن گواهی</Link>
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">گواهی‌های ثبت شرکت | استاندارد محصول</p>
        {profile.certificates.length === 0 ? (
          <div className="mt-3 rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            هنوز گواهی‌ای ثبت نشده است — از «ویرایش پروفایل» تا ۴ گواهی اضافه کنید.
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-3">
            {profile.certificates.map((img) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setPreview({ url: img.url, alt: 'گواهی' })}
                className="size-20 shrink-0 overflow-hidden rounded-md border bg-secondary transition-opacity hover:opacity-85"
                aria-label="نمایش گواهی"
              >
                <img src={img.thumbUrl ?? img.url} alt="گواهی" className="size-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </PanelCard>

      {/* محصولات (فروشنده) */}
      {user?.role !== 'buyer' && (
        <PanelCard>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-extrabold">
              <Package size={17} className="text-primary" /> محصولات
            </h2>
            <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
              <Link href="/panel/products">محصولات من</Link>
            </Button>
          </div>
          {confirmedCount > 0 ? (
            <p className="text-xs text-muted-foreground">{toFa(confirmedCount)} آگهی تایید‌شده فعال دارید.</p>
          ) : (
            <PanelEmptyState
              icon={Package}
              title="محصولی ثبت نشده است"
              hint="اولین آگهی خود را ثبت کنید تا خریداران عمده شما را پیدا کنند."
              actionLabel="ثبت محصول"
              actionHref="/panel/products/new"
            />
          )}
        </PanelCard>
      )}

      {/* نظرات کاربران */}
      <PanelCard>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold">
          <MessageSquare size={17} className="text-primary" /> نظرات کاربران
        </h2>
        <PanelEmptyState
          icon={Star}
          title="نظری ثبت نشده است"
          hint="پس از انجام معامله، طرف مقابل می‌تواند تجربه همکاری با شما را ثبت کند."
        />
      </PanelCard>

      {/* پیش‌نمایش تمام‌صفحهٔ تصویر/گواهی */}
      <Dialog open={preview !== null} onOpenChange={(v) => !v && setPreview(null)}>
        <DialogContent className="max-w-lg rounded-xl p-3">
          <DialogTitle className="sr-only">{preview?.alt}</DialogTitle>
          {preview && (
            <a href={preview.url} target="_blank" rel="noreferrer" className="block overflow-hidden rounded-lg bg-secondary">
              <img src={preview.url} alt={preview.alt} className="max-h-[70vh] w-full object-contain" />
            </a>
          )}
          <p className="text-center text-[11px] text-muted-foreground">برای دیدن اندازهٔ اصلی، روی تصویر کلیک کنید</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
