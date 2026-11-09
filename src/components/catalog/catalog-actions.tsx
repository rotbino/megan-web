'use client';

/**
 * دکمه‌های تعاملی صفحهٔ کاتالوگ (خواسته مالک ۱۰-۱۱) — مشتری‌های فروشنده
 * از این‌جا با او ارتباط می‌گیرند:
 *  • CatalogShareButton — اشتراک‌گذاری لینک کاتالوگ (Web Share / کپی)
 *  • CatalogSaveButton — ذخیرهٔ کاتالوگ در «کاتالوگهای ذخیره شده» پنل؛
 *    مهمان → مودال ورود با نیات ذخیره (ابزار بازاریابی ایمچ: مشتری
 *    فروشنده وارد ایمچ می‌شود)
 *  • CatalogContactButtons — تماس (سرویس شماره ایمچ) + چت ایمچ + واتساپ
 *    و اینستاگرام اگر فروشنده آیدی‌شان را در تنظیمات کاتالوگ داده باشد
 *  • CatalogMobileBar — نوار چسبان پایین موبایل: تماس / چت / ذخیره
 */

import { Bookmark, Check, Instagram, Loader2, MessageCircle, MessageSquareText, Phone, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PhoneReveal } from '@/components/shared/phone-reveal';
import { ChatDialog } from '@/components/products/chat-dialog';
import { useAuth } from '@/lib/mock/auth';
import { useCatalogSaved, useToggleCatalogSave } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { instagramLink, whatsappLink } from '@/lib/catalog';
import { cn } from '@/lib/utils';

/** هویت فروشندهٔ کاتالوگ — همان چیزی که دکمه‌های تماس/چت لازم دارند */
export interface CatalogSellerIdentity {
  userName: string;
  id: string;
  name: string;
  avatarUrl: string | null;
}

/* ─── اشتراک‌گذاری ─────────────────────────────────────────────────────── */

export function CatalogShareButton({
  url,
  title,
  className,
}: {
  url: string;
  title: string;
  className?: string;
}) {
  const { toast } = useToast();
  const share = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        return; // کاربر شیت را بست
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ description: 'لینک کاتالوگ کپی شد.' });
    } catch {
      toast({ description: 'کپی ممکن نشد.', variant: 'destructive' });
    }
  };
  return (
    <button
      type="button"
      onClick={share}
      aria-label={`اشتراک‌گذاری ${title}`}
      title="اشتراک‌گذاری کاتالوگ"
      className={cn(
        'grid size-10 place-items-center rounded-full text-white/95 backdrop-blur transition hover:scale-105',
        className,
      )}
      style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
    >
      <Share2 size={17} />
    </button>
  );
}

/* ─── ذخیرهٔ کاتالوگ ───────────────────────────────────────────────────── */

export function CatalogSaveButton({
  pageId,
  className,
  onGlass = false,
  label,
}: {
  pageId: string;
  className?: string;
  /** روی جلد رنگی؟ — دکمهٔ شیشه‌ای سفید؛ وگرنه دکمهٔ معمولی */
  onGlass?: boolean;
  label?: string;
}) {
  const { user, requireAuth } = useAuth();
  const { toast } = useToast();
  const { data: saved, isLoading } = useCatalogSaved(pageId, !!user);
  const toggle = useToggleCatalogSave();
  const isSaved = saved === true;

  const onClick = () => {
    if (!user) {
      requireAuth('save');
      return;
    }
    toggle.mutate(pageId, {
      onSuccess: (now) =>
        toast({ description: now ? 'کاتالوگ در «کاتالوگهای ذخیره شده» شما ذخیره شد.' : 'کاتالوگ از لیست ذخیره‌شده‌ها حذف شد.' }),
      onError: () => toast({ description: 'ذخیره موقتاً ممکن نشد؛ دوباره تلاش کنید.', variant: 'destructive' }),
    });
  };

  if (onGlass) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-pressed={isSaved}
        aria-label={isSaved ? 'حذف ذخیرهٔ کاتالوگ' : 'ذخیرهٔ کاتالوگ'}
        title={isSaved ? 'ذخیره شده — حذف از لیست' : 'ذخیرهٔ کاتالوگ'}
        className={cn(
          'grid size-10 place-items-center rounded-full text-white/95 backdrop-blur transition hover:scale-105',
          className,
        )}
        style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
      >
        {toggle.isPending ? (
          <Loader2 size={17} className="animate-spin" />
        ) : isSaved ? (
          <Check size={17} strokeWidth={2.6} />
        ) : (
          <Bookmark size={17} />
        )}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={isSaved ? 'default' : 'outline'}
      onClick={onClick}
      aria-pressed={isSaved}
      className={cn('h-11 rounded-lg px-4 text-sm font-bold', className)}
    >
      {toggle.isPending ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isSaved ? (
        <Check size={16} />
      ) : (
        <Bookmark size={16} />
      )}
      {label ?? (isLoading && user ? '…' : isSaved ? 'ذخیره شد' : 'ذخیره کاتالوگ')}
    </Button>
  );
}

