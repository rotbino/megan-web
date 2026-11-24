'use client';

/**
 * پیام به کاربران (پنل ادمین — خواستهٔ مالک ۸-۱۱ دور ۲۴).
 *
 * ارسال پیام مستقیم ادمین → کاربران در مکالمهٔ سنجاق‌شدهٔ «پشتیبانی ایمچ»:
 *  • کاربر خاص — جستجو با موبایل/نام/یوزرنیم و انتخاب از نتایج
 *  • همه کاربران — با مخاطب اختیاری (همه/فعال/فروشنده/خریدار/احرازشده)
 * گیرندهٔ آنلاین همان لحظه با WS (بج + پیام)، آفلاین با وب‌پوش خبر می‌گیرد.
 * «آخرین ارسال‌ها»: دسته‌های ارسال (batchId) با گیرندگان و پیشرفت خواندن.
 */

import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Check, Loader2, Megaphone, Search, Send, UserRound, X } from 'lucide-react';
import {
  adminSendAllUsersMessage,
  adminSendUserMessage,
  fetchAdminRecentSends,
  fetchAdminUsers,
  type AdminBroadcastAudience,
  type AdminSendBatch,
  type AdminUserRow,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RelativeTime } from '@/components/shared/relative-time';
import { useToast } from '@/hooks/use-toast';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

const AUDIENCES: Array<{ value: AdminBroadcastAudience; label: string }> = [
  { value: 'all', label: 'همه کاربران' },
  { value: 'active', label: 'فقط کاربران فعال' },
  { value: 'sellers', label: 'فروشندگان' },
  { value: 'buyers', label: 'خریداران' },
  { value: 'verified', label: 'کاربران احرازشده' },
];

type Mode = 'all' | 'single';

