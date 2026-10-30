'use client';

import { Phone } from 'lucide-react';
import { ChatDialog } from '@/components/products/chat-dialog';
import { ChatBubbleIcon } from '@/components/shared/buskool-icons';
import { PhoneReveal } from '@/components/shared/phone-reveal';

/**
 * نوار فیکس چت/تماس موبایل — عین باسکول (fix-send-message-wrapper):
 * fixed درست بالای نوار ناوبری پایین (bottom: 58px)، ارتفاع ۷۲px،
 * سفید با سایه رو به بالا؛ فقط در موبایل/تبلت (<۹۹۲px) دیده می‌شود.
 * «چت با فروشنده» دکمه سفید با متن/قاب رنگ برند (main-button-alt باسکول)
 * و «شماره تماس» دکمه پر رنگ برند با متن سفید (main-button باسکول).
 */
export function MobileContactBar({
  productId,
  sellerUserName,
  sellerId,
  sellerName,
  productName,
}: {
  productId?: number;
  sellerUserName?: string;
  sellerId?: string;
  sellerName: string;
  productName?: string;
}) {
  return (
    <div
      className="fixed inset-x-0 bottom-[58px] z-40 flex h-[72px] items-center gap-4 bg-white px-4 shadow-[0_-1px_8px_rgba(0,0,0,0.1)] nav-desktop:hidden"
      role="toolbar"
      aria-label="تماس با فروشنده"
    >
      <ChatDialog
        productId={productId}
        sellerUserName={sellerUserName}
        sellerId={sellerId}
        sellerName={sellerName}
        productName={productName}
        className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg border border-primary bg-white text-sm font-bold text-primary transition-colors hover:bg-primary/5"
        buttonLabel="چت با فروشنده"
      />
      <PhoneReveal sellerName={sellerName} productId={productId}>
        <button
          type="button"
          className="flex h-12 flex-1 items-center justify-center gap-2 rounded-lg bg-primary text-sm font-bold text-primary-foreground shadow-[0_2px_6px_rgba(166,38,38,0.3)] transition-colors hover:bg-primary-deep"
        >
          <Phone size={17} />
          شماره تماس
        </button>
      </PhoneReveal>
    </div>
  );
}
