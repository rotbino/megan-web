'use client';

/**
 * پروفایل — صفحه اختصاصی پروفایل کاربر در پنل (خواسته کاربر):
 * از «ایمچ من» روی پروفایل که بزنی اینجا می‌آی؛ دکمه «ویرایش پروفایل»
 * به فرم ویرایش می‌رود. الگو از صفحه پروفایل عمومی باسکول:
 * نام + نقش + «X روز در ایمچ» + اشتراک‌گذاری + درباره کسب‌وکار + شهر + محصولات + نظرات.
 */

import Link from 'next/link';
import { Check, Copy, MapPin, MessageSquare, Package, Pencil, Star, UserRound } from 'lucide-react';
import { usePanelProfile, useMyProducts } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { dateFa, toFa } from '@/lib/format';

export default function PanelProfilePage() {
  const { data: profile } = usePanelProfile();
  const { data: mine } = useMyProducts();
  const { user } = useAuth();
  const { toast } = useToast();

  if (!profile) {
    return <div className="grid h-64 place-items-center text-sm text-muted-foreground">در حال بارگذاری…</div>;
  }

  const { userInfo: u, profile: pf } = profile;
  const daysInAimch = Math.max(
    1,
    Math.round((Date.now() - new Date(u.createdAt.replace(' ', 'T')).getTime()) / 86_400_000),
  );
  const confirmedCount = mine?.counts.confirmed ?? 0;

  const copyProfileLink = async () => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/profile/${u.userName}`);
      toast({ description: 'کپی شد.' });
    } catch {
      toast({ description: `لینک پروفایل: /profile/${u.userName}` });
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* کارت هویت */}
      <PanelCard>
        <div className="flex flex-wrap items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-primary/10 text-xl font-extrabold text-primary">
            {u.firstName.charAt(0)}
          </span>
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
      </PanelCard>

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
          {pf.isCompany && (
            <div className="flex items-center gap-2 rounded-md bg-secondary/50 p-3 text-xs sm:col-span-2">
              <Star size={15} className="shrink-0 text-muted-foreground" />
              <dt className="text-muted-foreground">شرکت:</dt>
              <dd className="font-bold">{pf.companyName}</dd>
            </div>
          )}
        </dl>
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
    </div>
  );
}