export default function AdminUserMessagesPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>('all');
  const [audience, setAudience] = useState<AdminBroadcastAudience>('all');
  const [text, setText] = useState('');

  // جستجوی کاربر خاص — debounce ۵۰۰ms
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState<AdminUserRow | null>(null);
  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 500);
    return () => clearTimeout(t);
  }, [search]);

  const { data: found, isFetching: searching } = useQuery({
    queryKey: ['admin-user-messages-search', q],
    queryFn: () => fetchAdminUsers({ search: q || undefined, page: 1, perPage: 5 }),
    enabled: mode === 'single' && !picked,
    placeholderData: keepPreviousData,
  });

  // آخرین دسته‌های ارسال
  const { data: sends, isLoading: sendsLoading } = useQuery({
    queryKey: ['admin-recent-sends'],
    queryFn: fetchAdminRecentSends,
    refetchInterval: 60_000,
  });

  const send = useMutation({
    mutationFn: async () => {
      const t = text.trim();
      if (mode === 'single') {
        if (!picked) throw new Error('ابتدا کاربر را از نتایج جستجو انتخاب کنید.');
        return adminSendUserMessage(picked.id, t);
      }
      return adminSendAllUsersMessage(t, audience);
    },
    onSuccess: (r) => {
      const n = r.sent;
      toast({
        description:
          mode === 'all'
            ? `پیام برای ${toFa(n)} کاربر (مخاطب: ${AUDIENCES.find((a) => a.value === audience)?.label}) ارسال شد.`
            : `پیام برای ${toFa(n)} کاربر ارسال شد.`,
      });
      setText('');
      void queryClient.invalidateQueries({ queryKey: ['admin-recent-sends'] });
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  const valid =
    text.trim().length >= 3 && !send.isPending && (mode === 'all' || picked !== null);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-extrabold">
            <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
              <Megaphone size={17} />
            </span>
            پیام به کاربران
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            ارسال پیام مستقیم به کاربران — در مکالمهٔ «پشتیبانی ایمچ» پنل کاربر می‌نشیند
            و بج پیام‌هایش همان لحظه (WS) یا با وب‌پوش خبر می‌دهد.
          </p>
        </div>
      </div>

      {/* ── فرم ارسال ── */}
      <div className="rounded-lg border bg-card p-4 shadow sm:p-5">
        {/* حالت گیرنده */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13px] font-bold text-muted-foreground">گیرنده:</span>
          <div className="flex overflow-hidden rounded-md border">
            <button
              type="button"
              onClick={() => setMode('all')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold transition-colors',
                mode === 'all'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-secondary/60',
              )}
            >
              همه کاربران
            </button>
            <button
              type="button"
              onClick={() => setMode('single')}
              className={cn(
                'px-3 py-1.5 text-xs font-bold transition-colors',
                mode === 'single'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card text-muted-foreground hover:bg-secondary/60',
              )}
            >
              کاربر خاص
            </button>
          </div>
        </div>

        {mode === 'all' ? (
          <div className="mt-3 max-w-xs">
            <Select value={audience} onValueChange={(v) => setAudience(v as AdminBroadcastAudience)}>
              <SelectTrigger className="h-9 rounded-md text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="mt-3 max-w-md">
            {picked ? (
              <div className="flex items-center gap-2.5 rounded-md border bg-secondary/40 px-3 py-2.5">
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  <UserRound size={16} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-bold">
                    {[picked.first_name, picked.last_name].filter(Boolean).join(' ') || 'بی‌نام'}
                  </span>
                  <span dir="ltr" className="block text-start text-[11px] text-muted-foreground">
                    {picked.phone}
                  </span>
                </span>
                <button
                  type="button"
                  aria-label="تغییر گیرنده"
                  onClick={() => setPicked(null)}
                  className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-foreground/5"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div>
                <div className="relative">
                  <Search
                    size={15}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="جستجوی کاربر — موبایل، نام یا یوزرنیم…"
                    className="rounded-md pe-9 text-sm"
                  />
                </div>
                {q.length >= 2 && (
                  <div className="mt-2 overflow-hidden rounded-md border bg-popover shadow-sm">
                    {searching ? (
                      <p className="px-3 py-2.5 text-xs text-muted-foreground">در حال جستجو…</p>
                    ) : (found?.items?.length ?? 0) === 0 ? (
                      <p className="px-3 py-2.5 text-xs text-muted-foreground">
                        کاربری با این مشخصات یافت نشد.
                      </p>
                    ) : (
                      <ul className="max-h-56 overflow-y-auto p-1">
                        {found?.items.map((u) => (
                          <li key={u.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setPicked(u);
                                setSearch('');
                              }}
                              className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-start transition-colors hover:bg-accent"
                            >
                              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold">
                                {(u.first_name || u.user_name || '؟').charAt(0)}
                              </span>
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-[13px] font-bold">
                                  {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.user_name}
                                </span>
                                <span dir="ltr" className="block text-start text-[10px] text-muted-foreground">
                                  {u.phone}
                                </span>
                              </span>
                              {u.online && (
                                <span className="size-2 shrink-0 rounded-full bg-emerald-500" aria-label="آنلاین" />
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* متن پیام */}
        <div className="mt-4 space-y-1.5">
          <Label htmlFor="user-msg-text">
            متن پیام <span className="text-red-500">*</span>
          </Label>
          <Textarea
            id="user-msg-text"
            dir="rtl"
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="resize-none text-sm leading-7"
            maxLength={2000}
            placeholder="مثلا: سلام، امکان جدید «پیام به کاربران» به ایمچ اضافه شد؛ تجربهٔ خرید را از دست ندهید."
          />
          <p className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>حداقل ۳ نویسه — کاربر پیام را در مکالمهٔ «پشتیبانی ایمچ» می‌بیند.</span>
            <span className="shrink-0">{toFa(text.length)}/۲۰۰۰</span>
          </p>
        </div>

        <Button className="mt-3 rounded-md" disabled={!valid} onClick={() => send.mutate()}>
          {send.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
          {mode === 'all' ? 'ارسال به همه' : 'ارسال پیام'}
        </Button>
      </div>

      {/* ── آخرین ارسال‌ها ── */}
      <div className="rounded-lg border bg-card p-4 shadow sm:p-5">
        <div className="flex items-center justify-between">
          <p className="text-sm font-bold">آخرین ارسال‌ها</p>
          <p className="text-[11px] text-muted-foreground">حداکثر ۳۰ دستهٔ اخیر</p>
        </div>

        {sendsLoading ? (
          <div className="mt-3 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-md" />
            ))}
          </div>
        ) : (sends?.items?.length ?? 0) === 0 ? (
          <p className="mt-3 rounded-md bg-secondary/50 px-3 py-6 text-center text-xs leading-6 text-muted-foreground">
            هنوز پیامی به کاربران ارسال نشده است.
          </p>
        ) : (
          <ul className="mt-3 space-y-2.5">
            {sends?.items.map((b) => (
              <SendBatchRow key={b.batchId} b={b} />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** یک دستهٔ ارسال — متن، گیرندگان و پیشرفت خواندن */
function SendBatchRow({ b }: { b: AdminSendBatch }) {
  const rest = b.total - b.recipients.length;
  return (
    <li className="rounded-md border bg-secondary/30 p-3">
      <div className="flex items-start justify-between gap-3">
        <p dir="auto" className="min-w-0 flex-1 whitespace-pre-wrap break-words text-[13px] leading-6">
          {b.text}
        </p>
        <span className="shrink-0 text-[10px] text-muted-foreground">
          <RelativeTime date={b.at} />
        </span>
      </div>

      {/* گیرندگان — حداکثر ۶ نفر + «+N دیگر» */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {b.total === 1 && b.recipients[0] ? (
          <RecipientChip
            name={b.recipients[0].displayName}
            phone={b.recipients[0].phone}
            single
          />
        ) : (
          <>
            {b.recipients.map((r) => (
              <RecipientChip key={r.id} name={r.displayName} phone={r.phone} />
            ))}
            {rest > 0 && (
              <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
                +{toFa(rest)} کاربر دیگر
              </span>
            )}
          </>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="rounded-full bg-primary/10 px-1.5 py-px font-bold text-primary">
            {b.adminUsername}
          </span>
          ارسال به {toFa(b.total)} کاربر
        </span>
        <span className="flex items-center gap-1">
          <Check size={11} className="text-emerald-600" />
          {toFa(b.read)} از {toFa(b.total)} خوانده‌اند
        </span>
      </div>
    </li>
  );
}

/** چیپ گیرنده — نام + موبایل */
function RecipientChip({ name, phone, single }: { name: string; phone: string; single?: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full items-center gap-1.5 rounded-full border bg-card px-2.5 py-1',
        single ? 'text-xs font-bold' : 'text-[11px]',
      )}
    >
      <span className="truncate">{name}</span>
      <span dir="ltr" className="shrink-0 text-[10px] font-normal text-muted-foreground">
        {phone}
      </span>
    </span>
  );
}
