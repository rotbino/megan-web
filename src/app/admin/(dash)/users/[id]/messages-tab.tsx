'use client';

/**
 * تب «پیام‌ها» صفحه جزئیات کاربر — تاریخچه پیام‌های مستقیم ادمین → کاربر
 * (مکالمه «پشتیبانی ایمچ» سمت کاربر) + فرم ارسال پیام جدید.
 * خوانده‌شدن per-user: ✓✓ یعنی کاربر پیام را در پنل خود باز کرده است.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, ChevronLeft, ChevronRight, Clock3, Loader2, Send } from 'lucide-react';
import {
  adminSendUserMessage,
  fetchAdminUserMessages,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { dateFa, timeAgoFa, toFa } from '@/lib/format';

export function UserMessagesTab({ userId, userName }: { userId: string; userName: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [text, setText] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-user-messages', userId, page],
    queryFn: () => fetchAdminUserMessages(userId, page),
  });

  const send = useMutation({
    mutationFn: () => adminSendUserMessage(userId, text.trim()),
    onSuccess: () => {
      setText('');
      queryClient.invalidateQueries({ queryKey: ['admin-user-messages', userId] });
      toast({ description: 'پیام برای کاربر ارسال شد.' });
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  const items = data?.items ?? [];
  const pageCount = data?.pageCount ?? 1;

  return (
    <div className="space-y-3">
      {/* فرم ارسال */}
      <div className="rounded-lg border bg-card p-4">
        <p className="text-sm font-bold">ارسال پیام به {userName}</p>
        <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
          پیام در مکالمه سنجاق‌شده «پشتیبانی ایمچ» در پنل کاربر ظاهر می‌شود؛ اگر آنلاین باشد همان لحظه
          (WebSocket) و اگر آفلاین باشد با اعلان مرورگر مطلع می‌شود.
        </p>
        <div className="mt-3 space-y-2">
          <Textarea
            dir="rtl"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="resize-none text-sm leading-7"
            maxLength={2000}
            placeholder="متن پیام…"
          />
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-muted-foreground">{toFa(text.length)}/۲۰۰۰</span>
            <Button
              size="sm"
              className="rounded-[10px]"
              disabled={text.trim().length < 3 || send.isPending}
              onClick={() => send.mutate()}
            >
              {send.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              ارسال پیام
            </Button>
          </div>
        </div>
      </div>

      {/* تاریخچه */}
      <div className="rounded-lg border bg-card">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-bold">تاریخچه پیام‌ها</p>
          {data && (
            <p className="text-[11px] text-muted-foreground">
              {toFa(data.total)} پیام
              {data.unread > 0 ? ` — ${toFa(data.unread)} خوانده‌نشده` : ' — همه خوانده‌شده'}
            </p>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-md" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-xs leading-6 text-muted-foreground">
            هنوز پیامی برای این کاربر ارسال نشده است.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((m) => (
              <li key={m.id} className="px-4 py-3">
                <p dir="auto" className="text-[13px] leading-7">
                  {m.text}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted-foreground">
                  <span>{timeAgoFa(m.created_at)}</span>
                  <span>· {dateFa(m.created_at)}</span>
                  <span dir="ltr">· @{m.admin_username}</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 font-bold',
                      m.read_at
                        ? 'bg-verified/10 text-verified'
                        : 'bg-amber-500/10 text-amber-600',
                    )}
                    title={m.read_at ? `خوانده‌شده — ${dateFa(m.read_at)}` : 'خوانده‌نشده'}
                  >
                    {m.read_at ? <CheckCheck size={11} /> : <Clock3 size={11} />}
                    {m.read_at ? 'خوانده‌شده' : 'خوانده‌نشده'}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* صفحه‌بندی */}
        {pageCount > 1 && (
          <div className="flex items-center justify-center gap-2 border-t py-3">
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-[10px] px-2.5 text-[11px]"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronRight size={13} /> قبلی
            </Button>
            <span className="text-[11px] text-muted-foreground">
              صفحه {toFa(page)} از {toFa(pageCount)}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 rounded-[10px] px-2.5 text-[11px]"
              disabled={page >= pageCount}
              onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            >
              بعدی <ChevronLeft size={13} />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
