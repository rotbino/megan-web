'use client';

/**
 * پیام‌ها — پیام‌رسان پنل (B8 — واقعی، منطق MHTML باسکول):
 * + چت دو مرحله‌ای موبایل (خواسته مالک ۷-۱۱): اول لیست مخاطبان، بعد مکالمه.
 * + بج خوانده‌نشده تا باز کردن واقعی چت نمی‌پرد (خواسته مالک ۸-۱۱): واکشی
 *   پیام‌ها ≠ خواندن؛ در موبایل هیچ مکالمه‌ای تا انتخاب کاربر باز/واکشی نمی‌شود
 *   و علامت‌گذاری خوانده‌شده فقط بعد از رندر پیام‌های مرئی انجام می‌شود.
 * + ورود به مکالمهٔ دارای پیام جدید: اسکرول روی اولین پیام خوانده‌نشده
 *   می‌ایستد + جداکنندهٔ «پیام‌های جدید» (خواسته مالک ۸-۱۱).
 * + چت با URL می‌ماند (خواسته مالک ۸-۱۱): ?thread= — رفرش همان مکالمه را
 *   باز می‌کند؛ دکمهٔ back مرورگر هم به لیست برمی‌گردد (pushState + popstate).
 * + پیام‌های کاربر راست، مخاطب چپ؛ طراحی مینیمال موبایل/دسکتاپ.
 * + پیوست تصویر/ویدئو/سند تا ۵MB (لیست سفید + بایت جادویی سمت سرور).
 * + ویرایش/حذف فقط تا قبل از مشاهدهٔ طرف مقابل — چت مدرک است.
 * + پیجینگ معکوس: آخرین ۲۰ پیام اول، اسکرول به بالا صفحهٔ قدیمی‌تر.
 * + مکالمهٔ «پشتیبانی ایمچ» با نشان M برند؛ گفتگوی دارای آخرین پیامِ
 *   تازه‌تر بالاتر از پشتیبانی می‌نشیند (خواسته مالک ۷-۱۱).
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { PushEnableBanner } from '@/components/shared/push-enable';
import { ImchMark } from '@/components/chat/imch-mark';
import { MessageList } from '@/components/chat/message-list';
import { ChatComposer } from '@/components/chat/chat-composer';
import { useToast } from '@/hooks/use-toast';
import {
  useAdminMessages,
  useChatSocketEvents,
  useChatThreadMessages,
  useConversations,
  useDeleteChatMessage,
  useEditChatMessage,
  useMarkAdminMessagesRead,
  useMarkThreadRead,
  useSendChatMessage,
  useUnreadMessagesCount,
  useUploadChatFile,
} from '@/lib/mock/hooks';
import type { ChatFileMeta, ChatMessage, ChatThreadInfo } from '@/lib/mock/api';
import { toFa } from '@/lib/format';
import { RelativeTime } from '@/components/shared/relative-time';
import { PresenceDot } from '@/components/shared/presence-dot';
import { findPresence, usePresenceStatus } from '@/lib/api/presence';
import { cn } from '@/lib/utils';

/** شناسه ساختگی مکالمه پشتیبانی — از id مکالمات واقعی جدا می‌ماند */
const SUPPORT_ID = '__support__';

/** مقدار پشتیبانی در URL — از id های ۲۴کاراکتری MongoDB جدا می‌ماند */
const SUPPORT_URL_VALUE = 'support';

/** خواندن ?thread= — «support» یا ObjectId؛ چیز دیگر نادیده گرفته می‌شود */
function threadFromUrl(): string | null {
  try {
    const t = new URLSearchParams(window.location.search).get('thread');
    if (t === SUPPORT_URL_VALUE) return SUPPORT_ID;
    return t && /^[0-9a-fA-F]{24}$/.test(t) ? t : null;
  } catch {
    return null;
  }
}

/** مکالمهٔ جاری را در URL نگه می‌دارد (خواسته مالک ۸-۱۱):
 *  رفرش همان چت را باز می‌کند و back مرورگر به لیست برمی‌گردد. pushState
 *  (نه replace) تا هر مکالمه در تاریخچهٔ مرورگر جای خودش را داشته باشد. */
