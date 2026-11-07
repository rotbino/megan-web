'use client';

/**
 * لیست پیام‌های مکالمه — مشترک بین صفحهٔ «پیام‌ها» و ویجت چت.
 *
 * پیجینگ معکوس (خواسته مالک ۷-۱۱):
 *  • ورود به مکالمه = پرش به آخرین پیام‌ها (اسکرول تهِ لیست).
 *  • اسکرول به بالا صفحهٔ قدیمی‌تری می‌آورد؛ پیام‌های تازه همیشه «بالای»
 *    قدیمی‌ترها prepend می‌شوند و موقعیت اسکرول حفظ می‌شود (پرش ندارد).
 *  • ترتیب نمایش: قدیمی بالا → جدید پایین، همیشه.
 */

import { useEffect, useRef } from 'react';
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
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const prevThreadRef = useRef(threadKey);
  const prevLastIdRef = useRef<string | null>(null);
  /** ورود به مکالمه — با رسیدن اولین دیتا به تهِ لیست می‌پریم */
  const pendingBottomRef = useRef(true);
  /** چسبیدن به پایین — با لود تصویر/ویدئوی تازه هم پایین بمانیم */
  const pinnedRef = useRef(true);
  /** برای حفظ موقعیت هنگام prepend پیام‌های قدیمی */
  const stickRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

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

  // تعویض مکالمه → پرش به تهِ لیست با اولین دیتا (خواسته مالک ۷-۱۱)
  useEffect(() => {
    if (prevThreadRef.current !== threadKey) {
      prevThreadRef.current = threadKey;
      prevLastIdRef.current = null;
      stickRef.current = null;
      pendingBottomRef.current = true;
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

    // ورود به مکالمه — اولین دیتا: پرش فوری به آخرین پیام
    if (pendingBottomRef.current && messages.length > 0) {
      pendingBottomRef.current = false;
      el.scrollTop = el.scrollHeight;
      prevLastIdRef.current = lastId;
      return;
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
  }, [messages, myId, threadKey]);

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
        'min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y',
        'space-y-2 sm:space-y-2.5',
        'px-0.5 py-3 sm:px-1 sm:py-4',
        'sm:bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] sm:[background-size:18px_18px]',
        className,
      )}
    >
      <div ref={contentRef} className="flex min-h-full flex-col">
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
            <MessageBubble key={m.id} message={m} mine={m.senderId === myId} onEdit={onEdit} onDelete={onDelete} />
          ))
        )}
        <div className="h-1" />
      </div>
    </div>
  );
}
