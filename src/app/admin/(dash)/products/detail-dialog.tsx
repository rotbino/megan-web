'use client';

/**
 * دیالوگ جزئیات آگهی ادمین (فاز A4) — رکورد کامل + گالری + ویژگی‌ها +
 * سفارش‌های نردبان (فقط خواندنی) + عملیات مدیریتی: تأیید/رد مجدد،
 * تغییر وضعیت، روشن/خاموش نردبان (هدیه ۳۰ روزه)، حذف با پاک‌سازی فایل‌ها.
 */

import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, Eye, Loader2, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { fetchAdminProductDetail, setAdminLadder, setAdminProductStatus, deleteAdminProduct, type AdminProductDetail } from '@/lib/admin/api';
import { useToast } from '@/hooks/use-toast';
import { priceFa, stockFa, toFa, timeAgoFa } from '@/lib/format';
import { ReviewProductDialog, type ReviewableProduct } from './review-dialog';
import { cn } from '@/lib/utils';
import { useState } from 'react';

/** چیپ وضعیت — رنگ ملایم تم تامینان */
export function StatusChip({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'در انتظار تایید', cls: 'bg-amber-500/10 text-amber-600' },
    confirmed: { label: 'تایید شده', cls: 'bg-emerald-500/10 text-emerald-600' },
    rejected: { label: 'رد شده', cls: 'bg-destructive/10 text-destructive' },
    deleted: { label: 'حذف شده', cls: 'bg-secondary text-muted-foreground' },
  };
  const s = map[status] ?? { label: status, cls: 'bg-secondary text-muted-foreground' };
  return <span className={cn('rounded-full px-2 py-0.5 text-[9.5px] font-bold', s.cls)}>{s.label}</span>;
}

/** سطر مشخصه کلید-مقدار */
function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 border-b border-border/60 py-1.5 text-[12px] last:border-0">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 text-end font-bold">{value}</span>
    </div>
  );
}