function syncThreadUrl(id: string | null) {
  try {
    const url = new URL(window.location.href);
    if (id) url.searchParams.set('thread', id === SUPPORT_ID ? SUPPORT_URL_VALUE : id);
    else url.searchParams.delete('thread');
    window.history.pushState(null, '', url);
  } catch {
    /* محیط بدون history — بی‌خطر */
  }
}

export default function PanelMessagesPage() {
  const { toast } = useToast();
  const { data: conversations, isLoading } = useConversations();
  const { data: adminInbox } = useAdminMessages();
  // بج و پیام لینک‌دار «پشتیبانی» — پاسخ‌های خوانده‌نشدهٔ گفتگوی پشتیبانی
  // (خواسته مالک ۸-۱۱): بج قرمز منو + اعلان داخل چت با لینک به /panel/support
  const { data: unreadCounts } = useUnreadMessagesCount(true);
  const ticketUnread = unreadCounts?.ticket ?? 0;
  const markAdminRead = useMarkAdminMessagesRead();
  const markRead = useMarkThreadRead();

  // دو مرحله‌ای موبایل: «لیست» → انتخاب → «چت»؛ برگشت → «لیست».
  // مکالمهٔ جاری در URL می‌ماند (?thread=) — رفرش همان چت را باز می‌کند
  // و back مرورگر به لیست برمی‌گردد (خواسته مالک ۸-۱۱).
  const [directThread] = useState(threadFromUrl);
  const [stage, setStage] = useState<'list' | 'chat'>(directThread ? 'chat' : 'list');
  const [activeId, setActiveId] = useState<string | null>(directThread);
  const [q, setQ] = useState('');

  // دسکتاپ = پنل مکالمه همیشه مرئی (lg 1024px). موبایل: مکالمه فقط وقتی
  // مرئی است که کاربر آن را باز کرده باشد (stage==='chat') — برای انتخاب
  // خودکار مکالمهٔ اول و علامت‌گذاری خوانده‌شدهٔ درست (خواسته مالک ۸-۱۱).
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener?.('change', update);
    return () => mq.removeEventListener?.('change', update);
  }, []);
  const chatVisible = isDesktop || stage === 'chat';

  // back مرورگر / popstate — چت باز ↔ لیست، هم‌گام با URL
  useEffect(() => {
    const onPop = () => {
      const t = threadFromUrl();
      if (t) {
        setActiveId(t);
        setStage('chat');
      } else {
        setStage('list');
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const send = useSendChatMessage();
  const edit = useEditChatMessage();
  const del = useDeleteChatMessage();
  const upload = useUploadChatFile();

  // پیوست در انتظار ارسال + پیام در حال ویرایش
  const [attachment, setAttachment] = useState<ChatFileMeta | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);

  // ورود مستقیم با لینک thread → stage در مقداردهی اولیه تنظیم شده است

  // رویدادهای زنده — لیست و پیام‌ها خودشان تازه می‌شوند (چت + پشتیبانی)
  useChatSocketEvents();

  const threads: ChatThreadInfo[] = conversations ?? [];
  const supportMessages = adminInbox?.items ?? [];
  const supportUnread = adminInbox?.unread ?? 0;
  const isSupport = activeId === SUPPORT_ID;
  // دسکتاپ: اولین مکالمه به‌صورت پیش‌فرض باز است؛ موبایل: تا انتخاب کاربر
  // هیچ مکالمه‌ای باز نمی‌شود (خواسته مالک ۸-۱۱) — واکشی پیام‌های مکالمهٔ
  // دیده‌نشده یعنی پاک شدن بی‌دلیل بج خوانده‌نشده؛ پس در موبایل رخ نمی‌دهد.
  const active = isSupport
    ? null
    : activeId
      ? threads.find((t) => t.id === activeId) ?? null
      : isDesktop
        ? threads[0] ?? null
        : null;
  // پشتیبانی: انتخاب صریح کاربر (activeId) در هر دستگاه باز می‌شود؛
  // باز شدن «خودکار» فقط روی دسکتاپ است (پنل مرئی است) — در موبایل بدون
  // انتخاب کاربر نباید پیام‌های پشتیبانی بدون دیدن خوانده شوند.
  const effectiveActive = isSupport
    ? SUPPORT_ID
    : active ?? (isDesktop && !isLoading && supportMessages.length > 0 ? SUPPORT_ID : null);
  const showingSupport = effectiveActive === SUPPORT_ID;
  const myId = active?.myId ?? null;
  const lastSupport = supportMessages[supportMessages.length - 1];

  const {
    messages,
    hasMore,
    isFetching: messagesFetching,
    isFetchingNextPage,
    fetchNextPage,
  } = useChatThreadMessages(showingSupport ? null : active?.id ?? null);

  // ── اولین پیام خوانده‌نشده (خواسته مالک ۸-۱۱) ──
  // یک‌بار به ازای هر «ورود واقعی» به مکالمه و قبل از علامت‌گذاری ثبت می‌شود
  // تا اسکرول ورود روی آن بایستد و جداکنندهٔ «پیام‌های جدید» تا خروج از مکالمه
  // بماند. کلید ورود = مکالمه فقط وقتی چت مرئی است: در موبایل با بازگشت به
  // لیست محاسبه صفر می‌شود (چت مخفی است و پیام‌های زندهٔ میان‌رسنده پنجرهٔ
  // لودشده را جابه‌جا می‌کنند) و با ورود دوباره از دادهٔ همین لحظه محاسبه می‌شود.
  const activeThreadKey = showingSupport ? SUPPORT_ID : active?.id ?? null;
  const entryKey = chatVisible ? activeThreadKey : null;
  const firstUnreadRef = useRef<{ key: string | null; id: string | null; settled: boolean }>({
    key: null,
    id: null,
    settled: true,
  });
  if (firstUnreadRef.current.key !== entryKey) {
    firstUnreadRef.current = { key: entryKey, id: null, settled: entryKey === null };
  }
  if (!firstUnreadRef.current.settled && myId && messages && messages.length > 0) {
    const first = messages.find((m) => m.senderId !== myId && m.readAt === null) ?? null;
    if (first) {
      firstUnreadRef.current = { key: entryKey, id: first.id, settled: true };
    } else if (!hasMore && !messagesFetching) {
      // همهٔ پیام‌های مکالمه لود شد و رفرش هم تمام شد و خوانده‌نشده‌ای نبود.
      // (کش کهنه ممکن است «همه خوانده‌شده» بگوید و رفرش پشت‌زمین پیام‌های
      // جدید بیاورد — تا isFetching تمام نشده null نمی‌نشینیم.)
      firstUnreadRef.current = { key: entryKey, id: null, settled: true };
    }
  }
  const firstUnreadId = firstUnreadRef.current.id;

  // ── جستجوی عمیق (حاشیه): بج خوانده‌نشده هست ولی در صفحهٔ لودشده نیست ──
  // (مثلاً ۲۰+ پیام خودِ کاربر بعد از آخرین پیام خوانده‌نشدهٔ مخاطب آمده).
  // صفحه‌های قدیمی‌تر تا یافتن اولین خوانده‌نشده لود می‌شوند (حداکثر ۴ صفحه)؛
  // دریچهٔ ۸۰۰ms هم هست تا رندرهای پشت‌سرهم فچ تکراری نگیرند.
  const deepScanRef = useRef<{ key: string | null; tries: number; at: number }>({
    key: null,
    tries: 0,
    at: 0,
  });
  if (deepScanRef.current.key !== entryKey) {
    deepScanRef.current = { key: entryKey, tries: 0, at: 0 };
  }
  useEffect(() => {
    if (
      !showingSupport &&
      chatVisible &&
      myId &&
      !firstUnreadRef.current.settled &&
      !isFetchingNextPage &&
      hasMore &&
      deepScanRef.current.tries < 4 &&
      Date.now() - deepScanRef.current.at > 800
    ) {
      const badgeSaysUnread =
        (threads.find((t) => t.id === activeThreadKey)?.unreadCount ?? 0) > 0;
      if (badgeSaysUnread) {
        deepScanRef.current = {
          key: deepScanRef.current.key,
          tries: deepScanRef.current.tries + 1,
          at: Date.now(),
        };
        void fetchNextPage();
      }
    }
  }, [activeThreadKey, showingSupport, chatVisible, myId, messages, hasMore, isFetchingNextPage, threads, fetchNextPage]);

  // ── علامت‌گذاری خوانده‌شده — فقط وقتی چت واقعاً دیده می‌شود (خواسته ۸-۱۱) ──
  // موبایل: فقط در مرحلهٔ «چت»؛ دسکتاپ: پنل همیشه مرئی است. تایمر ۶۰۰ms بدون
  // پاک‌شدن با رندرهای تازه (پیام‌های زندهٔ پشت‌سرهم با هم خوانده می‌شوند)؛
  // هنگام شلیک، هنوز همان مکالمه مرئی است چک می‌شود (تعویض سریع چت ≠ خواندن).
  const markTimerRef = useRef<number | null>(null);
  const markContextRef = useRef<{ key: string | null; visible: boolean }>({ key: null, visible: false });
  markContextRef.current = { key: activeThreadKey, visible: chatVisible };
  useEffect(() => {
    const key = showingSupport ? SUPPORT_ID : active?.id ?? null;
    if (!key || !chatVisible) return;
    if (showingSupport) {
      if (supportUnread > 0 && !markAdminRead.isPending) markAdminRead.mutate();
      return;
    }
    if (!myId || markRead.isPending) return;
    const msgs = messages ?? [];
    if (!msgs.some((m) => m.senderId !== myId && m.readAt === null)) return;
    if (markTimerRef.current !== null) return; // زمان‌بندی فعال است
    markTimerRef.current = window.setTimeout(() => {
      markTimerRef.current = null;
      const ctx = markContextRef.current;
      if (ctx.key === key && ctx.visible) markRead.mutate(key);
    }, 600);
  }, [chatVisible, showingSupport, active?.id, messages, myId, supportUnread, markRead.isPending, markRead.mutate, markAdminRead.isPending, markAdminRead.mutate]);
  // تعویض مکالمه/خروج از صفحه — تایمر معلق پاک شود
  useEffect(() => {
    return () => {
      if (markTimerRef.current !== null) {
        window.clearTimeout(markTimerRef.current);
        markTimerRef.current = null;
      }
    };
  }, [activeThreadKey]);

  const visible = threads.filter((t) => {
    const name = `${t.counterpart.firstName} ${t.counterpart.lastName}`.trim();
    return !q.trim() || name.includes(q.trim()) || (t.productName ?? '').includes(q.trim());
  });

  // وضعیت آنلاین همه مخاطبان — یک درخواست گروهی (تا ۵۰ نفر)
  const counterpartNames = threads.map((t) => t.counterpart.userName).filter(Boolean);
  const { data: presenceItems } = usePresenceStatus({ userNames: counterpartNames });
  const presenceOf = (t: ChatThreadInfo) =>
    findPresence(presenceItems, { id: t.counterpart.id, userName: t.counterpart.userName });

  /**
   * ترتیب لیست (خواسته مالک ۷-۱۱): گفتگوی دارای آخرین پیامِ تازه‌تر بالای
   * «پشتیبانی ایمچ» می‌نشیند؛ پشتیبانی سنجاقِ بقیهٔ گفتگوهای قدیمی‌تر است.
   */
  const listOrder = (() => {
    const time = (t: ChatThreadInfo) => new Date(t.lastMessage?.at ?? t.updatedAt).getTime() || 0;
    const supportTime = lastSupport ? new Date(lastSupport.createdAt).getTime() : 0;
    const newer = visible.filter((t) => time(t) > supportTime);
    const older = visible.filter((t) => time(t) <= supportTime);
    return { newer, older };
  })();

  const nameOf = (t: ChatThreadInfo) =>
    `${t.counterpart.firstName} ${t.counterpart.lastName}`.trim() || 'کاربر ایمچ';

  // ── ارسال / ویرایش ──
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
    if (!active || send.isPending) return;
    const file = attachment;
    send.mutate(
      { threadId: active.id, text, file },
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

  const openConversation = (id: string) => {
    setActiveId(id);
    setStage('chat');
    setEditing(null);
    setAttachment(null);
    syncThreadUrl(id);
  };

  /** بازگشت به لیست (موبایل) — URL هم پاک می‌شود تا back مرورگر ناسازگار نشود */
  const backToList = () => {
    setStage('list');
    syncThreadUrl(null);
  };

  return (
    // چت اپ‌طور: در موبایل عرض مفید = 100dvh منهای هدر چسبان (۵۶) + ناوبری
    // پایین (۵۹) + پدینگ‌ها — فلکس کالمن، کارت چت فضای باقی‌مانده را می‌گیرد و
    // بنرها/جستجو ارتفاع خودشان را کم می‌کنند. دسکتاپ: ریشه h-full پوسته.
    <div className="mx-auto flex h-[calc(100dvh-140px)] min-h-[480px] max-w-5xl flex-col gap-4 lg:h-full lg:min-h-0">
      {/* وب‌پوش (B10) — اعلان پیام‌های جدید وقتی سایت باز نیست */}
      <PushEnableBanner />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:grid-rows-[minmax(0,1fr)]">
        {/* مرحلهٔ ۱ (موبایل): لیست مخاطبان — دسکتاپ: ستون ثابت؛
            موبایل: بدون بورد کلی — فلت (خواسته مالک ۸-۱۱) */}
        <PanelCard
          className={cn(
            'order-2 flex flex-col lg:order-1',
            'max-lg:border-0 max-lg:p-0 max-lg:shadow-none',
            stage === 'chat' && 'hidden lg:flex',
          )}
        >
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">
              مخاطب <span className="text-muted-foreground">({toFa(threads.length)})</span>
            </p>
          </div>
          <div className="relative mt-3">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجوی مکالمه…"
              className="rounded-md"
            />
          </div>
          {isLoading ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-14 animate-pulse rounded-md bg-secondary/60" />
              ))}
            </div>
          ) : (
            <ul className="mt-3 min-h-0 flex-1 divide-y divide-border/70 overflow-y-auto overscroll-contain touch-pan-y">
              {/* گفتگوهای تازه‌تر از پشتیبانی — بالای آن (خواسته مالک ۷-۱۱) */}
              {listOrder.newer.map((t) => (
                <ThreadRow
                  key={t.id}
                  thread={t}
                  active={!showingSupport && active?.id === t.id}
                  presence={presenceOf(t)}
                  onSelect={() => openConversation(t.id)}
                  nameOf={nameOf}
                />
              ))}

              {/* پشتیبانی ایمچ — نشان M برند؛ زیر گفتگوهای تازه‌تر */}
              <li className="pb-1">
                <button
                  type="button"
                  onClick={() => openConversation(SUPPORT_ID)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-2 py-3 text-start transition-colors',
                    showingSupport ? 'bg-primary/10' : 'hover:bg-secondary/70',
                  )}
                >
                  <ImchMark className="size-10 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-primary">پشتیبانی ایمچ</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {lastSupport ? <RelativeTime date={lastSupport.createdAt} /> : ''}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {ticketUnread > 0
                          ? 'پاسخ تازه از پشتیبان — مشاهدهٔ گفتگو'
                          : (lastSupport?.text ?? '')}
                      </span>
                      {supportUnread + ticketUnread > 0 && (
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {toFa(supportUnread + ticketUnread)}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>

              {/* گفتگوهای قدیمی‌تر از پشتیبانی */}
              {listOrder.older.map((t) => (
                <ThreadRow
                  key={t.id}
                  thread={t}
                  active={!showingSupport && active?.id === t.id}
                  presence={presenceOf(t)}
                  onSelect={() => openConversation(t.id)}
                  nameOf={nameOf}
                />
              ))}

              {visible.length === 0 && (
                <li>
                  <p className="rounded-md bg-secondary/50 px-3 py-3 text-center text-xs leading-6 text-muted-foreground">
                    مکالمه‌ای یافت نشد. گفتگو از صفحه هر آگهی («چت با فروشنده») شروع می‌شود.
                  </p>
                </li>
              )}
            </ul>
          )}
        </PanelCard>

        {/* مرحلهٔ ۲ (موبایل): مکالمه — دسکتاپ: همیشه باز؛ ارتفاع از فلکس والد.
            در لیست موبایل محتوا اصلاً مونت نمی‌شود (نه فقط CSS-hidden) تا
            اثرهای اسکرول/خوانده‌شدن چتِ پشت‌پرده اجرا نشود (خواسته مالک ۸-۱۱).
            موبایل: بدون بورد کلی — فلت (خواسته مالک ۸-۱۱) */}
        <PanelCard
          className={cn(
            'order-1 flex h-full min-h-0 flex-col lg:order-2',
            'max-lg:border-0 max-lg:p-0 max-lg:shadow-none',
            stage === 'list' && 'hidden lg:flex',
          )}
        >
          {(stage === 'chat' || isDesktop) && (
            <>
          {showingSupport ? (
            <>
              {/* مکالمه پشتیبانی — یک‌طرفه (ادمین → کاربر) */}
              <div className="flex shrink-0 items-center gap-2 border-b border-border/70 pb-3">
                <button
                  type="button"
                  aria-label="بازگشت به لیست"
                  onClick={backToList}
                  className="grid size-8 place-items-center rounded-full transition-colors hover:bg-secondary lg:hidden"
                >
                  <ArrowRight size={17} />
                </button>
                <ImchMark className="size-10 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-primary">پشتیبانی ایمچ</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    اطلاع‌رسانی و پاسخ‌های پشتیبانی
                  </p>
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-2.5 overflow-y-auto overscroll-contain touch-pan-y bg-secondary px-0.5 py-3 sm:px-1 sm:py-4 sm:space-y-3 sm:bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] sm:[background-size:18px_18px]">
                {supportMessages.length === 0 ? (
                  <p className="py-8 text-center text-xs leading-6 text-muted-foreground">
                    هنوز پیامی از پشتیبانی ندارید.
                  </p>
                ) : (
                  supportMessages.map((m) => (
                    <div key={m.id} className="flex w-full justify-end">
                      <div
                        dir="auto"
                        className={cn(
                          'w-fit whitespace-pre-wrap break-words shadow-sm',
                          'max-w-[85%] rounded-2xl rounded-se-md border border-border/70 bg-card px-3.5 py-2.5',
                          'text-[13px] leading-6 sm:max-w-[75%] sm:px-4 sm:text-[13.5px] sm:leading-7',
                          'animate-in fade-in slide-in-from-bottom-1 duration-200',
                        )}
                      >
                        <p dir="auto">{m.text}</p>
                        <p className="mt-1 flex items-center gap-1.5 text-[9px] text-muted-foreground">
                          <span>{m.adminUsername}</span>·<span><RelativeTime date={m.createdAt} /></span>
                        </p>
                      </div>
                    </div>
                  ))
                )}

                {/* پاسخ خوانده‌نشدهٔ گفتگوی پشتیبانی — اعلان لینک‌دار داخل چت
                    (خواسته مالک ۸-۱۱): کلیک → صفحهٔ تیکت پشتیبانی */}
                {ticketUnread > 0 && (
                  <div className="flex w-full justify-center">
                    <Link
                      href="/panel/support"
                      className="flex w-full max-w-[92%] items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-start transition-colors hover:bg-red-100"
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-red-500 text-white">
                        <MessageSquare size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-red-700">
                          شما {toFa(ticketUnread)} پیام خوانده‌نشده در پنل پشتیبانی دارید
                        </span>
                        <span className="mt-0.5 block text-[11px] font-bold text-red-600 underline underline-offset-2">
                          مشاهدهٔ گفتگو با پشتیبان
                        </span>
                      </span>
                    </Link>
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t pt-3">
                <p className="rounded-md bg-secondary/50 px-3 py-2.5 text-center text-[11px] leading-6 text-muted-foreground">
                  برای پرسش‌های خود از{' '}
                  <Link href="/panel/support" className="font-bold text-primary hover:underline">
                    صفحهٔ پشتیبانی
                  </Link>{' '}
                  استفاده کنید.
                </p>
              </div>
            </>
          ) : active ? (
            <>
              {/* هدر مکالمه — مینیمال: برگشت (موبایل) + مخاطب + حضور */}
              <div className="flex shrink-0 items-center gap-2 border-b border-border/70 pb-3">
                <button
                  type="button"
                  aria-label="بازگشت به لیست"
                  onClick={backToList}
                  className="grid size-8 shrink-0 place-items-center rounded-full transition-colors hover:bg-secondary lg:hidden"
                >
                  <ArrowRight size={17} />
                </button>
                <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                  {active.counterpart.avatarUrl ? (
                     
                    <img src={active.counterpart.avatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    nameOf(active).charAt(0)
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex min-w-0 items-center gap-2 text-sm font-bold">
                    <span className="truncate">{nameOf(active)}</span>
                    <PresenceDot
                      online={presenceOf(active)?.online}
                      lastSeenAt={presenceOf(active)?.lastSeenAt ?? undefined}
                      className="shrink-0"
                    />
                  </p>
                  {active.productName && (
                    <p className="truncate text-[11px] text-muted-foreground">
                      مکالمه روی: {active.productName}
                    </p>
                  )}
                </div>
              </div>

              {/* پیام‌ها — پیجینگ معکوس؛ ورود: توقف روی اولین پیام خوانده‌نشده
                  (خواسته مالک ۸-۱۱)، بدون پیام جدید: پرش به آخرین پیام */}
              <MessageList
                threadKey={active.id}
                messages={messages ?? []}
                myId={myId}
                firstUnreadId={firstUnreadId}
                hasMore={hasMore}
                loadingOlder={isFetchingNextPage}
                onLoadOlder={() => void fetchNextPage()}
                onEdit={(m) => setEditing(m)}
                onDelete={handleDelete}
              />

              {/* ارسال — متن یا پیوست (تا ۵MB) */}
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
            </>
          ) : isLoading ? (
            <div className="grid flex-1 place-items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <PanelEmptyState
              icon={MessageSquare}
              title="هیچ پیام جدیدی ندارید!"
              hint="برای شروع گفتگو با خریداران و فروشندگان ایمچ، از صفحه هر آگهی پیام ارسال کنید."
            />
          )}
            </>
          )}
        </PanelCard>
      </div>
    </div>
  );
}

/** ردیف مکالمه در لیست — بج خوانده‌نشده قرمز (خواسته مالک ۷-۱۱) */
function ThreadRow({
  thread,
  active,
  presence,
  onSelect,
  nameOf,
}: {
  thread: ChatThreadInfo;
  active: boolean;
  presence: { online?: boolean; lastSeenAt?: string | null } | undefined;
  onSelect: () => void;
  nameOf: (t: ChatThreadInfo) => string;
}) {
  return (
    <li className="pb-1">
      <button
        type="button"
        onClick={onSelect}
        className={cn(
          'flex w-full items-center gap-3 rounded-md px-2 py-3 text-start transition-colors',
          active ? 'bg-primary/10' : 'hover:bg-secondary/70',
        )}
      >
        <span className="relative grid size-10 shrink-0 place-items-center overflow-hidden rounded-full bg-secondary text-xs font-extrabold">
          {thread.counterpart.avatarUrl ? (
             
            <img src={thread.counterpart.avatarUrl} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            nameOf(thread).charAt(0)
          )}
          <PresenceDot
            online={presence?.online}
            showLabel={false}
            size="sm"
            className="absolute -bottom-0.5 -start-0.5"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="truncate text-sm font-bold">{nameOf(thread)}</span>
            <span className="shrink-0 text-[10px] text-muted-foreground">
              <RelativeTime date={thread.lastMessage?.at ?? thread.updatedAt} />
            </span>
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2">
            <span className="truncate text-xs text-muted-foreground">
              {thread.lastMessage?.senderId === thread.myId ? 'شما: ' : ''}
              {thread.lastMessage?.text ?? 'بدون پیام'}
            </span>
            {thread.unreadCount > 0 && (
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {toFa(thread.unreadCount)}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}