/* ─── دکمه‌های تماس ────────────────────────────────────────────────────── */

export function CatalogContactButtons({
  seller,
  instagramId,
  whatsappNumber,
  className,
}: {
  seller: CatalogSellerIdentity;
  instagramId: string | null;
  whatsappNumber: string | null;
  className?: string;
}) {
  const extras = [
    ...(whatsappNumber
      ? [
          {
            key: 'wa',
            href: whatsappLink(whatsappNumber),
            label: 'واتساپ',
            Icon: MessageCircle,
            external: true,
          },
        ]
      : []),
    ...(instagramId
      ? [
          {
            key: 'ig',
            href: instagramLink(instagramId),
            label: 'اینستاگرام',
            Icon: Instagram,
            external: true,
          },
        ]
      : []),
  ];
  const total = 2 + extras.length;

  return (
    <div
      className={cn(
        'grid gap-2',
        total >= 4 ? 'grid-cols-2 sm:grid-cols-4' : total === 3 ? 'grid-cols-3' : 'grid-cols-2',
        className,
      )}
    >
      <PhoneReveal sellerName={seller.name} userName={seller.userName}>
        <Button className="h-11 w-full rounded-lg px-2 text-[13px] font-bold sm:text-sm">
          <Phone size={16} />
          تماس
        </Button>
      </PhoneReveal>
      <ChatDialog
        sellerUserName={seller.userName}
        sellerId={seller.id}
        sellerName={seller.name}
        sellerAvatarUrl={seller.avatarUrl}
        buttonLabel="چت"
        buttonVariant="outline"
        directSubtitle={`گفتگو با ${seller.name}`}
        className="h-11 w-full rounded-lg px-2 text-[13px] font-bold sm:text-sm"
      />
      {extras.map(({ key, href, label, Icon, external }) => (
        <Button
          key={key}
          asChild
          variant="outline"
          className="h-11 w-full rounded-lg px-2 text-[13px] font-bold sm:text-sm"
        >
          <a
            href={href}
            target={external ? '_blank' : undefined}
            rel={external ? 'noopener noreferrer' : undefined}
          >
            <Icon size={16} />
            {label}
          </a>
        </Button>
      ))}
    </div>
  );
}

/* ─── نوار چسبان پایین موبایل ─────────────────────────────────────────── */

export function CatalogMobileBar({
  pageId,
  seller,
}: {
  pageId: string;
  seller: CatalogSellerIdentity;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-2xl grid-cols-[1fr_1fr_auto] items-stretch gap-2 p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))]">
        <PhoneReveal sellerName={seller.name} userName={seller.userName}>
          <Button className="h-11 w-full rounded-lg text-sm font-bold">
            <Phone size={17} />
            تماس
          </Button>
        </PhoneReveal>
        <ChatDialog
          sellerUserName={seller.userName}
          sellerId={seller.id}
          sellerName={seller.name}
          sellerAvatarUrl={seller.avatarUrl}
          buttonLabel="چت"
          buttonVariant="outline"
          directSubtitle={`گفتگو با ${seller.name}`}
          className="h-11 w-full rounded-lg text-sm font-bold"
        />
        <CatalogSaveButton pageId={pageId} className="h-11 w-auto rounded-lg px-4" label="ذخیره" />
      </div>
    </div>
  );
}
