'use client';

/**
 * پیام ها — پیام‌رسان پنل (B8 — واقعی، منطق MHTML باسکول):
 * لیست مکالمات با جستجو + نمای چت زنده (WS + REST) + «ویرایش قیمت»
 * (ارسال پیام قالب‌دار قیمت) + «گزارش تخلف کاربر» + جعبه «ارسال برای دوستان».
 * + مکالمه سنجاق‌شده «پشتیبانی ایمچ» — پیام‌های مستقیم ادمین (یک‌طرفه).
 */

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Copy, Flag, Headset, Mail, MessageSquare, Pencil, Search, Send, Share2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PanelCard, PanelEmptyState } from '@/components/panel/panel-parts';
import { PushEnableBanner } from '@/components/shared/push-enable';
import { UnitInput } from '@/components/shared/unit-input';
import { useToast } from '@/hooks/use-toast';
import {
  useAdminMessages,
  useChatSocketEvents,
  useChatThreadMessages,
  useConversations,
  useMarkAdminMessagesRead,
  useSendChatMessage,
} from '@/lib/mock/hooks';
import type { ChatThreadInfo } from '@/lib/mock/api';
import { toFa } from '@/lib/format';
import { RelativeTime } from '@/components/shared/relative-time';
import { cn } from '@/lib/utils';

const SHARE_LINK = 'https://imach.ir';

/** شناسه ساختگی مکالمه پشتیبانی — از id مکالمات واقعی جدا می‌ماند */
const SUPPORT_ID = '__support__';

