'use client';

/**
 * پشتیبانی — عین MHTML باسکول:
 * «سامی جابر عزیز، سلام!» + «پاسخگویی به سوالات شما» + «گفتگو با پشتیبان».
 *
 * دور ۲۶ (خواستهٔ مالک ۸-۱۱): پرسش‌های متداول از صفحه رفت و کلی از صفحه
 * را اشغال نمی‌کند — به‌جایش یک لینک در سرصفحهٔ «گفتگو با پشتیبان» است
 * که آن را به‌صورت مودال باز می‌کند (موبایل: بات‌شیت / دسکتاپ: مودال
 * مرکزی — قانون §۲). نتیجه: چت پشتیبانی تقریبا تمام ارتفاع صفحه را
 * می‌گیرد (موبایل: 100dvh منهای هدر ۵۶ + نوار پایین ۵۹ + پدینگ main؛
 * دسکتاپ: h-full داخل main که خودش ظرف اسکرول است) و کاربر با آن راحت‌تر است.
 *
 * گفتگو با پشتیبان (دور ۲۱): چت واقعی دوطرفه — پیام‌ها در بک‌اند
 * (support/*) ذخیره می‌شوند و پاسخ پشتیبان از پنل مدیریت
 * (پشتیبانی → تیکت کاربران) می‌آید. باز کردن واقعی صفحه (تب مرئی) =
 * خواندن پیام‌های پشتیبان (خواستهٔ مالک ۸-۱۱ دور ۲۴: قبلاً هر fetch —
 * polling پس‌زمینه/تب مخفی — بج پشتیبانی را بی‌آنکه کاربر ببیند صفر
 * می‌کرد و حلقهٔ اعلان می‌شکست). موبایل و دسکتاپ هم‌سنجه (قانون §۲).
 *
 * خواسته مالک ۸-۱۱: پیوست تصویر/ویدئو/سند تا ۵MB (هر دو سو) + ریل‌تایم —
 * پاسخ پشتیبان با WS (support:newMessage) همان لحظه می‌آید؛ حباب‌های
 * پیام مشابه چت (MessageBubble مشترک) رندر می‌شوند.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, HelpCircle, LifeBuoy, Loader2, Paperclip, Send, Users, X } from 'lucide-react';
import { usePanelProfile, useChatSocketEvents } from '@/lib/mock/hooks';
import {
  getSupportConversation,
  markSupportConversationRead,
  sendSupportMessage,
  uploadSupportAttachment,
  type SupportChatMessage,
} from '@/lib/mock/api';
import type { ChatFileMeta, ChatMessage } from '@/lib/mock/api';
import { fileRejectReason } from '@/components/chat/chat-composer';
import { MessageBubble } from '@/components/chat/message-bubble';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { PanelCard } from '@/components/panel/panel-parts';
import { BottomSheet } from '@/components/shared/bottom-sheet';
import { cn } from '@/lib/utils';

type FaqTab = 'sellers' | 'buyers' | 'verification';

const FAQS: Record<FaqTab, { q: string; a: string }[]> = {
  sellers: [
    {
      q: 'چگونه می توانم برنامه ایمچ را نصب کنم؟',
      a: 'با تلفن همراه خود به وبسایت ایمچ وارد شوید و از صفحه «ایمچ من» گزینه نصب اپلیکیشن را انتخاب کنید؛ از صفحه باز شده اقدام به نصب کنید.',
    },
    {
      q: 'به چه علت آگهی محصول رد می شود؟',
      a: 'آگهی‌های مغایر قوانین، با شماره تماس یا لوگو روی تصاویر، تصاویر بی‌کیفیت یا نامرتبط، و موجودی با مقیاس خرده‌فروشی رد می‌شوند.',
    },
    {
      q: 'چگونه از سرنخ‌های فروش در ایمچ استفاده کنم؟',
      a: 'در صفحهٔ «خریداران» پنل، مطابق‌ترین خریداران با آگهی‌های شما بالاتر از لیست نمایش داده می‌شوند؛ می‌توانید چت کنید یا تماس بگیرید و برای خریدهای دوره‌ای پیشنهاد تامین بفرستید.',
    },
    {
      q: 'گزارش و آمار محصولم را از کجا ببینم؟',
      a: 'از صفحه «محصولات من»، ردیف هر آگهی، بازدید و موجودی و کف قیمت را نشان می‌دهد؛ جزئیات کامل در صفحه آگری شما در بازار.',
    },
  ],
  buyers: [
    {
      q: 'تایید درخواست خرید چقدر طول می‌کشد؟',
      a: 'درخواست‌های خرید معمولاً در کمتر از چند ساعت توسط کارشناسان ایمچ بررسی و تایید می‌شوند؛ نتیجه در «درخواست های من» قابل مشاهده است.',
    },
    {
      q: 'چگونه به فروشندگان اعتماد کنم؟',
      a: 'فروشندگان احراز هویت شده با نشان تأیید مشخص می‌شوند؛ در هر صورت معاملات را حضوری انجام دهید و از واریز پول از راه دور خودداری کنید.',
    },
    {
      q: 'چگونه درخواست خرید ثبت کنم؟',
      a: 'از منوی پنل «ثبت درخواست خرید» را انتخاب کنید؛ ابتدا دسته بندی و بعد نوع کالا و میزان نیازمندی را وارد کنید تا قیمت‌ها به شما برسد.',
    },
    {
      q: 'پیامک «فروشنده جدید» آمده ولی در ایمچ پیامی ندارم.',
      a: 'فروشندگان پیشنهادی مرتبط با درخواست شما، از قسمت «پیشنهادی» در پنل قابل مشاهده و دسترسی هستند.',
    },
  ],
  verification: [
    {
      q: 'احراز هویت یعنی چه؟',
      a: 'ارسال مشخصات هویتی صاحب حساب جهت تایید درستی و واقعی بودن هویت افراد؛ افراد احراز شده با نشان ویژه مشخص می‌شوند.',
    },
    {
      q: 'چه مدارکی برای احراز هویت لازم است؟',
      a: 'تصویر کارت ملی و یک سلفی همراه با آن؛ برای حساب‌های حقوقی، مدارک ثبت شرکت نیز لازم است.',
    },
    {
      q: 'احراز هویت چقدر طول می‌کشد؟',
      a: 'پس از ارسال مدارک، بررسی معمولاً در همان روز کاری انجام می‌شود و نتیجه به شما اعلام می‌گردد.',
    },
    {
      q: 'چرا احراز هویت لازم است؟',
      a: 'افراد احراز شده طبیعتاً مطمئن‌تر برای انجام معاملات هستند و پاسخ سریع‌تری از طرف مقابل دریافت می‌کنند.',
    },
  ],
};

const TABS: { key: FaqTab; label: string }[] = [
  { key: 'sellers', label: 'فروشندگان' },
  { key: 'buyers', label: 'خریداران' },
  { key: 'verification', label: 'احراز هویت' },
];

/** پیام گفتگوی پشتیبانی — عین SupportMessageDto بک‌اند */
interface SupportMessage {
  id: string;
  senderRole: 'user' | 'admin';
  adminUsername: string | null;
  text: string;
  readAt: string | null;
  createdAt: string;
}

