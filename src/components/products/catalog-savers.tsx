'use client';

/**
 * جعبهٔ «ذخیره کنندگان» کاتالوگ کاربر (خواسته مالک ۱۰-۱۱ + بازنگری):
 * آمار کلیک‌پذیر در ردیف آمار صفحهٔ کاتالوگ → مودال لیست ذخیره‌کنندگان.
 * کاتالوگ همان صفحهٔ عمومی فروشنده است، پس کلید اندپوینت userName فروشنده است.
 * قانون دسترسی: همهٔ بازدیدکنندگان لیست را می‌بینند، اما چت و تماس
 * فقط برای صاحب کاتالوگ (او با مشتری‌های علاقه‌مندش تماس می‌گیرد —
 * دفترچهٔ تلفن معکوس). سایرین فقط اسامی/شهر را می‌بینند.
 */

import { useState } from 'react';
import { Bookmark, Loader2, Phone, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { PhoneReveal } from '@/components/shared/phone-reveal';
import { ChatDialog } from '@/components/products/chat-dialog';
import { RelativeTime } from '@/components/shared/relative-time';
import { useAuth } from '@/lib/mock/auth';
import { useCatalogSavers } from '@/lib/mock/hooks';
import { toFa } from '@/lib/format';
import type { CatalogSaverRow } from '@/lib/types';

/** یک ذخیره‌کننده — ردیف لیست؛ دکمه‌های تماس/چت فقط برای صاحب کاتالوگ */
function SaverRow({ saver, canContact }: { saver: CatalogSaverRow; canContact: boolean }) {
  const name = `${saver.firstName} ${saver.lastName}`.trim() || 'کاربر ایمچ';
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-card p-3">
      {saver.avatarUrl ? (
        <img src={saver.avatarUrl} alt={name} className="size-10 shrink-0 rounded-full object-cover" loading="lazy" />
      ) : (
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-(--catalog-accent)/10 text-sm font-bold text-(--catalog-accent)">
          {saver.firstName?.[0] ?? '؟'}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-bold">{name}</p>
        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {saver.cityName ? `${saver.cityName} — ` : ''}
          <RelativeTime date={saver.savedAt} />
        </p>
      </div>
      {canContact && (
        <div className="flex shrink-0 items-center gap-1.5">
          <PhoneReveal sellerName={name} userName={saver.userName}>
            <Button
              variant="outline"
              size="icon"
              aria-label={`تماس با ${name}`}
              title={`تماس با ${name}`}
              className="size-9 rounded-lg"
            >
              <Phone size={15} />
            </Button>
          </PhoneReveal>
          <ChatDialog
            sellerUserName={saver.userName}
            sellerId={saver.id}
            sellerName={name}
            sellerAvatarUrl={saver.avatarUrl}
            buttonLabel={`چت با ${name}`}
            buttonVariant="outline"
            buttonSize="icon"
            directSubtitle="گفتگو با ذخیره‌کنندهٔ کاتالوگ"
            className="size-9 rounded-lg"
          />
        </div>
      )}
    </li>
  );
}

export function CatalogSaversBox({ sellerUserName }: { sellerUserName: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useCatalogSavers(sellerUserName);
  const isOwner = !!user && user.userName === sellerUserName;
  const count = data?.count ?? 0;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        title="چه کسانی این کاتالوگ را ذخیره کرده‌اند"
        className="group rounded-md border bg-card p-3 text-center transition-colors hover:border-primary/40 sm:p-4"
      >
        <Bookmark size={18} className="mx-auto text-(--catalog-accent)" />
        <p className="mt-1.5 font-num text-sm font-extrabold leading-6 sm:text-base">
          {isLoading ? '…' : toFa(count)}
        </p>
        <p className="mt-0.5 text-[10.5px] text-muted-foreground group-hover:text-(--catalog-accent)">ذخیره کنندگان</p>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
          <DialogHeader className="text-start">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Bookmark size={17} className="text-(--catalog-accent)" />
              ذخیره کنندگان کاتالوگ
            </DialogTitle>
            <DialogDescription className="text-start">
              {isOwner
                ? 'این کاربران کاتالوگ شما را ذخیره کرده‌اند — تماس بگیرید یا چت را شروع کنید.'
                : 'کاربرانی که این کاتالوگ را برای خودشان ذخیره کرده‌اند.'}
            </DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 rounded-lg" />
              ))}
            </div>
          ) : data && data.items.length > 0 ? (
            <ul className="space-y-2">
              {data.items.map((saver) => (
                <SaverRow key={saver.id} saver={saver} canContact={isOwner} />
              ))}
            </ul>
          ) : (
            <p className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
              هنوز کسی این کاتالوگ را ذخیره نکرده است.
            </p>
          )}

          {!isOwner && data && data.items.length > 0 && (
            <p className="flex items-start gap-1.5 rounded-lg bg-secondary/60 p-3 text-[11px] leading-5 text-muted-foreground">
              <UserRound size={14} className="mt-0.5 shrink-0 text-(--catalog-accent)/70" />
              مشاهدهٔ لیست برای همه آزاد است؛ تماس و چت با ذخیره‌کنندگان فقط برای صاحب کاتالوگ ممکن است.
            </p>
          )}
          {isLoading && (
            <p className="sr-only" role="status">
              <Loader2 size={14} className="animate-spin" /> در حال دریافت…
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
