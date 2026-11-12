'use client';

/**
 * پیش‌نمایش نتیجهٔ ایمپورت — دادهٔ واقعی خوانده‌شده از دیتابیس ایمچ
 * + عکس‌های لوکال دانلودشده (سرو شده از /uploads بک‌اند).
 */

import { BadgeCheck, ImageOff, Star, UserRound } from 'lucide-react';
import type { ImportPreview } from '@/lib/importer/client';
import { API_BASE } from '@/lib/importer/client';
import { dateFa, priceFa, stockFa } from '@/lib/format';

function LocalImage({ src, alt, className }: { src: string | null; alt: string; className?: string }) {
  if (!src) {
    return (
      <div className={`grid place-items-center bg-muted text-muted-foreground/40 ${className ?? ''}`} aria-hidden>
        <ImageOff size={20} />
      </div>
    );
  }
  // منبع: فایل لوکال روی بک‌اند (uploads) یا URL کامل باسکول
  const fullSrc = src.startsWith('http') ? src : `${API_BASE}${src}`;
  return <img src={fullSrc} alt={alt} loading="lazy" className={`object-cover ${className ?? ''}`} />;
}

export function PreviewPanel({ preview }: { preview: ImportPreview }) {
  const { user, profile, counts, products, reviews, avatar } = preview;
  const packageLabel =
    user.bActivePackageType === 2 || user.bActivePackageType === 3
      ? 'ویژه در باسکول'
      : user.bActivePackageType === 1
        ? 'عادی در باسکول'
        : 'رایگان در باسکول';

  return (
    <div className="mt-4 space-y-4">
      {/* کارت کاربر */}
      <div className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-4">
        {avatar.localUrl || avatar.url ? (
          <LocalImage
            src={avatar.localUrl ?? avatar.url}
            alt={`${user.firstName} ${user.lastName}`}
            className="size-16 shrink-0 rounded-full border"
          />
        ) : (
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-muted text-muted-foreground">
            <UserRound size={26} />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-extrabold">
              {user.firstName} {user.lastName}
            </h4>
            {user.isVerified && (
              <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                <BadgeCheck size={13} />
                احراز هویت شده
              </span>
            )}
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
              {packageLabel}
            </span>
            {user.bResponseRate != null && (
              <span className="text-[11px] text-muted-foreground">
                نرخ پاسخ باسکول: {user.bResponseRate.toLocaleString('fa-IR')}٪
              </span>
            )}
          </div>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span dir="ltr" className="font-mono">{user.phone}</span>
            <span>@{user.userName}</span>
            <span>ایمچ #{user.id.slice(-8)}</span>
            <span>باسکول #{(user.bUserId ?? 0).toLocaleString('fa-IR')}</span>
            <span>عضویت: {dateFa(user.createdAt)}</span>
            {profile?.address && <span>{profile.address}</span>}
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {(
            [
              ['آگهی', counts.products],
              ['عکس', counts.photos],
              ['کامنت', counts.reviews],
              ['درخواست خرید', counts.buyRequests],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-md border bg-muted/30 px-3 py-2">
              <div className="text-lg font-extrabold text-primary">{value.toLocaleString('fa-IR')}</div>
              <div className="text-[11px] text-muted-foreground">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* آگهی‌ها */}
      <div>
        <h5 className="mb-2 text-sm font-extrabold">
          آگهی‌های ایمپورت‌شده {products.length < counts.products && `(۱۲ مورد اول از ${counts.products.toLocaleString('fa-IR')})`}
        </h5>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {products.map((p) => (
            <div key={p.id} className="overflow-hidden rounded-lg border bg-card">
              <LocalImage
                src={p.photos[0]?.localUrl ?? p.photos[0]?.url ?? null}
                alt={p.name}
                className="h-28 w-full"
              />
              <div className="space-y-1 p-2.5">
                <div className="truncate text-xs font-bold" title={p.name}>
                  {p.name}
                </div>
                <div className="text-[11px] text-muted-foreground">{p.category ?? '—'}</div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-primary">{p.price ? priceFa(p.price) : 'تماس'}</span>
                  <span className="text-muted-foreground">{stockFa(p.stock, p.unit)}</span>
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>ثبت باسکول: {dateFa(p.createdAt)}</span>
                  <span dir="ltr" className="font-mono">b:{p.bProductId}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* کامنت‌ها */}
      {reviews.length > 0 && (
        <div>
          <h5 className="mb-2 text-sm font-extrabold">کامنت‌های ایمپورت‌شده</h5>
          <ul className="space-y-2">
            {reviews.map((r) => (
              <li key={r.id} className="rounded-lg border bg-card p-3 text-xs">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} size={12} fill="currentColor" strokeWidth={0} />
                    ))}
                  </span>
                  <span className="font-bold">
                    {r.reviewer.firstName} {r.reviewer.lastName}
                  </span>
                  {r.reviewer.city && <span className="text-muted-foreground">{r.reviewer.city}</span>}
                  {r.reviewer.isStub && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                      کاربر کمکی (با ایمپورت واقعی ادغام می‌شود)
                    </span>
                  )}
                  <span className="text-muted-foreground">{dateFa(r.createdAt)}</span>
                </div>
                {r.comment && <p className="mt-1.5 leading-5 text-muted-foreground">{r.comment}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
