'use client';

/**
 * چت‌های پشتیبانی (خواستهٔ مالک ۸-۱۱ دور ۲۱) — نمای پاسخ‌دهندهٔ ادمین.
 *
 * تفاوت با «چت‌های کاربران» (admin/chats): آنجا ادمین تماشاگر است، اینجا
 * گیرندهٔ واقعی و پاسخ‌دهنده — باز کردن گفتگو پیام‌های کاربر را خوانده‌شده
 * می‌کند (بج منو صفر می‌شود) و پایین صفحه جعبهٔ پاسخ هست.
 *
 * ساختار: لیست گفتگوها (هر کاربر یک گفتگوی پیوسته) + نمای مکالمه + پاسخ.
 * موبایل: تک‌ستونه — لیست ← مکالمه (دکمهٔ بازگشت)؛ دسکتاپ: دوپنله.
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  Headset,
  Loader2,
  RefreshCw,
  Search,
  Send,
  User,
} from 'lucide-react';
import {
  fetchAdminSupportMessages,
  fetchAdminSupportStats,
  fetchAdminSupportThreads,
  sendAdminSupportMessage,
  type AdminSupportThreadRow,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { RelativeTime } from '@/components/shared/relative-time';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

type FilterKey = 'all' | 'unread' | 'awaiting';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'همه' },
  { key: 'unread', label: 'خوانده‌نشده' },
  { key: 'awaiting', label: 'در انتظار پاسخ پشتیبان' },
];

const PER_PAGE = 20;

export default function AdminSupportPage() {
  return (
    <Suspense>
      <AdminSupportInner />
    </Suspense>
  );
}

function AdminSupportInner() {
  // لینک عمیق داشبورد: /admin/support?filter=awaiting
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FilterKey) ?? 'all';
  const [filter, setFilter] = useState<FilterKey>(
    initialFilter === 'unread' || initialFilter === 'awaiting' ? initialFilter : 'all',
  );
  const [search, setSearch] = useState('');
  const [q, setQ] = useState<string | undefined>(undefined); // جستجوی اعمال‌شده (با تأخیر)
  const [page, setPage] = useState(1);
  const [activeUserId, setActiveUserId] = useState<string | null>(null);

  // جستجو با تأخیر ۵۰۰ms — مثل بقیه صفحات ادمین
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim() || undefined);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  // تازه‌سازی خودکار — پاسخ‌های جدید کاربران زود دیده شوند
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-support-threads', filter, q, page],
    queryFn: () => fetchAdminSupportThreads({ filter, search: q, page, perPage: PER_PAGE }),
    placeholderData: (prev) => prev,
    refetchInterval: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-support-stats'],
    queryFn: fetchAdminSupportStats,
    refetchInterval: 30_000,
  });

  const items = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / PER_PAGE));

  return (
    <div className="mx-auto max-w-6xl space-y-4">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Headset size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">چت‌های پشتیبانی</h1>
            <p className="text-[11px] text-muted-foreground">
              {data ? `${toFa(data.total)} گفتگو — پاسخ به پیام‌های کاربران` : 'گفتگوی کاربران با پشتیبانی'}
            </p>
          </div>
        </div>
        {isFetching && !isLoading ? (
          <Loader2 size={15} className="animate-spin text-muted-foreground" />
        ) : (
          <RefreshCw size={15} className="text-muted-foreground/50" />
        )}
      </div>

      {/* آمار */}
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <StatCard label="کاربران دارای گفتگو" value={stats?.threads} />
        <StatCard label="پیام خوانده‌نشده" value={stats?.unreadMessages} tone="amber" />
        <StatCard label="در انتظار پاسخ پشتیبان" value={stats?.awaitingReply} tone="rose" />
        <StatCard label="پیام امروز" value={stats?.messagesToday} />
      </div>

      {/* تب‌ها + جستجو */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => {
                setFilter(t.key);
                setPage(1);
              }}
              className={cn(
                'h-9 rounded-[10px] border px-3.5 text-[12px] font-bold transition-colors',
                filter === t.key
                  ? 'border-primary-line bg-primary-soft text-primary'
                  : 'border-input bg-card text-secondary-foreground hover:bg-secondary/60',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="relative ms-auto w-full sm:w-64">
          <Search size={15} className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="نام / موبایل / نام کاربری…"
            className="h-9 rounded-[10px] pe-9 text-[12.5px]"
          />
        </div>
      </div>

      {/* لیست + نمای گفتگو */}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        {/* لیست گفتگوها */}
        <div className={cn('rounded-lg border bg-card', activeUserId ? 'hidden lg:block' : 'block')}>
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-[74px] rounded-md" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="grid place-items-center gap-2 p-12 text-center text-muted-foreground">
              <Headset size={28} className="opacity-40" />
              <p className="text-sm">گفتگویی یافت نشد.</p>
              <p className="max-w-[240px] text-[11px] leading-5">
                پیام‌های «گفتگو با پشتیبان» صفحهٔ پشتیبانی کاربران این‌جا می‌آید.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {items.map((t) => (
                <SupportThreadRow key={t.userId} t={t} active={activeUserId === t.userId} onOpen={() => setActiveUserId(t.userId)} />
              ))}
            </ul>
          )}

          {/* صفحه‌بندی */}
          {pageCount > 1 && (
            <div className="flex items-center justify-center gap-3 border-t p-2.5">
              <Button variant="outline" size="sm" className="h-8" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                قبلی
              </Button>
              <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
                صفحه {toFa(page)} از {toFa(pageCount)}
              </span>
              <Button variant="outline" size="sm" className="h-8" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
                بعدی
              </Button>
            </div>
          )}
        </div>

        {/* نمای گفتگو */}
        <div className={cn('min-h-[420px] rounded-lg border bg-card', activeUserId ? 'block' : 'hidden lg:block')}>
          {activeUserId ? (
            <SupportThreadPane userId={activeUserId} onBack={() => setActiveUserId(null)} />
          ) : (
            <div className="grid h-full place-items-center p-10 text-center">
              <div className="space-y-2 text-muted-foreground">
                <Headset size={28} className="mx-auto opacity-40" />
                <p className="text-sm font-bold">گفتگویی انتخاب نشده</p>
                <p className="max-w-xs text-[11px] leading-5">
                  روی هر گفتگو کلیک کنید تا پیام‌های کاربر را ببینید و پاسخ بدهید. باز کردن گفتگو،
                  پیام‌ها را «خوانده‌شده» علامت می‌زند.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** ردیف گفتگو در لیست — کاربر + آخرین پیام + بج‌ها */
function SupportThreadRow({ t, active, onOpen }: { t: AdminSupportThreadRow; active: boolean; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className={cn(
          'flex w-full flex-col gap-1 px-3.5 py-3 text-start transition-colors',
          active ? 'bg-primary/5' : 'hover:bg-secondary/50',
        )}
      >
        {/* کاربر + زمان */}
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 truncate text-[12.5px] font-bold">
            <User size={13} className="shrink-0 text-muted-foreground/70" />
            <span className="truncate">{t.user.displayName}</span>
            {t.user.isVerified && <BadgeCheck size={12} className="shrink-0 text-verified" />}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            <RelativeTime date={t.lastMessage?.at ?? t.lastMessageAt ?? ''} />
          </span>
        </span>
        {/* آخرین پیام */}
        <span className="flex items-center justify-between gap-2">
          <span className="min-w-0 truncate text-[11px] leading-5 text-secondary-foreground">
            {t.lastMessage
              ? `${t.lastMessage.senderRole === 'user' ? 'کاربر' : 'پشتیبان'}: ${t.lastMessage.text}`
              : 'بدون پیام'}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {t.awaitingReply && (
              <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[9px] font-bold text-rose-600">
                نیازمند پاسخ
              </span>
            )}
            {t.unreadCount > 0 && (
              <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                {toFa(t.unreadCount)}
              </span>
            )}
          </span>
        </span>
      </button>
    </li>
  );
}

/** کارت آمار کوچک */
function StatCard({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value?: number;
  tone?: 'default' | 'amber' | 'rose';
}) {
  return (
    <div className="rounded-lg border bg-card px-3.5 py-2.5">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          'mt-0.5 text-lg font-extrabold tabular-nums',
          tone === 'amber' && 'text-amber-600',
          tone === 'rose' && 'text-rose-600',
        )}
      >
        {value == null ? '—' : toFa(value)}
      </p>
    </div>
  );
}

