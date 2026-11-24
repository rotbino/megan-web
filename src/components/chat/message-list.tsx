'use client';

/**
 * لیست پیام‌های مکالمه — مشترک بین صفحهٔ «پیام‌ها» و ویجت چت.
 *
 * پیجینگ معکوس (خواسته مالک ۷-۱۱):
 *  • ورود به مکالمه = پرش به آخرین پیام‌ها (اسکرول تهِ لیست).
 *  • اسکرول به بالا صفحهٔ قدیمی‌تری می‌آورد؛ پیام‌های تازه همیشه «بالای»
 *    قدیمی‌ترها prepend می‌شوند و موقعیت اسکرول حفظ می‌شود (پرش ندارد).
 *  • ترتیب نمایش: قدیمی بالا → جدید پایین، همیشه.
 *
 * توقف روی اولین پیام خوانده‌نشده (خواسته مالک ۸-۱۱):
 *  • ورود به مکالمهٔ دارای پیام جدید: اسکرول روی اولین پیام خوانده‌نشده
 *    می‌ایستد (با جداکنندهٔ «پیام‌های جدید» بالای آن) نه روی آخرین پیام.
 *  • اولین خوانده‌نشده ممکن است دیر برسد (جستجوی صفحه‌های قدیمی‌تر) —
 *    به محض رسیدن، اسکرول روی آن تنظیم می‌شود.
 */

