'use client';

/**
 * صف احراز هویت (فاز A5) — درخواست‌های کارت ملی + سلفی.
 *  • تب‌های وضعیت + مدارک هر سفارش (پیش‌نمایش تصویر)
 *  • تأیید / رد با دلیل (delegation به VerificationService از بک‌اند)
 */

import { useState } from 'react';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Image from 'next/image';
import Link from 'next/link';
import { BadgeCheck, Check, Loader2, X } from 'lucide-react';
import {
  fetchAdminVerificationOrders,
  reviewAdminVerification,
  type AdminVerificationOrderRow,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { toFa, timeAgoFa } from '@/lib/format';
import { cn } from '@/lib/utils';

type StatusKey = 'pending' | 'approved' | 'rejected';

const STATUS_TABS: Array<{ key: StatusKey; label: string }> = [
  { key: 'pending', label: 'در بررسی' },
  { key: 'approved', label: 'تأییدشده' },
  { key: 'rejected', label: 'ردشده' },
];

function StatusChip({ status }: { status: StatusKey }) {
  if (status === 'pending') {
    return <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600">در بررسی</span>;
  }
  if (status === 'approved') {
    return <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-600">تأییدشده</span>;
  }
  return <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-[10px] font-bold text-rose-600">ردشده</span>;
}

export default function AdminVerificationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<StatusKey>('pending');
  const [page, setPage] = useState(1);
  const [reviewTarget, setReviewTarget] = useState<AdminVerificationOrderRow | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['admin-verifications', status, page],
    queryFn: () => fetchAdminVerificationOrders(status, page, 20),
    placeholderData: keepPreviousData,
    refetchInterval: 60_000,
  });

  const review = useMutation({
    mutationFn: (input: { orderId: string; approve: boolean; reason?: string }) =>
      reviewAdminVerification(input.orderId, input.approve, input.reason),
    onSuccess: (_d, input) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-verifications'] });
      toast({ description: input.approve ? 'هویت کاربر تأیید شد.' : 'درخواست احراز رد شد.' });
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  const items = data?.items ?? [];
  const pageCount = Math.max(1, Math.ceil((data?.total ?? 0) / 20));

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-verified/10 text-verified">
            <BadgeCheck size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">احراز هویت کاربران</h1>
            <p className="text-[11px] text-muted-foreground">
              {data ? `${toFa(data.total)} سفارش — کارت ملی + سلفی` : 'صف بازبینی مدارک'}
            </p>
          </div>
        </div>
        {isFetching && !isLoading ? <Loader2 size={15} className="animate-spin text-muted-foreground" /> : null}
      </div>

      {/* تب‌ها */}
      <div className="flex flex-wrap gap-1.5">
        {STATUS_TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setStatus(t.key); setPage(1); }}
            className={cn(
              'h-9 rounded-[10px] border px-3.5 text-[12px] font-bold transition-colors',
              status === t.key
                ? 'border-primary-line bg-primary-soft text-primary'
                : 'border-input bg-card text-secondary-foreground hover:bg-secondary/60',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* لیست */}
      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="grid place-items-center gap-2 rounded-lg border bg-card p-12 text-center text-muted-foreground">
          <BadgeCheck size={28} className="opacity-40" />
          <p className="text-sm">سفارشی در این وضعیت نیست.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((o) => (
            <div key={o.id} className="rounded-lg border bg-card p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-md bg-verified/10 text-verified">
                    <BadgeCheck size={18} />
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-bold">
                      <StatusChip status={o.status} />
                      {o.user ? (
                        <span dir="ltr">{o.user.phone}</span>
                      ) : (
                        <span className="text-muted-foreground">کاربر حذف‌شده/ناموجود</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {o.user && (o.user.firstName || o.user.lastName)
                        ? `${o.user.firstName ?? ''} ${o.user.lastName ?? ''}`.trim()
                        : o.user?.userName ?? ''}{' '}
                      · {timeAgoFa(o.createdAt)}
                    </p>
                    {o.status === 'rejected' && o.rejectionReason && (
                      <p className="mt-1 rounded-md bg-rose-500/10 px-2 py-1 text-[11px] text-rose-700">
                        دلیل رد: {o.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {o.status === 'pending' && (
                    <Button size="sm" className="h-9 rounded-lg" onClick={() => setReviewTarget(o)}>
                      بازبینی مدارک
                    </Button>
                  )}
                  {o.user?.id && (
                    <Link href={`/admin/users/${o.user.id}`} className="text-[11px] font-bold text-primary hover:underline">
                      پروفایل ←
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* صفحه‌بندی */}
      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
            قبلی
          </Button>
          <span className="text-[12px] font-bold tabular-nums text-muted-foreground">
            صفحه {toFa(page)} از {toFa(pageCount)}
          </span>
          <Button variant="outline" size="sm" disabled={page >= pageCount} onClick={() => setPage((p) => p + 1)}>
            بعدی
          </Button>
        </div>
      )}

      <ReviewDocsDialog
        target={reviewTarget}
        pending={review.isPending}
        onClose={() => setReviewTarget(null)}
        onReview={(approve, reason) => {
          if (reviewTarget) review.mutate({ orderId: reviewTarget.id, approve, reason });
        }}
      />
    </div>
  );
}

/** دیالوگ بازبینی مدارک — پیش‌نمایش کارت ملی + سلفی + تأیید/رد */
function ReviewDocsDialog({
  target,
  pending,
  onClose,
  onReview,
}: {
  target: AdminVerificationOrderRow | null;
  pending: boolean;
  onClose: () => void;
  onReview: (approve: boolean, reason?: string) => void;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');

  const close = () => {
    setRejecting(false);
    setReason('');
    onClose();
  };

  const docs = target?.docs ?? {};

  return (
    <Dialog open={!!target} onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>بازبینی مدارک احراز</DialogTitle>
          <DialogDescription>
            {target?.user ? <span dir="ltr">{target.user.phone}</span> : null} — کارت ملی و سلفی
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2.5">
          {[
            { key: 'nationalCard', label: 'کارت ملی' },
            { key: 'selfie', label: 'سلفی با کارت' },
          ].map(({ key, label }) => {
            const doc = docs[key];
            return (
              <a
                key={key}
                href={doc?.url}
                target="_blank"
                rel="noreferrer"
                className="block overflow-hidden rounded-lg border bg-secondary/30"
              >
                <div className="relative aspect-[16/11] w-full">
                  {doc ? (
                    <Image
                      src={doc.url}
                      alt={label}
                      fill
                      sizes="(min-width: 640px) 224px, 45vw"
                      className="object-cover"
                      unoptimized
                    />
                  ) : (
                    <span className="grid h-full place-items-center text-[11px] text-muted-foreground">
                      مدارک ارسال نشده
                    </span>
                  )}
                </div>
                <p className="border-t bg-card px-2 py-1.5 text-center text-[11px] font-bold">{label}</p>
              </a>
            );
          })}
        </div>

        {rejecting ? (
          <div className="space-y-2">
            <Label className="text-[12px]">دلیل رد (الزامی — به کاربر نمایش داده می‌شود)</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="مثلاً: تصویر کارت ملی ناخواناست — دوباره ارسال کنید."
              className="min-h-20 rounded-md text-[12.5px]"
              maxLength={300}
            />
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          {rejecting ? (
            <>
              <Button variant="outline" size="sm" className="h-9 rounded-lg" onClick={() => setRejecting(false)}>
                بازگشت
              </Button>
              <Button
                variant="destructive"
                size="sm"
                className="h-9 rounded-lg"
                disabled={pending || reason.trim().length < 3}
                onClick={() => onReview(false, reason.trim())}
              >
                {pending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
                ثبت رد
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9 rounded-lg"
                disabled={pending}
                onClick={() => setRejecting(true)}
              >
                <X size={14} />
                رد مدارک
              </Button>
              <Button size="sm" className="h-9 rounded-lg" disabled={pending} onClick={() => onReview(true)}>
                {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                تأیید هویت
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
