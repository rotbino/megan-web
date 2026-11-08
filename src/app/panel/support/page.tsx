'use client';

/**
 * پشتیبانی — عین MHTML باسکول:
 * «سامی جابر عزیز، سلام!» + «پاسخگویی به سوالات شما» + پرسش‌های متداول
 * با تب‌های (فروشندگان/خریداران/احراز هویت) + آکاردئون + «گفتگو با پشتیبان».
 *
 * گفتگو با پشتیبان (دور ۲۱): چت واقعی دوطرفه — پیام‌ها در بک‌اند
 * (support/*) ذخیره می‌شوند و پاسخ پشتیبان از پنل مدیریت
 * (پشتیبانی → تیکت کاربران) می‌آید. باز کردن واقعی صفحه (تب مرئی) =
 * خواندن پیام‌های پشتیبان (خواستهٔ مالک ۸-۱۱ دور ۲۴: قبلاً هر fetch —
 * polling پس‌زمینه/تب مخفی — بج پشتیبانی را بی‌آنکه کاربر ببیند صفر
 * می‌کرد و حلقهٔ اعلان می‌شکست). موبایل و دسکتاپ هم‌سنجه (قانون §۲).
 *
 * خواستهٔ مالک ۸-۱۱: پیوست تصویر/ویدئو/سند تا ۵MB (هر دو سو) + ریل‌تایم —
 * پاسخ پشتیبان با WS (support:newMessage) همان لحظه می‌آید؛ حباب‌های
 * پیام مشابه چت (MessageBubble مشترک) رندر می‌شوند.
 */

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, ChevronDown, LifeBuoy, Loader2, Paperclip, Send, Users, X } from 'lucide-react';
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

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-extrabold">
          {firstName} عزیز، سلام!
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">پاسخگویی به سوالات شما</p>
      </div>

      <FaqSection />
      <SupportChatSection />
    </div>
  );
}

/** پرسش‌های متداول — تب‌ها + آکاردئون (بدون تغییر) */
function FaqSection() {
  const [tab, setTab] = useState<FaqTab>('buyers');
  const [open, setOpen] = useState<string | null>(null);

  return (
    <PanelCard>
      <div className="flex items-center gap-2">
        <Users size={16} className="text-primary" />
        <p className="text-sm font-bold">پرسش‌های متداول</p>
      </div>

      {/* تب‌ها */}
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setOpen(null);
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
          const isOpen = open === q;
          return (
            <div key={q}>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : q)}
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
    </PanelCard>
  );
}

/** گفتگو با پشتیبان — چت دوطرفهٔ واقعی: متن/پیوست + ریل‌تایم WS (خواسته مالک ۸-۱۱) */
function SupportChatSection() {
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
    <PanelCard>
      <div className="flex items-center gap-2">
        <LifeBuoy size={16} className="text-primary" />
        <p className="text-sm font-bold">گفتگو با پشتیبان</p>
      </div>
      <p className="mt-1 text-xs leading-6 text-muted-foreground">
        پاسخ پرسش خود را پیدا نکردید؟ برای راهنمایی بیشتر و یا اعلام مشکل خود، توضیحات را بنویسید.
      </p>

      {/* تاریخچهٔ گفتگو — زمینهٔ ملایم مثل چت (خواسته مالک ۸-۱۱) */}
      <div
        ref={listRef}
        className="mt-3 flex max-h-80 flex-col gap-y-2.5 overflow-y-auto overscroll-contain touch-pan-y rounded-md border bg-secondary/60 p-3"
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