import { Fragment, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { MessageBubble } from '@/components/chat/message-bubble';
import type { ChatMessage } from '@/lib/mock/api';
import { cn } from '@/lib/utils';

export function MessageList({
  messages,
  myId,
  hasMore,
  loadingOlder,
  onLoadOlder,
  onEdit,
  onDelete,
  emptyText = 'پیامی بنویسید',
  className,
  /** برای اسکرول درست هنگام تعویض مکالمه */
  threadKey,
  /** شناسهٔ اولین پیام خوانده‌نشده — اسکرول ورود روی آن می‌ایستد (۸-۱۱) */
  firstUnreadId = null,
}: {
  messages: ChatMessage[];
  myId: string | null;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  onEdit?: (m: ChatMessage) => void;
  onDelete?: (m: ChatMessage) => void;
  emptyText?: string;
  className?: string;
  threadKey: string;
  firstUnreadId?: string | null;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevThreadRef = useRef(threadKey);
  const prevLastIdRef = useRef<string | null>(null);
  /** ورود به مکالمه — با رسیدن اولین دیتا موقعیت اولیه تنظیم می‌شود */
  const pendingBottomRef = useRef(true);
  /** آیا اسکرول-روی-خوانده‌نشده برای این مکالمه انجام شد؟ */
  const unreadDoneRef = useRef(false);
  /** چسبیدن به پایین — با لود تصویر/ویدئوی تازه هم پایین بمانیم */
  const pinnedRef = useRef(true);
  /** برای حفظ موقعیت هنگام prepend پیام‌های قدیمی */
  const stickRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  /** اسکرول به جداکنندهٔ «پیام‌های جدید» — اولین پیام خوانده‌نشده کمی
 *  پایین‌تر از لبهٔ بالای پنجره می‌نشیند تا بافت قبلی هم پیداست باشد.
 *  false یعنی جداکننده هنوز در DOM نیست (خوانده‌نشده هنوز لود نشده). */
  const scrollToUnread = () => {
    const el = scrollRef.current;
    if (!el) return false;
    const divider = el.querySelector<HTMLElement>('[data-new-divider]');
    if (!divider) return false;
    pinnedRef.current = false;
    const top =
      divider.getBoundingClientRect().top - el.getBoundingClientRect().top + el.scrollTop - 56;
    el.scrollTop = Math.max(0, top);
    return true;
  };

  // چسبیدن به پایین وقتی ارتفاع محتوا عوض می‌شود (لود دیرهنگام تصویر/ویدئو)
  useEffect(() => {
    const el = scrollRef.current;
    const content = contentRef.current;
    if (!el || !content || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => {
      if (pinnedRef.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, []);

  // تعویض مکالمه → آمادهٔ تنظیم موقعیت اولیه (خواسته مالک ۷-۱۱ + ۸-۱۱)
  useEffect(() => {
    if (prevThreadRef.current !== threadKey) {
      prevThreadRef.current = threadKey;
      prevLastIdRef.current = null;
      stickRef.current = null;
      pendingBottomRef.current = true;
      unreadDoneRef.current = false;
      pinnedRef.current = true;
    }
  }, [threadKey]);

  // تغییر پیام‌ها — prepend قدیمی‌ها / پیام تازه / اولین دیتا
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // prepend صفحهٔ قدیمی — موقعیت اسکرول دقیقاً حفظ می‌شود
    if (stickRef.current) {
      const { scrollHeight, scrollTop } = stickRef.current;
      stickRef.current = null;
      el.scrollTop = el.scrollHeight - scrollHeight + scrollTop;
      prevLastIdRef.current = messages.length ? messages[messages.length - 1].id : null;
      return;
    }

    const lastId = messages.length ? messages[messages.length - 1].id : null;

    // ورود به مکالمه — اولین دیتا: توقف روی اولین پیام خوانده‌نشده
    // (خواسته مالک ۸-۱۱)؛ نبود: پرش فوری به آخرین پیام (خواسته ۷-۱۱)
    if (pendingBottomRef.current && messages.length > 0) {
      pendingBottomRef.current = false;
      if (firstUnreadId && scrollToUnread()) {
        unreadDoneRef.current = true;
      } else {
        el.scrollTop = el.scrollHeight;
      }
      prevLastIdRef.current = lastId;
      return;
    }

    // اولین خوانده‌نشده دیر رسید (جستجوی صفحهٔ قدیمی‌تر) — حالا بایست روی آن
    if (firstUnreadId && !unreadDoneRef.current && scrollToUnread()) {
      unreadDoneRef.current = true;
      pinnedRef.current = false;
    }

    // رصد «آخرین پیام» — با پنجرهٔ لغزان طول ثابت می‌ماند ولی id عوض می‌شود
    if (lastId && lastId !== prevLastIdRef.current) {
      const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
      const grew = messages[messages.length - 1];
      // پیام خودمان (تهِ لیست) یا کاربر نزدیک پایین → دنبال کن
      if (nearBottom || (grew && grew.senderId === myId)) {
        pinnedRef.current = true;
        el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
      }
    }
    prevLastIdRef.current = lastId;
  }, [messages, myId, threadKey, firstUnreadId]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    // موقعیت خواننده — پایین است؟ (برای چسبیدن با لود تصویر تازه)
    pinnedRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 160;
    if (!hasMore || loadingOlder) return;
    if (el.scrollTop < 90) {
      pinnedRef.current = false;
      stickRef.current = { scrollHeight: el.scrollHeight, scrollTop: el.scrollTop };
      onLoadOlder();
    }
  };

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className={cn(
        'min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y ',
        // زمینهٔ ملایم خاکستری — حباب‌های سفید از هم و از زمینه جدا دیده شوند
        // (مثل چت‌اپ‌های استاندارد؛ خواسته مالک ۸-۱۱: پیام‌ها چسبیده نباشند)
        'bg-secondary',
        'px-0.5 py-3 sm:px-1 sm:py-4',
        'sm:bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] sm:[background-size:18px_18px]',
        className,
      )}
    >
      {/* گپ عمودی بین پیام‌ها اینجاست — پیام‌ها فرزند مستقیم این div هستند؛
          space-y روی کانتینر اسکرول بی‌اثر بود (خواسته مالک ۸-۱۱) */}
      <div ref={contentRef} className="flex min-h-full flex-col gap-y-2.5 sm:gap-y-3">
        {loadingOlder && (
          <div className="flex justify-center py-2">
            <Loader2 size={16} className="animate-spin text-muted-foreground" />
          </div>
        )}
        {!hasMore && messages.length > 0 && (
          <p className="pb-1 text-center text-[10px] text-muted-foreground/70">ابتدای گفتگو</p>
        )}
        {messages.length === 0 ? (
          <p className="py-8 text-center text-xs leading-6 text-muted-foreground">{emptyText}</p>
        ) : (
          messages.map((m) => (
            <Fragment key={m.id}>
              {/* جداکنندهٔ «پیام‌های جدید» — بالای اولین پیام خوانده‌نشده
                  (خواسته مالک ۸-۱۱)؛ تا خروج از مکالمه می‌ماند */}
              {m.id === firstUnreadId && (
                <div
                  data-new-divider
                  className="flex items-center justify-center py-1.5 "
                  aria-label="شروع پیام‌های جدید"
                >
                  <span className="rounded-full bg-red-500/10 px-2.5 py-0.5 text-[10px] font-bold text-red-600">
                    پیام‌های جدید
                  </span>
                </div>
              )}
              <MessageBubble message={m} mine={m.senderId === myId} onEdit={onEdit} onDelete={onDelete} />
            </Fragment>
          ))
        )}
        <div className="h-1" />
      </div>
    </div>
  );
}