export function ProductDetailDialog({
  productId,
  onClose,
  onChanged,
}: {
  productId: number | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { toast } = useToast();
  const [reviewing, setReviewing] = useState<ReviewableProduct | null>(null);
  const [busy, setBusy] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-product-detail', productId],
    queryFn: () => fetchAdminProductDetail(productId as number),
    enabled: productId != null,
  });

  if (productId == null) return null;

  const act = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      await refetch();
      onChanged();
      toast({ description: okMsg });
    } catch (err) {
      toast({
        description: err instanceof Error ? err.message : 'عملیات ناموفق بود.',
        variant: 'destructive',
      });
    } finally {
      setBusy(false);
    }
  };

  const p: AdminProductDetail | null = data ?? null;

  return (
    <>
      <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-xl">
          <DialogHeader className="text-right">
            <DialogTitle className="flex flex-wrap items-center gap-2 pe-7">
              <span className="min-w-0 truncate">{p?.product_name ?? '…'}</span>
              {p ? <StatusChip status={p.status} /> : null}
              {p?.is_ladder ? (
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9.5px] font-bold text-primary">نردبان</span>
              ) : null}
            </DialogTitle>
            <DialogDescription dir="rtl">
              شناسه {p ? toFa(p.id) : '—'} · {p ? `${p.sub_category_name} / ${p.province_name} — ${p.city_name}` : ''}
            </DialogDescription>
          </DialogHeader>

          {isLoading || !p ? (
            <div className="grid place-items-center py-12">
              <Loader2 className="size-7 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* گالری */}
              {p.photos.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {p.photos.map((src) => (
                     
                    <img
                      key={src}
                      src={src}
                      alt={p.product_name}
                      className="size-24 shrink-0 rounded-md border object-cover"
                      loading="lazy"
                    />
                  ))}
                </div>
              )}

              {/* مشخصات */}
              <div className="grid gap-x-6 sm:grid-cols-2">
                <div>
                  <Field label="فروشنده" value={
                    p.seller ? (
                      <Link
                        href={`/admin/users/${p.seller.id}`}
                        className="inline-flex items-center gap-1 text-primary hover:underline"
                      >
                        {[p.seller.first_name, p.seller.last_name].filter(Boolean).join(' ').trim() || p.seller.user_name} <ArrowUpRight size={12} />
                      </Link>
                    ) : '—'
                  } />
                  <Field label="نام کاربری" value={p.seller?.user_name || '—'} />
                  <Field label="موبایل فروشنده" value={<span dir="ltr" className="font-num">{p.seller?.phone || '—'}</span>} />
                  <Field label="موجودی" value={stockFa(p.stock, p.unit)} />
                  <Field label="حداقل سفارش" value={stockFa(p.min_sale_amount, p.unit)} />
                  <Field label="کف قیمت" value={p.min_sale_price > 0 ? priceFa(p.min_sale_price) : 'تماس بگیرید'} />
                </div>
                <div>
                  <Field label="دسته" value={`${p.category_name} ← ${p.sub_category_name}`} />
                  <Field label="مکان" value={`${p.province_name} — ${p.city_name}`} />
                  <Field label="بازدید" value={<span className="inline-flex items-center gap-1"><Eye size={12} /> {toFa(p.view_count)}</span>} />
                  <Field label="به‌روزرسانی" value={timeAgoFa(p.updated_at)} />
                  <Field label="ثبت" value={timeAgoFa(p.created_at)} />
                </div>
              </div>

              {/* جزئیات نهایی (ویژگی‌ها) */}
              {p.features.length > 0 && (
                <div className="rounded-lg border bg-secondary/30 p-3">
                  <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">جزئیات نهایی</p>
                  <div className="space-y-1">
                    {p.features.map((f) => (
                      <div key={f.key} className="flex items-center justify-between gap-2 text-[12px]">
                        <span className="text-muted-foreground">{f.key}</span>
                        <span className="font-bold">{f.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* توضیحات */}
              {p.description ? (
                <div>
                  <p className="mb-1 text-[11px] font-bold text-muted-foreground">توضیحات فروشنده</p>
                  <p className="whitespace-pre-line rounded-lg border bg-card p-3 text-[12px] leading-6">
                    {p.description}
                  </p>
                </div>
              ) : null}

              {/* دلایل رد */}
              {p.status === 'rejected' && p.rejection_reasons.length > 0 && (
                <div className="rounded-lg border border-destructive/25 bg-destructive/5 p-3">
                  <p className="mb-1 text-[11px] font-bold text-destructive">دلایل رد (نمایش‌داده‌شده به فروشنده)</p>
                  <ul className="space-y-1">
                    {p.rejection_reasons.map((r) => (
                      <li key={r} className="text-[12px] leading-6 text-destructive/90">• {r}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* سفارش‌های نردبان — فقط خواندنی */}
              <div className="rounded-lg border bg-card p-3">
                <p className="mb-1.5 text-[11px] font-bold text-muted-foreground">
                  سفارش‌های نردبان ({toFa(p.ladder_orders.length)}) — فقط خواندنی
                </p>
                {p.ladder_orders.length === 0 ? (
                  <p className="text-[12px] text-muted-foreground">این آگهی نردبان نشده است.</p>
                ) : (
                  <div className="space-y-1.5">
                    {p.ladder_orders.map((o) => (
                      <div key={o.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-secondary/40 px-2.5 py-1.5 text-[11.5px]">
                        <span className="font-bold">{o.amount > 0 ? priceFa(o.amount) : 'هدیه ادمین'}</span>
                        <span className="text-muted-foreground">
                          {timeAgoFa(o.created_at)} · انقضا {timeAgoFa(o.expires_at)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* عملیات */}
              <div className="flex flex-wrap gap-2 border-t pt-3">
                {p.status === 'pending' && (
                  <Button
                    size="sm"
                    className="rounded-[10px]"
                    disabled={busy}
                    onClick={() => setReviewing({ ...p, seller: p.seller ?? { user_name: '—' } })}
                  >
                    بازبینی (تأیید/رد)
                  </Button>
                )}
                {p.status === 'rejected' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-[10px]"
                    disabled={busy}
                    onClick={() => void act(() => setAdminProductStatus(p.id, 'confirmed'), 'آگهی تأیید و منتشر شد.')}
                  >
                    تأیید و انتشار مجدد
                  </Button>
                )}
                {p.status === 'confirmed' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-[10px] border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                    disabled={busy}
                    onClick={() => void act(
                      () => setAdminProductStatus(p.id, 'rejected', ['به‌صورت دستی توسط مدیریت برداشته شد — برای پیگیری با پشتیبانی تماس بگیرید.']),
                      'آگهی از نمایش عمومی برداشته شد.',
                    )}
                  >
                    برداشتن از نمایش عمومی
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-[10px]"
                  disabled={busy}
                  onClick={() => void act(
                    () => setAdminLadder(p.id, !p.is_ladder),
                    p.is_ladder ? 'نردبان آگهی برچیده شد.' : 'نردبان (جهش تبلیغاتی) ۳۰ روزه فعال شد.',
                  )}
                >
                  {p.is_ladder ? <TrendingDown size={14} /> : <TrendingUp size={14} />}
                  {p.is_ladder ? 'برچیدن نردبان' : 'نردبان ۳۰ روزه (هدیه)'}
                </Button>
                {p.status !== 'deleted' && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-[10px] border-destructive/40 text-destructive hover:bg-destructive/5 hover:text-destructive"
                    disabled={busy}
                    onClick={() => void act(() => deleteAdminProduct(p.id), 'آگهی حذف و فایل‌هایش پاک شد.')}
                  >
                    <Trash2 size={14} /> حذف کامل
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* بازبینی داخل جزئیات — آبجکت کامل ردیف */}
      {reviewing ? (
        <ReviewProductDialog
          product={reviewing}
          onClose={() => setReviewing(null)}
          onDone={() => { void refetch(); onChanged(); }}
        />
      ) : null}
    </>
  );
}