/** نمای یک گفتگو + جعبهٔ پاسخ */
function SupportThreadPane({ userId, onBack }: { userId: string; onBack: () => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  const [reply, setReply] = useState('');
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['admin-support-messages', userId],
    queryFn: () => fetchAdminSupportMessages(userId),
    refetchInterval: 30_000,
  });

  // پاسخ پشتیبان — بعد از موفقیت گفتگو و لیست تازه می‌شوند
  const sendMutation = useMutation({
    mutationFn: () => sendAdminSupportMessage(userId, reply.trim()),
    onSuccess: () => {
      setReply('');
      void queryClient.invalidateQueries({ queryKey: ['admin-support-messages', userId] });
      void queryClient.invalidateQueries({ queryKey: ['admin-support-threads'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-support-stats'] });
      void queryClient.invalidateQueries({ queryKey: ['admin-queues'] });
    },
  });

  // اسکرول به آخرین پیام
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [data?.messages?.length, userId]);

  if (isLoading || !data) {
    return (
      <div className="grid h-full place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const send = () => {
    if (reply.trim().length < 1 || sendMutation.isPending) return;
    sendMutation.mutate();
  };

  return (
    <div className="flex h-full flex-col">
      {/* بازگشت موبایل */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 border-b px-3.5 py-2 text-[11px] font-bold text-primary lg:hidden"
      >
        <ArrowRight size={14} />
        بازگشت به لیست گفتگوها
      </button>

      {/* هدر: کاربر + شماره تماس */}
      <div className="flex items-center justify-between gap-2 border-b p-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-secondary text-secondary-foreground">
            <User size={16} />
          </span>
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 truncate text-[12.5px] font-bold">
              {data.user.displayName}
              {data.user.isVerified && <BadgeCheck size={12} className="text-verified" />}
              {!data.user.isActive && (
                <span className="rounded-full bg-rose-500/10 px-1.5 text-[9px] text-rose-600">غیرفعال</span>
              )}
            </p>
            <a
              href={`tel:${data.user.phone}`}
              dir="ltr"
              className="font-mono text-[11px] text-primary hover:underline"
            >
              {data.user.phone}
            </a>
          </div>
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          {toFa(data.messages.length)} پیام
        </span>
      </div>

      {/* پیام‌ها */}
      <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto p-3.5 lg:max-h-[460px]">
        {data.messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">این گفتگو پیامی ندارد.</p>
        ) : (
          data.messages.map((m) => <SupportBubble key={m.id} m={m} />)
        )}
      </div>

      {/* جعبهٔ پاسخ */}
      <div className="border-t bg-secondary/30 p-3">
        <Textarea
          dir="rtl"
          rows={2}
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              send();
            }
          }}
          placeholder="پاسخ شما به کاربر… (Ctrl+Enter برای ارسال)"
          className="resize-none bg-card text-[12.5px] leading-6"
          maxLength={2000}
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <p className="text-[10px] leading-4 text-muted-foreground">
            پاسخ در صفحهٔ «پشتیبانی» کاربر ظاهر می‌شود.
          </p>
          <Button size="sm" className="h-8 gap-1.5 rounded-md" disabled={reply.trim().length < 1 || sendMutation.isPending} onClick={send}>
            {sendMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
            ارسال پاسخ
          </Button>
        </div>
      </div>
    </div>
  );
}

