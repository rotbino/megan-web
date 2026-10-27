'use client';

/**
 * چت‌های کاربران (فاز A6) — نمای ادمین، فقط-خواندنی.
 *
 * جریان روزانه ادمین (مدل MVP): کاربران را خودمان برای SEO ریخته‌ایم و
 * خودشان خبر ندارند؛ خریدار پیام می‌دهد → این صفحه تازه‌ترین مکالمات را
 * بالای لیست با badge خوانده‌نشده نشان می‌دهد → ادمین مکالمه را باز
 * می‌کند و شماره فروشنده را می‌بیند → به او زنگ می‌زند که بیاید جواب بدهد.
 *
 * قید طلایی محصول: باز کردن مکالمه توسط ادمین هرگز آن را خوانده‌شده
 * نمی‌کند — badge فقط با خواندن واقعی توسط خود کاربر صفر می‌شود.
 */

import { Suspense, useEffect, useRef, useState } from 'react';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight,
  BadgeCheck,
  Eye,
  EyeOff,
  Loader2,
  MessagesSquare,
  Phone,
  RefreshCw,
  Search,
  Store,
  User,
} from 'lucide-react';
import {
  fetchAdminChatMessages,
  fetchAdminChats,
  fetchAdminChatStats,
  type AdminUserCard,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { RelativeTime } from '@/components/shared/relative-time';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

type FilterKey = 'all' | 'unread' | 'awaiting';

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'همه' },
  { key: 'unread', label: 'خوانده‌نشده' },
  { key: 'awaiting', label: 'در انتظار پاسخ فروشنده' },
];

const PER_PAGE = 20;

export default function AdminChatsPage() {
  return (
    <Suspense>
      <AdminChatsInner />
    </Suspense>
  );
}