export default function SupportPage() {
  const { data: profile } = usePanelProfile();
  const firstName = profile?.userInfo.firstName ?? 'کاربر';
  const [faqOpen, setFaqOpen] = useState(false);

  return (
    // تمام‌قد (خواستهٔ مالک ۸-۱۱ دور ۲۶): پرسش‌های متداول به لینک/مودال رفت
    // تا گفتگو تقریبا تمام ارتفاع صفحه را بگیرد. موبایل: 100dvh − هدر چسبان
    // ۵۶ − نوار پایین ۵۹ − پدینگ main (p-3=۲۴ / sm:p-4=۳۲)؛ دسکتاپ: h-full
    // داخل main (خودش ظرف اسکرول است پس کارت دقیقا تا پایین صفحه می‌رسد).
    // نکته: height قطعی (نه min-height) لازم است وگرنه در موبایل — که هیچ
    // جدی در زنجیره ارتفاع قطعی ندارد — کارت به اندازهٔ کل تاریخچه رشد
    // می‌کند و چت «تمام‌قد» نمی‌شود.
    <div className="mx-auto flex h-[calc(100dvh-139px)] max-w-3xl flex-col gap-4 sm:h-[calc(100dvh-147px)] lg:h-full">
      <div className="shrink-0">
        <h1 className="text-lg font-extrabold">
          {firstName} عزیز، سلام!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">پاسخگویی به سوالات شما</p>
      </div>

      <SupportChatSection onOpenFaq={() => setFaqOpen(true)} />
      <FaqModal open={faqOpen} onClose={() => setFaqOpen(false)} />
    </div>
  );
}