export default function PanelMessagesPage() {
  const { toast } = useToast();
  const { data: conversations, isLoading } = useConversations();
  const { data: adminInbox } = useAdminMessages();
  const markAdminRead = useMarkAdminMessagesRead();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [draft, setDraft] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const send = useSendChatMessage();

  // رویدادهای زنده — لیست و پیام‌ها خودشان تازه می‌شوند (چت + پشتیبانی)
  useChatSocketEvents();

  const threads: ChatThreadInfo[] = conversations ?? [];
  const supportMessages = adminInbox?.items ?? [];
  const supportUnread = adminInbox?.unread ?? 0;
  const isSupport = activeId === SUPPORT_ID;
  const active = isSupport ? null : threads.find((t) => t.id === activeId) ?? threads[0] ?? null;
  // پیش‌فرض: اولین مکالمه؛ نبود → پشتیبانی (اگر پیام دارد)
  const effectiveActive = active ?? (supportMessages.length > 0 ? SUPPORT_ID : null);
  const showingSupport = effectiveActive === SUPPORT_ID;
  const { data: messages } = useChatThreadMessages(showingSupport ? null : active?.id ?? null);
  const myId = active?.myId ?? null;
  const lastSupport = supportMessages[supportMessages.length - 1];

  // باز کردن مکالمه پشتیبانی = خواندن همه خوانده‌نشده‌ها
  useEffect(() => {
    if (showingSupport && supportUnread > 0 && !markAdminRead.isPending) {
      markAdminRead.mutate();
    }
  }, [showingSupport, supportUnread]);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages?.length, supportMessages.length, showingSupport]);

  const visible = threads.filter((t) => {
    const name = `${t.counterpart.firstName} ${t.counterpart.lastName}`.trim();
    return !q.trim() || name.includes(q.trim()) || t.productName.includes(q.trim());
  });

  const sendMsg = (text: string) => {
    const t = text.trim();
    if (!t || !active || send.isPending) return;
    send.mutate(
      { threadId: active.id, text: t },
      {
        onError: (err) =>
          toast({ description: err instanceof Error ? err.message : 'ارسال پیام ناموفق بود.' }),
      },
    );
  };

  const nameOf = (t: ChatThreadInfo) =>
    `${t.counterpart.firstName} ${t.counterpart.lastName}`.trim() || 'کاربر ایمچ';

  // ویرایش قیمت — عین دیالوگ باسکول (ارسال پیام قالب‌دار)
  const [priceOpen, setPriceOpen] = useState(false);
  const [price, setPrice] = useState('');

  // گزارش تخلف — عین دیالوگ باسکول
  const [reportOpen, setReportOpen] = useState(false);
  const [reportText, setReportText] = useState('');

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* وب‌پوش (B10) — اعلان پیام‌های جدید وقتی سایت باز نیست */}
      <PushEnableBanner />
      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* لیست مخاطبان */}
        <PanelCard className="order-2 lg:order-1">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">
              مخاطب <span className="text-muted-foreground">({toFa(threads.length)})</span>
            </p>
          </div>
          <div className="relative mt-3">
            <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="جستجوی مکالمه…" className="rounded-md pe-9" />
          </div>
          {isLoading ? (
            <div className="mt-3 space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-md bg-secondary/60" />)}
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-border/70">
              {/* پشتیبانی ایمچ — سنجاق‌شده بالا؛ پیام‌های مستقیم ادمین (یک‌طرفه) */}
              <li className="pb-1">
                <button
                  type="button"
                  onClick={() => setActiveId(SUPPORT_ID)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-md px-2 py-3 text-start transition-colors',
                    showingSupport ? 'bg-primary/10' : 'hover:bg-secondary/70',
                  )}
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <Headset size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold text-primary">پشتیبانی ایمچ</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {lastSupport ? <RelativeTime date={lastSupport.createdAt} /> : '—'}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center justify-between gap-2">
                      <span className="truncate text-xs text-muted-foreground">
                        {lastSupport?.text ?? 'پیام‌های مدیریت ایمچ اینجا می‌آید'}
                      </span>
                      {supportUnread > 0 && (
                        <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                          {toFa(supportUnread)}
                        </span>
                      )}
                    </span>
                  </span>
                </button>
              </li>
              {visible.length === 0 && (
                <li>
                  <p className="rounded-md bg-secondary/50 px-3 py-3 text-center text-xs leading-6 text-muted-foreground">
                    مکالمه‌ای یافت نشد. گفتگو از صفحه هر آگهی («چت با فروشنده») شروع می‌شود.
                  </p>
                </li>
              )}
              {visible.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md px-2 py-3 text-start transition-colors',
                      !showingSupport && active?.id === t.id ? 'bg-primary/10' : 'hover:bg-secondary/70',
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-xs font-extrabold">
                      {nameOf(t).charAt(0)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold">{nameOf(t)}</span>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          <RelativeTime date={t.lastMessage?.at ?? t.updatedAt} />
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-muted-foreground">
                          {t.lastMessage?.text ?? 'بدون پیام'}
                        </span>
                        {t.unreadCount > 0 && (
                          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                            {toFa(t.unreadCount)}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* ارسال برای دوستان — عین باسکول */}
          <div className="mt-4 rounded-md border bg-secondary/30 p-3">
            <p className="flex items-center gap-1.5 text-xs font-bold">
              <Share2 size={14} />
              ارسال برای دوستان
            </p>
            <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
              با معرفی ایمچ به همکارانتان، بازار بزرگ‌تر و قیمت‌های بهتری داشته باشید.
            </p>
            <div className="mt-2.5 flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1 rounded-md text-[11px]"
                onClick={() => toast({ description: 'به‌زودی: اشتراک‌گذاری در تلگرام' })}
              >
                تلگرام
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1 rounded-md text-[11px]"
                onClick={() => toast({ description: 'به‌زودی: اشتراک‌گذاری در واتس آپ' })}
              >
                واتس آپ
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 flex-1 rounded-md text-[11px]"
                onClick={() => toast({ description: 'به‌زودی: اشتراک‌گذاری با ایمیل' })}
              >
                <Mail size={13} /> ایمیل
              </Button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (typeof navigator !== 'undefined' && navigator.clipboard) {
                  navigator.clipboard.writeText(SHARE_LINK).catch(() => {});
                }
                toast({ description: 'کپی شد.' });
              }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed py-2 text-[11px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
            >
              <Copy size={12} />
              کپی لینک
            </button>
          </div>
        </PanelCard>

        {/* نمای چت */}
        <PanelCard className="order-1 flex min-h-[420px] flex-col lg:order-2">
          {showingSupport ? (
            <>
              {/* مکالمه پشتیبانی — یک‌طرفه (ادمین → کاربر) */}
              <div className="flex items-center gap-3 border-b border-border/70 pb-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <Headset size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-primary">پشتیبانی ایمچ</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    اطلاع‌رسانی و پیام‌های مدیریت ایمچ
                    {adminInbox ? ` — ${toFa(adminInbox.total)} پیام` : ''}
                  </p>
                </div>
              </div>

              <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto py-4">
                {supportMessages.length === 0 ? (
                  <p className="py-8 text-center text-xs leading-6 text-muted-foreground">
                    هنوز پیامی از پشتیبانی ندارید.
                  </p>
                ) : (
                  supportMessages.map((m) => (
                    <div key={m.id} className="w-fit max-w-[80%] rounded-lg rounded-tr-sm bg-secondary px-3.5 py-2.5">
                      <p dir="auto" className="text-xs leading-6">{m.text}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-[9px] text-muted-foreground">
                        <span>{m.adminUsername}</span>·<span><RelativeTime date={m.createdAt} /></span>
                      </p>
                    </div>
                  ))
                )}
              </div>

              <div className="border-t border-border/70 pt-3">
                <p className="rounded-md bg-secondary/50 px-3 py-2.5 text-center text-[11px] leading-6 text-muted-foreground">
                  این پیام‌ها یک‌طرفه از طرف مدیریت ایمچ است. برای پرسش‌ها از{' '}
                  <Link href="/panel/support" className="font-bold text-primary hover:underline">صفحه پشتیبانی</Link>{' '}
                  استفاده کنید.
                </p>
              </div>
            </>
          ) : active ? (
            <>
              <div className="flex items-center gap-3 border-b border-border/70 pb-3">
                <span className="grid size-10 place-items-center rounded-full bg-primary/10 text-xs font-extrabold text-primary">
                  {nameOf(active).charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{nameOf(active)}</p>
                  <p className="truncate text-[11px] text-muted-foreground">مکالمه روی: {active.productName}</p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-md text-[11px]"
                    onClick={() => {
                      setPrice('');
                      setPriceOpen(true);
                    }}
                  >
                    <Pencil size={13} /> ویرایش قیمت
                  </Button>
                  <button
                    type="button"
                    aria-label="گزارش تخلف کاربر"
                    title="گزارش تخلف کاربر"
                    onClick={() => setReportOpen(true)}
                    className="grid size-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-500"
                  >
                    <Flag size={15} />
                  </button>
                </div>
              </div>

              <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto py-4">
                {!messages || messages.length === 0 ? (
                  <p className="py-8 text-center text-xs leading-6 text-muted-foreground">
                    برای شروع مکالمه پیامی بنویسید
                  </p>
                ) : (
                  messages.map((m) => (
                    <p
                      key={m.id}
                      dir="auto"
                      className={cn(
                        'w-fit max-w-[80%] rounded-lg px-3.5 py-2.5 text-xs leading-6',
                        m.senderId === myId
                          ? 'ms-auto rounded-tl-sm bg-primary text-primary-foreground'
                          : 'rounded-tr-sm bg-secondary',
                      )}
                    >
                      {m.text}
                      {m.senderId === myId && m.readAt && (
                        <span className="ms-2 align-middle text-[9px] text-primary-foreground/70">✓✓</span>
                      )}
                    </p>
                  ))
                )}
              </div>

              <form
                className="flex gap-2 border-t border-border/70 pt-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMsg(draft);
                  setDraft('');
                }}
              >
                <Input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="برای شروع مکالمه پیامی بنویسید"
                  className="rounded-md"
                  maxLength={2000}
                />
                <Button type="submit" size="icon" aria-label="ارسال پیام" className="rounded-md" disabled={send.isPending || !draft.trim()}>
                  <Send size={15} />
                </Button>
              </form>
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

      {/* دیالوگ ویرایش قیمت — عین باسکول؛ ارسال پیام قالب‌دار در همان مکالمه */}
      <Dialog open={priceOpen} onOpenChange={setPriceOpen}>
        <DialogContent className="rounded-lg sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-start">ویرایش قیمت</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="chat-price">
              قیمت <span className="text-muted-foreground">(هر کیلو به تومان)</span> <span className="text-red-500">*</span>
            </Label>
            <UnitInput
              id="chat-price"
              kind="price"
              unit="هر کیلو تومان"
              value={price}
              onValueChange={setPrice}
              placeholder="مثلا: 15,000"
            />
            <p className="text-[11px] leading-5 text-muted-foreground">
              قیمت جدید به‌صورت پیام در همین مکالمه ({active?.productName ?? ''}) ارسال می‌شود.
            </p>
          </div>
          <Button
            className="w-full rounded-md"
            disabled={!price || send.isPending}
            onClick={() => {
              const num = Number(price.replace(/[^\d]/g, ''));
              if (!num || !active) return;
              sendMsg(`قیمت هر کیلو: ${num.toLocaleString('fa-IR')} تومان`);
              setPriceOpen(false);
              setPrice('');
            }}
          >
            ویرایش
          </Button>
        </DialogContent>
      </Dialog>

      {/* دیالوگ گزارش تخلف — عین باسکول */}
      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent className="rounded-lg sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-start">گزارش تخلف کاربر</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="report-text">دلیل گزارش تخلف چیست؟</Label>
            <Textarea
              id="report-text"
              dir="rtl"
              rows={4}
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              className="resize-none text-sm leading-7"
              placeholder="توضیح کوتاه بنویسید…"
            />
          </div>
          <Button
            className="w-full rounded-md"
            disabled={reportText.trim().length < 5}
            onClick={() => {
              setReportOpen(false);
              setReportText('');
              toast({ description: 'گزارش شما ثبت شد؛ تیم ایمچ بررسی می‌کند.' });
            }}
          >
            ثبت گزارش
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