function AdminChatsInner() {
  // لینک عمیق داشبورد: /admin/chats?filter=awaiting
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FilterKey) ?? 'all';
  const [filter, setFilter] = useState<FilterKey>(
    initialFilter === 'unread' || initialFilter === 'awaiting' ? initialFilter : 'all',
  );
  const [search, setSearch] = useState('');
  const [q, setQ] = useState<string | undefined>(undefined); // جستجوی اعمال‌شده (با تأخیر)
  const [page, setPage] = useState(1);
  const [activeId, setActiveId] = useState<string | null>(null);

  // جستجو با تأخیر ۵۰۰ms — مثل بقیه صفحات ادمین
  useEffect(() => {
    const t = setTimeout(() => {
      setQ(search.trim() || undefined);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, [search]);

  // تازه‌سازی خودکار — ادمین باید تازه‌ترین پیام‌ها را زود ببیند
  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-chats', filter, q, page],
    queryFn: () => fetchAdminChats({ filter, search: q, page, perPage: PER_PAGE }),
    placeholderData: keepPreviousData,
    refetchInterval: 30_000,
  });

  const { data: stats } = useQuery({
    queryKey: ['admin-chat-stats'],
    queryFn: fetchAdminChatStats,
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
            <MessagesSquare size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">چت‌های کاربران</h1>
            <p className="text-[11px] text-muted-foreground">
              {data ? `${toFa(data.total)} مکالمه — تازه‌ترین‌ها بالا` : 'نمای فقط-خواندنی'}
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
        <StatCard label="کل مکالمات" value={stats?.threads} />
        <StatCard label="دارای پیام خوانده‌نشده" value={stats?.withUnread} tone="amber" />
        <StatCard label="در انتظار پاسخ فروشنده" value={stats?.awaitingSellerReply} tone="rose" />
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
          <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="نام / موبایل / محصول…"
            className="h-9 rounded-[10px] pe-9 text-[12.5px]"
          />
        </div>
      </div>

      {/* لیست + نمای مکالمه */}
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        {/* لیست مکالمات */}
        <div className={cn('rounded-lg border bg-card', activeId ? 'hidden lg:block' : 'block')}>
          {isLoading ? (
            <div className="space-y-2 p-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 rounded-md" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="grid place-items-center gap-2 p-12 text-center text-muted-foreground">
              <MessagesSquare size={28} className="opacity-40" />
              <p className="text-sm">مکالمه‌ای یافت نشد.</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/70">
              {items.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(t.id)}
                    className={cn(
                      'flex w-full flex-col gap-1 px-3.5 py-3 text-start transition-colors',
                      activeId === t.id ? 'bg-primary/5' : 'hover:bg-secondary/50',
                    )}
                  >
                    {/* طرف‌ها: خریدار → فروشنده */}
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-[12.5px] font-bold">
                        {t.buyer.displayName}
                        <span className="mx-1 text-muted-foreground">→</span>
                        <span className="text-primary">{t.seller.displayName}</span>
                      </span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        <RelativeTime date={t.lastMessage?.at ?? t.createdAt} />
                      </span>
                    </span>
                    {/* آگهی + آخرین پیام */}
                    <span className="truncate text-[11px] text-muted-foreground"> روی «{t.product.name}»</span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="min-w-0 truncate text-[11px] leading-5 text-secondary-foreground">
                        {t.lastMessage
                          ? `${t.lastMessage.senderRole === 'buyer' ? 'خریدار' : 'فروشنده'}: ${t.lastMessage.text}`
                          : 'بدون پیام'}
                      </span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {t.awaitingSellerReply && (
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

        {/* نمای مکالمه */}
        <div className={cn('min-h-[420px] rounded-lg border bg-card', activeId ? 'block' : 'hidden lg:block')}>
          {activeId ? (
            <ThreadPane threadId={activeId} onBack={() => setActiveId(null)} />
          ) : (
            <div className="grid h-full place-items-center p-10 text-center">
              <div className="space-y-2 text-muted-foreground">
                <EyeOff size={28} className="mx-auto opacity-40" />
                <p className="text-sm font-bold">مکالمه‌ای انتخاب نشده</p>
                <p className="max-w-xs text-[11px] leading-5">
                  روی هر مکالمه کلیک کنید تا کل پیام‌های خریدار و فروشنده را ببینید. باز کردن توسط شما،
                  پیام‌ها را برای کاربران «خوانده‌شده» نمی‌کند.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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

/** نمای یک مکالمه — فقط خواندنی + شماره طرف‌ها برای زنگ‌زدن */
function ThreadPane({ threadId, onBack }: { threadId: string; onBack: () => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  const { data, isLoading } = useQuery({
    queryKey: ['admin-chat-messages', threadId],
    queryFn: () => fetchAdminChatMessages(threadId),
    refetchInterval: 30_000,
  });

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [data?.messages?.length, threadId]);

  if (isLoading || !data) {
    return (
      <div className="grid h-full place-items-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const { thread, messages } = data;

  return (
    <div className="flex h-full flex-col">
      {/* بازگشت موبایل */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1.5 border-b px-3.5 py-2 text-[11px] font-bold text-primary lg:hidden"
      >
        <ArrowRight size={14} />
        بازگشت به لیست مکالمات
      </button>

      {/* هدر: طرف‌ها + آگهی */}
      <div className="space-y-3 border-b p-3.5">
        <div className="flex items-center justify-between gap-2">
          <p className="min-w-0 truncate text-[12.5px] font-bold">
            مکالمه روی «{thread.product.name}»
          </p>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {toFa(thread.messageCount)} پیام
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <PartyCard role="buyer" user={thread.buyer} />
          <PartyCard role="seller" user={thread.seller} />
        </div>
        {thread.awaitingSellerReply && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-rose-500/10 px-3 py-2.5">
            <p className="text-[11px] font-bold leading-5 text-rose-700">
              آخرین پیام از خریدار است و فروشنده هنوز ندیده — برای پیشبرد معامله به فروشنده زنگ بزنید.
            </p>
            <a
              href={`tel:${thread.seller.phone}`}
              dir="ltr"
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md bg-rose-600 px-3 text-[11px] font-bold text-white transition-colors hover:bg-rose-700"
            >
              <Phone size={13} />
              {thread.seller.phone}
            </a>
          </div>
        )}
      </div>

      {/* پیام‌ها — فقط خواندنی */}
      <div ref={listRef} className="flex-1 space-y-2.5 overflow-y-auto p-3.5 lg:max-h-[520px]">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-xs text-muted-foreground">این مکالمه پیامی ندارد.</p>
        ) : (
          messages.map((m) => (
            <MessageBubble key={m.id} m={m} />
          ))
        )}
      </div>

      {/* یادآوری فقط-خواندنی */}
      <div className="flex items-start gap-2 border-t bg-secondary/30 px-3.5 py-2.5 text-[10.5px] leading-5 text-muted-foreground">
        <Eye size={13} className="mt-0.5 shrink-0" />
        <p>
          نمای ادمین — فقط خواندنی. باز کردن مکالمه توسط شما پیام‌ها را «خوانده‌شده» نمی‌کند؛ badge
          خوانده‌نشده فقط با خواندن واقعی توسط خود کاربر صفر می‌شود. ارسال پیام از طرف کاربران ممکن
          نیست — در صورت نیاز، تلفنی به طرف‌ها اطلاع دهید.
        </p>
      </div>
    </div>
  );
}

/** کارت طرف مکالمه — نقش + نام + شماره (برای زنگ‌زدن) */
function PartyCard({ role, user }: { role: 'buyer' | 'seller'; user: AdminUserCard }) {
  const isBuyer = role === 'buyer';
  return (
    <div className="flex items-center gap-2.5 rounded-md border bg-secondary/20 p-2.5">
      <span
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-md',
          isBuyer ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary',
        )}
      >
        {isBuyer ? <User size={16} /> : <Store size={16} />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground">
          {isBuyer ? 'خریدار' : 'فروشنده'}
          {user.isVerified && <BadgeCheck size={11} className="text-verified" />}
          {!user.isActive && (
            <span className="rounded-full bg-rose-500/10 px-1.5 text-[9px] text-rose-600">غیرفعال</span>
          )}
        </p>
        <p className="truncate text-[12.5px] font-bold">{user.displayName}</p>
        <a
          href={`tel:${user.phone}`}
          dir="ltr"
          className="mt-0.5 inline-block font-mono text-[11px] text-primary hover:underline"
        >
          {user.phone}
        </a>
      </div>
    </div>
  );
}

/** حباب پیام — خریدار یک‌سو / فروشنده سو دیگر + وضعیت خوانده‌شدن */
function MessageBubble({
  m,
}: {
  m: {
    id: string;
    senderRole: 'buyer' | 'seller';
    senderName: string;
    text: string;
    readAt: string | null;
    createdAt: string;
  };
}) {
  const isBuyer = m.senderRole === 'buyer';
  return (
    <div className={cn('flex', isBuyer ? 'justify-start' : 'justify-end')}>
      <div className={cn('flex max-w-[82%] flex-col gap-1', isBuyer ? 'items-start' : 'items-end')}>
        <p className="flex items-center gap-1.5 px-1 text-[9.5px] text-muted-foreground">
          <span
            className={cn(
              'rounded-full px-1.5 py-px font-bold',
              isBuyer ? 'bg-secondary text-secondary-foreground' : 'bg-primary/10 text-primary',
            )}
          >
            {isBuyer ? 'خریدار' : 'فروشنده'}
          </span>
          <span className="font-bold">{m.senderName}</span>
          <span>·</span>
          <span dir="ltr" className="font-mono">
            {new Date(m.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          {m.readAt ? (
            <span className="text-emerald-600" title="خوانده شده توسط گیرنده">
              ✓✓
            </span>
          ) : (
            <span title="هنوز توسط گیرنده خوانده نشده">✓</span>
          )}
        </p>
        <p
          dir="auto"
          className={cn(
            'w-fit whitespace-pre-wrap rounded-lg px-3.5 py-2.5 text-xs leading-6',
            isBuyer
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
