'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, LogIn, MessageSquareText, SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { LazyAuthModal } from '@/components/shared/lazy-auth-modal';
import { PresenceDot } from '@/components/shared/presence-dot';
import { getTokens } from '@/lib/api/client';
import { findPresence, usePresenceStatus } from '@/lib/api/presence';
import {
  useChatSocketEvents,
  useChatThreadMessages,
  useSendChatMessage,
  useStartChatThread,
} from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { cn } from '@/lib/utils';
import type { ChatMessage } from '@/lib/mock/api';

/**
 * چت با فروشنده (B8 — واقعی): مکالمه خریدار ↔ فروشنده.
 * دو مسیر شروع: روی آگهی (productId) یا مستقیم از پروفایل فروشنده
 * (sellerUserName — عین «ارسال پیام» باسکول).
 * نشان آنلاین/آفلاین فروشنده در سربرگ فرم (polling ۳۰s).
 *
 * چیدمان اپ‌گونه (برای مودال تمام‌صفحه/شیت دسکتاپ): ستون انعطاف‌پذیر —
 * لیست پیام‌ها هر ارتفاعی که باشد می‌گیرد و کیبورد به پایین می‌چسبد.
 * bare=true: بدون قاب section — برای استفاده داخل Dialog.
 */
export function ChatWidget({
  productId,
  sellerUserName,
  sellerId,
  sellerName,
  productName,
  bare = false,
}: {
  /** آگهی زمینه — اگر نباشد گفتگوی مستقیم با فروشنده شروع می‌شود */
  productId?: number;
  /** شناسه عمومی فروشنده — مسیر گفتگوی مستقیم (پروفایل) */
  sellerUserName?: string;
  /** شناسه ObjectId فروشنده — برای وضعیت آنلاین (اختیاری) */
  sellerId?: string;
  sellerName: string;
  /** نام آگهی زمینه — در گفتگوی مستقیم نمی‌آید */
  productName?: string;
  bare?: boolean;
}) {
  const { user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const start = useStartChatThread();
  const threadId = start.data?.id ?? null;
  const myId = start.data?.myId ?? null;
  const { data: messages, isLoading: messagesLoading } = useChatThreadMessages(threadId);
  const send = useSendChatMessage();
  const [text, setText] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  // وضعیت آنلاین فروشنده — با userName همیشه داریم؛ id دقیق‌تر است
  const { data: presenceItems } = usePresenceStatus({
    ...(sellerId ? { ids: [sellerId] } : {}),
    ...(sellerUserName ? { userNames: [sellerUserName] } : {}),
  });
  const presence = findPresence(presenceItems, {
    ...(sellerId ? { id: sellerId } : {}),
    ...(sellerUserName ? { userName: sellerUserName } : {}),
  });

  // push لحظه‌ای — WS، پیام تازه را همان لحظه می‌آورد
  useChatSocketEvents();

  // هدف شروع مکالمه — آگهی یا مستقیم
  const target =
    productId != null
      ? { productId }
      : sellerUserName
        ? { userName: sellerUserName }
        : null;

  // شروع مکالمه وقتی کاربر لاگین است
  useEffect(() => {
    if (user && getTokens()?.accessToken && target && !start.data && !start.isPending) {
      start.mutate(target);
    }
  }, [user, productId, sellerUserName]);

  // اسکرول به آخرین پیام
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages?.length, threadId]);

  const sendMsg = (e: React.FormEvent) => {
    e.preventDefault();
    const t = text.trim();
    if (!t || !threadId || send.isPending) return;
    setText('');
    send.mutate({ threadId, text: t });
  };

  const subject = productName ?? 'فروشنده';

  // ── هنوز وارد نشده ──
  if (!user || !getTokens()?.accessToken) {
    const loggedOut = (
      <div className="grid flex-1 place-items-center p-6 text-center">
        <div>
          <p className="text-sm leading-6 text-muted-foreground">
            {productId != null
              ? <>برای گفتگو با فروشنده درباره «{productName}» وارد حساب خود شوید.</>
              : <>برای ارسال پیام به {sellerName} وارد حساب خود شوید.</>}
          </p>
          <Button className="mt-4 rounded-md" onClick={() => setLoginOpen(true)}>
            <LogIn size={15} /> ورود / ثبت‌نام
          </Button>
        </div>
      </div>
    );
    if (bare) {
      return (
        <div className="flex h-full min-h-0 flex-1 flex-col">
          {loggedOut}
          {loginOpen && <LazyAuthModal open={loginOpen} onClose={() => setLoginOpen(false)} onLoggedIn={() => setLoginOpen(false)} />}
        </div>
      );
    }
    return (
      <section id="chat" aria-labelledby="chat-title" className="scroll-mt-24 rounded-md border bg-card">
        <div className="flex items-center gap-2 border-b p-4">
          <MessageSquareText size={16} className="text-primary" />
          <h2 id="chat-title" className="text-sm font-extrabold">چت با {sellerName}</h2>
        </div>
        {loggedOut}
        {loginOpen && <LazyAuthModal open={loginOpen} onClose={() => setLoginOpen(false)} onLoggedIn={() => setLoginOpen(false)} />}
      </section>
    );
  }

  const chatBody = (
    <>
      {start.isPending || (start.data === undefined && !start.isError) ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}
        </div>
      ) : start.isError ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          {start.error instanceof Error ? start.error.message : 'شروع مکالمه ناموفق بود.'}
        </p>
      ) : (
        <>
          {/* لیست پیام‌ها — انعطاف‌پذیر؛ در مودال تمام ارتفاع را می‌گیرد */}
          <div ref={listRef} className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 nav-desktop:p-4">
            {messagesLoading && !messages ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}
              </div>
            ) : !messages || messages.length === 0 ? (
              <p className="py-8 text-center text-xs leading-6 text-muted-foreground">
                {productId != null
                  ? <>برای شروع مکالمه درباره «{productName}» پیامی بنویسید.</>
                  : <>برای شروع گفتگو با {sellerName} پیامی بنویسید.</>}
              </p>
            ) : (
              messages.map((m: ChatMessage) => (
                <MessageBubble key={m.id} message={m} mine={m.senderId === myId} />
              ))
            )}
          </div>
          {/* کیبورد — چسبیده به پایین (در موبایل بالای safe-area) */}
          <form
            onSubmit={sendMsg}
            className="flex shrink-0 gap-2 border-t p-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] nav-desktop:p-3"
          >
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="پیامی بنویسید…"
              aria-label="متن پیام"
              className="rounded-md"
              maxLength={2000}
            />
            <Button type="submit" size="icon" className="shrink-0 rounded-md" aria-label="ارسال پیام" disabled={send.isPending || !text.trim()}>
              {send.isPending ? <Loader2 size={18} className="animate-spin" /> : <SendHorizonal size={18} />}
            </Button>
          </form>
        </>
      )}
    </>
  );

  if (bare) {
    return <div className="flex h-full min-h-0 flex-1 flex-col">{chatBody}</div>;
  }

  return (
    <section id="chat" aria-labelledby="chat-title" className="flex scroll-mt-24 flex-col rounded-md border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b p-4">
        <MessageSquareText size={16} className="text-primary" />
        <h2 id="chat-title" className="text-sm font-extrabold">چت با {sellerName}</h2>
        {productId != null && <span className="text-xs text-muted-foreground">درباره «{subject}»</span>}
        <PresenceDot online={presence?.online} lastSeenAt={presence?.lastSeenAt ?? undefined} className="ms-auto" />
      </div>
      {chatBody}
    </section>
  );
}

/** حباب پیام — عین صفحه پیام‌ها: «من» با پس‌زمینه برند و تیک دوتایی خوانده‌شدن */
function MessageBubble({ message, mine }: { message: ChatMessage; mine: boolean }) {
  return (
    <div className={cn('flex', mine ? 'justify-start' : 'justify-end')}>
      <p
        dir="auto"
        className={cn(
          'w-fit max-w-[80%] rounded-lg px-3.5 py-2.5 text-xs leading-6',
          mine
            ? 'rounded-tl-sm bg-primary text-primary-foreground'
            : 'rounded-tr-sm bg-secondary',
        )}
      >
        {message.text}
        {mine && message.readAt && (
          <span className="ms-2 align-middle text-[9px] text-primary-foreground/70">✓✓</span>
        )}
      </p>
    </div>
  );
}
