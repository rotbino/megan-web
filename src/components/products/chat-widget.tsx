'use client';

import { useEffect, useRef, useState } from 'react';
import { LogIn, MessageSquareText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { LazyAuthModal } from '@/components/shared/lazy-auth-modal';
import { PresenceDot } from '@/components/shared/presence-dot';
import { MessageList } from '@/components/chat/message-list';
import { ChatComposer } from '@/components/chat/chat-composer';
import { getTokens } from '@/lib/api/client';
import { findPresence, usePresenceStatus } from '@/lib/api/presence';
import {
  useChatSocketEvents,
  useChatThreadMessages,
  useDeleteChatMessage,
  useEditChatMessage,
  useMarkThreadRead,
  useSendChatMessage,
  useStartChatThread,
  useUploadChatFile,
} from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';
import type { ChatFileMeta, ChatMessage } from '@/lib/mock/api';

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
  threadId: threadIdProp,
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
  /** مکالمهٔ موجود (۲-۱۱ دور ۱۸) — آمار آگهی: باز کردن مستقیم مکالمهٔ همین آگهی */
  threadId?: string;
}) {
  const { user } = useAuth();
  const [loginOpen, setLoginOpen] = useState(false);
  const { toast } = useToast();
  const start = useStartChatThread();
  // id من برای جهت‌دهی حباب پیام‌ها — مسیر عادی از startThread؛ در مسیر
  // threadId مستقیم (آمار آگهی ۲-۱۱ دور ۱۸) از presence خودم می‌آید
  const { data: myPresenceItems } = usePresenceStatus(
    threadIdProp != null && user?.userName ? { userNames: [user.userName] } : {},
  );
  const threadId = threadIdProp ?? start.data?.id ?? null;
  const myId =
    threadIdProp != null
      ? myPresenceItems?.find((p) => p.userName === user?.userName)?.id ?? start.data?.myId ?? null
      : (start.data?.myId ?? null);
  // پیجینگ معکوس — آخرین ۲۰ پیام اول؛ اسکرول به بالا صفحهٔ قدیمی‌تر
  const {
    messages,
    hasMore,
    isFetching: messagesFetching,
    isFetchingNextPage,
    fetchNextPage,
    isLoading: messagesLoading,
  } = useChatThreadMessages(threadId);
  const send = useSendChatMessage();
  const edit = useEditChatMessage();
  const del = useDeleteChatMessage();
  const upload = useUploadChatFile();

  // پیوست در انتظار ارسال + پیام در حال ویرایش (فقط دیده‌نشده)
  const [attachment, setAttachment] = useState<ChatFileMeta | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);

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

  // ── خوانده‌شدن با نمایش واقعی (خواسته مالک ۸-۱۱) ──
  // ویجت فقط وقتی مونت می‌شود که دیالوگ باز است؛ پس رندر پیام‌ها یعنی
  // دیده‌شدن — بعد از ۶۰۰ms علامت‌گذاری صریح می‌شود (واکشی ≠ خواندن).
  const markRead = useMarkThreadRead();
  useEffect(() => {
    if (!threadId || !myId || markRead.isPending) return;
    if (!messages.some((m) => m.senderId !== myId && m.readAt === null)) return;
    const t = window.setTimeout(() => markRead.mutate(threadId), 600);
    return () => window.clearTimeout(t);
  }, [threadId, myId, messages, markRead]);

  // اولین پیام خوانده‌نشده — اسکرول ورود روی آن می‌ایستد (خواسته مالک ۸-۱۱).
  // یک‌بار به ازای هر مکالمه و قبل از علامت‌گذاری ثبت می‌شود تا جداکنندهٔ
  // «پیام‌های جدید» تا بسته‌شدن دیالوگ بماند.
  const widgetThreadKey = threadId ?? 'none';
  const firstUnreadRef = useRef<{ key: string; id: string | null; settled: boolean }>({
    key: 'none',
    id: null,
    settled: true,
  });
  if (firstUnreadRef.current.key !== widgetThreadKey) {
    firstUnreadRef.current = { key: widgetThreadKey, id: null, settled: widgetThreadKey === 'none' };
  }
  if (!firstUnreadRef.current.settled && myId && messages.length > 0) {
    const first = messages.find((m) => m.senderId !== myId && m.readAt === null) ?? null;
    // تا رفرش پشت‌زمین تمام نشده null نمی‌نشینیم (کش کهنه ممکن است
    // «همه خوانده‌شده» بگوید و پیام‌های تازه بعداً برسند)
    if (first || (!hasMore && !messagesFetching)) {
      firstUnreadRef.current = { key: widgetThreadKey, id: first?.id ?? null, settled: true };
    }
  }
  const firstUnreadId = firstUnreadRef.current.id;

  // هدف شروع مکالمه — آگهی یا مستقیم؛ با threadId مستقیم نیازی به شروع نیست
  const target =
    threadIdProp != null
      ? null
      : productId != null
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

  const handleSend = (text: string) => {
    if (editing) {
      edit.mutate(
        { messageId: editing.id, text },
        {
          onSuccess: () => setEditing(null),
          onError: (err) =>
            toast({ description: err instanceof Error ? err.message : 'ویرایش ناموفق بود.' }),
        },
      );
      return;
    }
    if (!threadId || send.isPending) return;
    const file = attachment;
    send.mutate(
      { threadId, text, file },
      {
        onSuccess: () => setAttachment(null),
        onError: (err) =>
          toast({ description: err instanceof Error ? err.message : 'ارسال پیام ناموفق بود.' }),
      },
    );
  };

  const handlePickFile = (file: File) => {
    upload.mutate(file, {
      onSuccess: (meta) => setAttachment(meta),
      onError: (err) =>
        toast({
          description: err instanceof Error ? err.message : 'آپلود فایل ناموفق بود.',
          variant: 'destructive',
        }),
    });
  };

  const handleDelete = (m: ChatMessage) => {
    del.mutate(m.id, {
      onError: (err) =>
        toast({ description: err instanceof Error ? err.message : 'حذف ناموفق بود.' }),
    });
    if (editing?.id === m.id) setEditing(null);
  };

  const subject = productName ?? 'فروشنده';

  // مسیر threadId مستقیم (آمار آگهی): startThread اصلاً صدا زده نمی‌شود؛
  // حالت بارگذاری/خطای «شروع» فقط در مسیر عادی معنا دارد
  const starting =
    threadIdProp == null && (start.isPending || (start.data === undefined && !start.isError));
  const startFailed = threadIdProp == null && start.isError;

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
          {loginOpen && <LazyAuthModal open={loginOpen} intent="chat" onClose={() => setLoginOpen(false)} onLoggedIn={() => setLoginOpen(false)} />}
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
        {loginOpen && <LazyAuthModal open={loginOpen} intent="chat" onClose={() => setLoginOpen(false)} onLoggedIn={() => setLoginOpen(false)} />}
      </section>
    );
  }

  const chatBody = (
    <>
      {starting ? (
        <div className="space-y-3 p-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}
        </div>
      ) : startFailed ? (
        <p className="p-6 text-center text-sm text-muted-foreground">
          {start.error instanceof Error ? start.error.message : 'شروع مکالمه ناموفق بود.'}
        </p>
      ) : (
        <>
          {/* لیست پیام‌ها — پیجینگ معکوس؛ انعطاف‌پذیر؛ در مودال تمام ارتفاع را می‌گیرد */}
          {messagesLoading && (!messages || messages.length === 0) ? (
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3 nav-desktop:p-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-md" />)}
            </div>
          ) : (
            <MessageList
              threadKey={threadId ?? 'none'}
              firstUnreadId={firstUnreadId}
              messages={messages ?? []}
              myId={myId}
              hasMore={hasMore}
              loadingOlder={isFetchingNextPage}
              onLoadOlder={() => void fetchNextPage()}
              onEdit={(m) => setEditing(m)}
              onDelete={handleDelete}
              emptyText="پیامی بنویسید"
              className="p-3 nav-desktop:p-4"
            />
          )}
          {/* ارسال — متن یا پیوست (تا ۵MB)؛ چسبیده به پایین (موبایل: بالای safe-area) */}
          <div className="pb-[max(0.25rem,env(safe-area-inset-bottom))]">
            <ChatComposer
              sending={send.isPending}
              uploading={upload.isPending}
              attachment={attachment}
              onPickFile={handlePickFile}
              onClearAttachment={() => setAttachment(null)}
              editing={editing}
              onCancelEdit={() => setEditing(null)}
              onSend={handleSend}
            />
          </div>
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