/**
 * پرسش‌های متداول — دیگر روی صفحه نیست (خواستهٔ مالک ۸-۱۱ دور ۲۶):
 * لینک سرصفحهٔ گفتگو بازش می‌کند. موبایل: بات‌شیت پایین‌رونده؛ دسکتاپ:
 * مودال مرکزی — قانون §۲. محتوا (تب‌ها + آکاردئون) عین قبل است.
 */
function FaqModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [tab, setTab] = useState<FaqTab>('buyers');
  const [openQ, setOpenQ] = useState<string | null>(null);

  // ESC برای مودال دسکتاپ (بات‌شیت موبایل خودش ESC دارد)
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);

  const body = (
    <>
      {/* تب‌ها */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setOpenQ(null);
            }}
            className={cn(
              'shrink-0 rounded-md border px-3.5 py-1.5 text-xs font-bold transition-colors',
              tab === key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'bg-card text-muted-foreground hover:border-primary/40',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* آکاردئون پرسش‌ها */}
      <div className="mt-3 divide-y divide-border/70 rounded-md border">
        {FAQS[tab].map(({ q, a }) => {
          const isOpen = openQ === q;
          return (
            <div key={q}>
              <button
                type="button"
                onClick={() => setOpenQ(isOpen ? null : q)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-2 px-4 py-3 text-start text-sm font-bold transition-colors hover:bg-secondary/40"
              >
                {q}
                <ChevronDown
                  size={16}
                  className={cn('shrink-0 text-muted-foreground transition-transform', isOpen && 'rotate-180')}
                />
              </button>
              {isOpen && (
                <p className="px-4 pb-3.5 text-xs leading-6 text-muted-foreground">{a}</p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );

  return (
    <>
      {/* موبایل — بات‌شیت پایین‌رونده (قانون §۲) */}
      <BottomSheet open={open} onClose={onClose} title="سوال‌های متداول">
        <div className="p-2">{body}</div>
      </BottomSheet>

      {/* دسکتاپ — مودال مرکزی */}
      {open && (
        <div
          className="fixed inset-0 z-[60] hidden items-center justify-center p-4 nav-desktop:flex"
          role="dialog"
          aria-modal="true"
          aria-label="سوال‌های متداول"
        >
          <div className="animate-sheet-fade absolute inset-0 bg-black/40" onClick={onClose} />
          <div className="relative flex max-h-[82vh] w-full max-w-lg flex-col rounded-xl bg-card shadow-2xl">
            <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-4 py-3">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <Users size={17} className="text-primary" />
                سوال‌های متداول
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="بستن"
                className="flex size-8 items-center justify-center rounded-lg text-foreground hover:bg-accent"
              >
                <X size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto p-4">{body}</div>
          </div>
        </div>
      )}
    </>
  );
}

/** گفتگو با پشتیبان — چت دوطرفهٔ واقعی: متن/پیوست + ریل‌تایم WS (خواسته مالک ۸-۱۱)
 *  + تمام‌قد (دور ۲۶): کارت flex-1 است و تاریخچهٔ گفتگو تا پایین صفحه کشیده می‌شود */
function SupportChatSection({ onOpenFaq }: { onOpenFaq: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [attachment, setAttachment] = useState<ChatFileMeta | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ریل‌تایم (خواسته مالک ۸-۱۱): پاسخ پشتیبان با WS همان لحظه می‌آید —
  // خود هوک «support-conversation» و شمارنده‌ها را تازه می‌کند.
  useChatSocketEvents();

  // گفتگو — fetch خالص (بدون خواندن خودکار)؛ شبکهٔ ایمنی REST ۳۰s.
  // خواندن جداگانه و فقط با تب مرئی انجام می‌شود (اثر پایین)
  const { data, isLoading } = useQuery({
    queryKey: ['support-conversation'],
    queryFn: getSupportConversation,
    refetchInterval: 30_000,
  });

  // خواندن پاسخ‌های پشتیبان — فقط وقتی صفحه واقعاً دیده می‌شود (رفع باگ
  // دور ۲۴): تب مخفی/polling پس‌زمینه بج را نمی‌شکند؛ برگشت به تب =
  // refetchOnWindowFocus → unread تازه → همین اثر خواندن را می‌زند
  const unreadFromAdmin = data?.unreadFromAdmin ?? 0;
  const markReadMutation = useMutation({
    mutationFn: markSupportConversationRead,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['support-conversation'] });
      void queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    },
  });
  useEffect(() => {
    if (unreadFromAdmin <= 0 || markReadMutation.isPending) return;
    if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
    markReadMutation.mutate();
  }, [unreadFromAdmin, markReadMutation]);

  // آپلود پیوست — پیش‌نمایش قبل از ارسال (الگوی چت)
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadSupportAttachment(file),
    onSuccess: (meta) => setAttachment(meta),
    onError: (err: Error) => {
      toast({ description: err.message || 'بارگذاری فایل ناموفق بود.', variant: 'destructive' });
    },
  });

  const sendMutation = useMutation({
    mutationFn: () => sendSupportMessage(message.trim(), attachment),
    onSuccess: () => {
      setMessage('');
      setAttachment(null);
      void queryClient.invalidateQueries({ queryKey: ['support-conversation'] });
    },
    onError: (err: Error) => {
      toast({ description: err.message || 'ارسال پیام ناموفق بود — دوباره تلاش کنید.', variant: 'destructive' });
    },
  });

  // اسکرول به آخرین پیام
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [data?.messages?.length]);

  const messages = data?.messages ?? [];
  const busy = sendMutation.isPending || uploadMutation.isPending;
  const canSend = !busy && (attachment ? true : message.trim().length >= 5);

  const pickFile = (f: File | undefined | null) => {
    if (!f) return;
    const reason = fileRejectReason(f);
    if (reason) {
      toast({ description: reason, variant: 'destructive' });
      return;
    }
    uploadMutation.mutate(f);
  };

  const send = () => {
    if (!canSend) return;
    sendMutation.mutate();
  };

  return (
    // min-h-0 لازم است وگرنه min-height:auto (ارتفاع کل تاریخچه) کارت را
    // از سهم flex-1 بزرگ‌تر می‌کند و کامپوزر زیر تاشو می‌رود.
    <PanelCard className="flex min-h-0 flex-1 flex-col">
      {/* سرصفحه — عنوان راست + لینک «سوال‌های متداول» چپ (خواستهٔ مالک
          دور ۲۶: پرسش‌ها از صفحه رفتند و با این لینک به‌صورت مودال باز می‌شوند) */}
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold">
          <LifeBuoy size={16} className="text-primary" />
          گفتگو با پشتیبان
        </p>
        <button
          type="button"
          onClick={onOpenFaq}
          className="flex shrink-0 items-center gap-1.5 rounded-md border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary transition-colors hover:bg-primary/10"
        >
          <HelpCircle size={14} />
          سوال‌های متداول
        </button>
      </div>

      {/* تاریخچهٔ گفتگو — تمام‌قد (دور ۲۶): flex-1 تا پایین کارت؛ زمینهٔ ملایم مثل چت */}
      <div
        ref={listRef}
        className="mt-3 flex min-h-32 flex-1 flex-col gap-y-2.5 overflow-y-auto overscroll-contain touch-pan-y rounded-md border bg-secondary/60 p-3"
      >
        {isLoading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">در حال بارگذاری گفتگو…</p>
        ) : messages.length === 0 ? (
          <p className="py-6 text-center text-xs leading-6 text-muted-foreground">
            هنوز پیامی رد و بدل نشده است — اولین پیام را بنویسید تا پشتیبان پاسخ بدهد.
          </p>
        ) : (
          messages.map((m) => (
            <SupportBubble key={m.id} m={m} />
          ))
        )}
      </div>

      {/* پیش‌نمایش پیوست پیش از ارسال — عین کامپوزر چت */}
      {attachment && (
        <div className="mt-3 flex items-center gap-2.5 rounded-md border bg-secondary/40 p-2">
          {attachment.kind === 'image' ? (
            <img src={attachment.url} alt="" className="size-11 shrink-0 rounded-md object-cover" />
          ) : (
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground">
              {attachment.kind === 'video' ? '🎬' : '📄'}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold">{attachment.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {uploadMutation.isPending ? 'در حال بارگذاری…' : 'آماده ارسال'}
            </span>
          </span>
          <button
            type="button"
            aria-label="حذف پیوست"
            disabled={uploadMutation.isPending}
            onClick={() => setAttachment(null)}
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-foreground/5"
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ارسال پیام */}
      <Textarea
        dir="rtl"
        rows={4}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            send();
          }
        }}
        className="mt-3 resize-none text-sm leading-7"
        placeholder="توضیحات"
        maxLength={2000}
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="hidden text-[10px] text-muted-foreground sm:block">Ctrl+Enter برای ارسال سریع</p>
        <div className="flex items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            hidden
            accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
            onChange={(e) => {
              pickFile(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-label="پیوست فایل"
            title="ارسال تصویر، ویدئو یا فایل (حداکثر ۵ مگابایت)"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
            className="rounded-md gap-1.5"
          >
            {uploadMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Paperclip size={14} />}
            پیوست
          </Button>
          <Button
            size="sm"
            className="rounded-md"
            disabled={!canSend}
            onClick={send}
          >
            {sendMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            ارسال پیام
          </Button>
        </div>
      </div>
    </PanelCard>
  );
}

/** نگاشت پیام پشتیبانی → شکل ChatMessage — رندر با MessageBubble مشترک چت */
function toChatMessage(m: SupportChatMessage): ChatMessage {
  return {
    id: m.id,
    threadId: 'support',
    senderId: m.senderRole,
    text: m.text,
    readAt: m.readAt,
    createdAt: m.createdAt,
    kind: m.kind,
    file: m.file,
    editedAt: null,
  };
}

/** حباب پیام پشتیبانی — از همان MessageBubble چت
 *  (تصویر/ویدئو/سند + لایت‌باکس + زمان و تیک خوانده‌شدن داخل حباب) */
function SupportBubble({ m }: { m: SupportChatMessage }) {
  const isMine = m.senderRole === 'user';
  return (
    <div className={cn('flex w-full flex-col gap-1', isMine ? 'items-end' : 'items-start')}>
      {!isMine && (
        <p className="flex items-center gap-1.5 px-1 text-[9.5px] text-muted-foreground">
          <span className="rounded-full bg-primary/10 px-1.5 py-px font-bold text-primary">
            پشتیبان ایمچ
          </span>
          {m.adminUsername && <span className="font-bold">{m.adminUsername}</span>}
        </p>
      )}
      <MessageBubble message={toChatMessage(m)} mine={isMine} />
    </div>
  );
}