/** حباب پیام — کاربر یک‌سو / پشتیبان سو دیگر + وضعیت خوانده‌شدن */
function SupportBubble({
  m,
}: {
  m: {
    id: string;
    senderRole: 'user' | 'admin';
    adminUsername: string | null;
    text: string;
    readAt: string | null;
    createdAt: string;
  };
}) {
  const isUser = m.senderRole === 'user';
  return (
    <div className={cn('flex', isUser ? 'justify-start' : 'justify-end')}>
      <div className={cn('flex max-w-[82%] flex-col gap-1', isUser ? 'items-start' : 'items-end')}>
        <p className="flex items-center gap-1.5 px-1 text-[9.5px] text-muted-foreground">
          <span
            className={cn(
              'rounded-full px-1.5 py-px font-bold',
              isUser ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary',
            )}
          >
            {isUser ? 'کاربر' : 'پشتیبان'}
          </span>
          {!isUser && m.adminUsername && <span className="font-bold">{m.adminUsername}</span>}
          <span>·</span>
          <span dir="ltr" className="font-mono">
            {new Date(m.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {!isUser &&
            (m.readAt ? (
              <span className="text-emerald-600" title="خوانده شده توسط کاربر">
                ✓✓
              </span>
            ) : (
              <span title="هنوز توسط کاربر خوانده نشده">✓</span>
            ))}
        </p>
        <p
          dir="auto"
          className={cn(
            'w-fit whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-xs leading-6',
            isUser
              ? 'rounded-tl-sm bg-secondary text-secondary-foreground'
              : 'rounded-tr-sm bg-primary text-primary-foreground',
          )}
        >
          {m.text}
        </p>
      </div>
    </div>
  );
}
