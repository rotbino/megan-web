'use client';

/**
 * پیام‌ها — پیام‌رسان پنل (B8 — واقعی، منطق MHTML باسکول):
 * + چت دو مرحله‌ای موبایل (خواسته مالک ۷-۱۱): اول لیست مخاطبان، بعد مکالمه.
 * + پیام‌های کاربر راست، مخاطب چپ؛ طراحی مینیمال موبایل/دسکتاپ.
 * + پیوست تصویر/ویدئو/سند تا ۵MB (لیست سفید + بایت جادویی سمت سرور).
 * + ویرایش/حذف فقط تا قبل از مشاهدهٔ طرف مقابل — چت مدرک است.
 * + پیجینگ معکوس: آخرین ۲۰ پیام اول، اسکرول به بالا صفحهٔ قدیمی‌تر.
 * + مکالمهٔ «پشتیبانی ایمچ» با نشان M برند؛ گفتگوی دارای آخرین پیامِ
 *   تازه‌تر بالاتر از پشتیبانی می‌نشیند (خواسته مالک ۷-۱۱).
 */

import { useEffect, useState } from 'react';
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
  useSendChatMessage,
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

export default function PanelMessagesPage() {
  const { toast } = useToast();
  const { data: conversations, isLoading } = useConversations();
  const { data: adminInbox } = useAdminMessages();
  const markAdminRead = useMarkAdminMessagesRead();

  // دو مرحله‌ای موبایل: «لیست» → انتخاب → «چت»؛ برگشت → «لیست»
  // لینک مستقیم thread (پیشنهاد تامین) → مستقیم مرحلهٔ چت
  const [directThread] = useState(() => {
    try {
      const t = new URLSearchParams(window.location.search).get('thread');
      return t && /^[0-9a-fA-F]{24}$/.test(t) ? t : null;
    } catch {
      return null;
    }
  });
  const [stage, setStage] = useState<'list' | 'chat'>(directThread ? 'chat' : 'list');
  const [activeId, setActiveId] = useState<string | null>(directThread);
  const [q, setQ] = useState('');

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
  const active = isSupport ? null : threads.find((t) => t.id === activeId) ?? threads[0] ?? null;
  // دسکتاپ: اولین مکالمه به‌صورت پیش‌فرض باز است؛ موبایل با انتخاب کاربر.
  // پشتیبانی فقط وقتی خودکار باز می‌شود که مکالمه‌ای نیست «و» لود تمام شده —
  // در حین لود (threads خالی) نباید پشتیبانی باز شود و پیام‌هایش خوانده شوند.
  const effectiveActive =
    active ?? (!isLoading && supportMessages.length > 0 ? SUPPORT_ID : null);
  const showingSupport = effectiveActive === SUPPORT_ID;
  const myId = active?.myId ?? null;
  const lastSupport = supportMessages[supportMessages.length - 1];

  const {
    messages,
    hasMore,
    isFetchingNextPage,
    fetchNextPage,
  } = useChatThreadMessages(showingSupport ? null : active?.id ?? null);

  // باز کردن مکالمه پشتیبانی = خواندن همه خوانده‌نشده‌ها
  useEffect(() => {
    if (showingSupport && supportUnread > 0 && !markAdminRead.isPending) {
      markAdminRead.mutate();
    }
  }, [showingSupport, supportUnread]);

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
  };

  return (
    // چت اپ‌طور: در موبایل عرض مفید = 100dvh منهای هدر چسبان (۵۶) + ناوبری
    // پایین (۵۹) + پدینگ‌ها — فلکس کالمن، کارت چت فضای باقی‌مانده را می‌گیرد و
    // بنرها/جستجو ارتفاع خودشان را کم می‌کنند. دسکتاپ: ریشه h-full پوسته.
    <div className="mx-auto flex h-[calc(100dvh-140px)] min-h-[480px] max-w-5xl flex-col gap-4 lg:h-full lg:min-h-0">
      {/* وب‌پوش (B10) — اعلان پیام‌های جدید وقتی سایت باز نیست */}
      <PushEnableBanner />
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-[320px_1fr] lg:grid-rows-[minmax(0,1fr)]">
        {/* مرحلهٔ ۱ (موبایل): لیست مخاطبان — دسکتاپ: ستون ثابت */}
        <PanelCard
          className={cn(
            'order-2 flex flex-col lg:order-1',
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
                        {lastSupport?.text ?? ''}
                      </span>
                      {supportUnread > 0 && (
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {toFa(supportUnread)}
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

        {/* مرحلهٔ ۲ (موبایل): مکالمه — دسکتاپ: همیشه باز؛ ارتفاع از فلکس والد */}
        <PanelCard
          className={cn(
            'order-1 flex h-full min-h-0 flex-col lg:order-2',
            stage === 'list' && 'hidden lg:flex',
          )}
        >
          {showingSupport ? (
            <>
              {/* مکالمه پشتیبانی — یک‌طرفه (ادمین → کاربر) */}
              <div className="flex shrink-0 items-center gap-2 border-b border-border/70 pb-3">
                <button
                  type="button"
                  aria-label="بازگشت به لیست"
                  onClick={() => setStage('list')}
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

              <div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain touch-pan-y px-0.5 py-3 sm:px-1 sm:py-4 sm:space-y-3 sm:bg-[radial-gradient(circle_at_1px_1px,var(--border)_1px,transparent_0)] sm:[background-size:18px_18px]">
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
                  onClick={() => setStage('list')}
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

              {/* پیام‌ها — پیجینگ معکوس + اسکرول تهِ لیست هنگام ورود */}
              <MessageList
                threadKey={active.id}
                messages={messages ?? []}
                myId={myId}
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
