'use client';

/**
 * پروفایل — صفحه اختصاصی پروفایل کاربر در پنل (خواسته کاربر):
 * از «آیمچ من» روی پروفایل که بزنی اینجا می‌آی؛ دکمه «ویرایش پروفایل»
 * به فرم ویرایش می‌رود. الگو از صفحه پروفایل عمومی باسکول.
 *
 * هماهنگ کامل با صفحه ویرایش پروفایل (خواسته مالک ۱-۱۱ + دور ۱۶):
 * هر چیزی که در ویرایش هست اینجا هم دیده می‌شود — میزان تکمیل (دونی قابل
 * باز شدن)، موبایل، آدرس، اطلاعات کسب و کار (+ شماره ثبت)، تصاویر مربوطه
 * و گواهی‌ها. آواتار همین‌جا قابل تعویض است (دور ۱۶) و به‌جای «ارسال برای
 * دوستان»، «مشاهده پیش‌نمایش» پروفایل عمومی داریم (دور ۱۶).
 * + کارت «ظاهر ایمچ» (تم تیره + رنگ دلخواه) — نمای اولیه جمع‌شده (دور ۱۶).
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Building2,
  Check,
  Eye,
  FileCheck2,
  ImageIcon,
  MapPin,
  MessageSquare,
  Package,
  Pencil,
  Phone,
  Star,
  Store,
  UserRound,
} from 'lucide-react';
import { usePanelProfile, useMyProducts } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { AppearanceCard } from '@/components/panel/appearance-card';
import { AvatarUpload } from '@/components/panel/avatar-upload';
import { CompletionMeter } from '@/components/panel/completion-meter';
import { VerifyCard } from '@/components/panel/verify-card';
import { computeProfileCompletion } from '@/lib/profile-completion';
import { dateFa, toFa } from '@/lib/format';

export default function PanelProfilePage() {
  const { data: profile } = usePanelProfile();
  const { data: mine } = useMyProducts();
  const { user } = useAuth();
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

  // ─── میزان تکمیل — همان سنجهٔ مشترک صفحهٔ ویرایش (وزن‌ها = ۱۰۰) ───
  const { pct, quality, sections } = computeProfileCompletion({
    firstName: u.firstName,
    lastName: u.lastName,
    provinceId: u.provinceId,
    cityId: u.cityId,
    address: pf.address,
    companyName: pf.companyName,
    about: pf.description,
    avatarUrl: u.avatarUrl,
    galleryCount: profile.gallery.length,
    certificatesCount: profile.certificates.length,
    isVerified: u.isVerified,
  });

  /** آدرس ذخیره‌شده «تهران - تهران» → نمایش «تهران، تهران» */
  const addressText = (pf.address ?? '').trim().replace(' - ', '، ');

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* کارت هویت */}
      <PanelCard>
        <div className="flex flex-wrap items-center gap-4">
          {/* آواتار — همین‌جا قابل تعویض است (خواسته مالک دور ۱۶) */}
          <AvatarUpload
            userId={u.id}
            name={u.firstName}
            avatarUrl={u.avatarUrl}
            className="size-16"
            title="تنظیم یا تعویض تصویر پروفایل"
          />
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
            {/* پیش‌نمایش پروفایل عمومی — به‌جای «ارسال برای دوستان» (دور ۱۶) */}
            <Button asChild variant="outline" className="rounded-md">
              <Link href={`/profile/${u.userName}`} target="_blank" rel="noreferrer">
                <Eye size={15} /> مشاهده پیش نمایش
              </Link>
            </Button>
          </div>
        </div>

        {/* میزان تکمیل پروفایل — دونی فشرده؛ ریز درصدها با کلیک باز می‌شوند (دور ۱۶) */}
        <CompletionMeter className="mt-4" pct={pct} quality={quality} sections={sections} />
      </PanelCard>

      {/* احراز هویت — باکس بلندتر با متن بهتر؛ فقط برای احرازنشده (دور ۱۶) */}
      {!u.isVerified && <VerifyCard />}

      {/* ظاهر ایمچ — تم تیره + رنگ دلخواه (نمای اولیه جمع‌شده — دور ۱۶) */}
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
          {/* اطلاعات کسب و کار — نام + صنف + شماره ثبت (خواسته مالک ۳-۱۱: صنف + «شماره ثبت» ساده) */}
          {pf.isCompany && pf.companyName && (
            <>
              <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-3 text-xs sm:col-span-2">
                <Building2 size={15} className="shrink-0 text-muted-foreground" />
                <dt className="text-muted-foreground">شرکت:</dt>
                <dd className="font-bold">{pf.companyName}</dd>
                <span className="ms-auto flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <BadgeCheck size={13} /> اطلاعات کسب و کار ثبت شده
                </span>
              </div>
              {pf.businessCategory && (
                <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-3 text-xs sm:col-span-2">
                  <Store size={15} className="shrink-0 text-muted-foreground" />
                  <dt className="text-muted-foreground">صنف:</dt>
                  <dd className="font-bold">{pf.businessCategory}</dd>
                </div>
              )}
              {pf.companyRegisterNumber && (
                <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-3 text-xs sm:col-span-2">
                  <FileCheck2 size={15} className="shrink-0 text-muted-foreground" />
                  <dt className="text-muted-foreground">شماره ثبت:</dt>
                  <dd dir="ltr" className="font-num font-bold">{toFa(pf.companyRegisterNumber)}</dd>
                </div>
              )}
            </>
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
