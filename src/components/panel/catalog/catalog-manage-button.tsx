'use client';

/**
 * دکمه + دیالوگ «کاتالوگ محصول» (خواسته مالک ۱۰-۱۱) — در سربرگ صفحهٔ
 * «محصولات من». فروشنده با یک آیدی پیج یکتا، رنگ برند و راه‌های تماس
 * (اینستاگرام/واتساپ اختیاری) کاتالوگ مستقل خودش را می‌سازد و بعداً از
 * همین دیالوگ تنظیماتش را عوض می‌کند. موفقیت: لینک کاتالوگ + کپی +
 * «مشاهده کاتالوگ». تا وقتی بک‌اند اندپوینت ندارد، دکمه مخفی می‌ماند
 * (getMyCatalog → null در خطا) تا پنل تمیز بماند.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  Instagram,
  Loader2,
  MessageCircle,
  Palette,
  Sparkles,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import {
  CATALOG_COLORS,
  CATALOG_DEFAULT_COLOR,
  CATALOG_PAGEID_HINT,
  isValidPageId,
  normalizeInstagramId,
  normalizeWhatsappNumber,
} from '@/lib/catalog';
import { useCreateCatalog, useMyCatalog, useUpdateCatalog, useCatalogPageIdAvailable } from '@/lib/mock/hooks';
import type { MyCatalogState } from '@/lib/mock/api';
import { SITE_URL } from '@/lib/site';
import { cn } from '@/lib/utils';

/** برچسب وضعیت آیدی پیج */
type IdStatus =
  | { kind: 'idle' }
  | { kind: 'invalid' }
  | { kind: 'checking' }
  | { kind: 'free' }
  | { kind: 'taken' };

export function CatalogManageButton({ className }: { className?: string }) {
  const { toast } = useToast();
  const { data: state, isLoading, refetch } = useMyCatalog();
  const myCatalog = state?.catalog ?? null;
  const create = useCreateCatalog();
  const update = useUpdateCatalog();

  const [open, setOpen] = useState(false);
  const [pageId, setPageId] = useState('');
  const [brandColor, setBrandColor] = useState(CATALOG_DEFAULT_COLOR);
  const [instagram, setInstagram] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [error, setError] = useState('');
  /** آیدی پیجی که برای چکِ آن‌لاین دبی‌ونشده می‌شود */
  const [debouncedId, setDebouncedId] = useState('');

  const editing = !!myCatalog;
  const busy = create.isPending || update.isPending;

  // پیش‌پر فیلدها از stateِ تازه (بعد از create/update موفق، refetch همان لحظه)
  const seed = myCatalog;

  // باز شدن دیالوگ → پیش‌پر از کاتالوگ موجود
  useEffect(() => {
    if (!open) return;
    setPageId(seed?.pageId ?? '');
    setBrandColor(seed?.brandColor ?? CATALOG_DEFAULT_COLOR);
    setInstagram(seed?.instagramId ?? '');
    setWhatsapp(seed?.whatsappNumber ?? '');
    setError('');
    setDebouncedId(seed?.pageId ?? '');
  }, [open, seed]);

  // دبیون چک یکتایی — فقط وقتی قالب معتبر است و با مقدار فعلی فرق دارد
  useEffect(() => {
    const t = setTimeout(() => setDebouncedId(pageId.trim().toLowerCase()), 550);
    return () => clearTimeout(t);
  }, [pageId]);

  const normalized = pageId.trim().toLowerCase();
  const formatOk = isValidPageId(normalized);
  const unchanged = editing && normalized === myCatalog.pageId;
  const canCheck = formatOk && !unchanged && debouncedId === normalized;
  const { data: availability, isFetching: checking } = useCatalogPageIdAvailable(debouncedId, canCheck);

  const idStatus: IdStatus = useMemo(() => {
    if (!normalized) return { kind: 'idle' };
    if (!formatOk) return { kind: 'invalid' };
    if (unchanged) return { kind: 'free' };
    if (debouncedId !== normalized || checking) return { kind: 'checking' };
    if (availability == null) return { kind: 'idle' };
    return availability ? { kind: 'free' } : { kind: 'taken' };
  }, [normalized, formatOk, unchanged, debouncedId, checking, availability]);

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError('');
    if (!formatOk) {
      setError(`آیدی پیج معتبر نیست — ${CATALOG_PAGEID_HINT}`);
      return;
    }
    if (idStatus.kind === 'taken') {
      setError('این آیدی قبلاً گرفته شده است؛ آیدی دیگری انتخاب کنید.');
      return;
    }
    const ig = normalizeInstagramId(instagram);
    const wa = whatsapp.trim() ? normalizeWhatsappNumber(whatsapp) : null;
    if (whatsapp.trim() && !wa) {
      setError('شماره واتساپ معتبر نیست — قالب درست: 09xxxxxxxxx');
      return;
    }
    try {
      if (editing) {
        await update.mutateAsync({ pageId: normalized, brandColor, instagramId: ig, whatsappNumber: wa });
        toast({ description: 'تنظیمات کاتالوگ ذخیره شد.' });
      } else {
        await create.mutateAsync({ pageId: normalized, brandColor, instagramId: ig, whatsappNumber: wa });
        toast({ description: 'کاتالوگ شما ساخته شد!' });
      }
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای غیرمنتظره؛ دوباره تلاش کنید.');
    }
  };

  const catalogUrl = `${SITE_URL}/catalog/${myCatalog?.pageId ?? normalized}`;

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(catalogUrl);
      toast({ description: 'لینک کاتالوگ کپی شد.' });
    } catch {
      toast({ description: 'کپی ممکن نشد؛ لینک را دستی انتخاب کنید.', variant: 'destructive' });
    }
  };

  // بک‌اند اندپوینت ندارد (supported:false در خطا) → دکمهٔ ساخت مخفی می‌ماند
  // تا پنل تمیز بماند؛ اگر پشتیبانی هست و هنوز نساخته‌ایم، دکمهٔ «ساخت» می‌آید
  if (!isLoading && state && !state.supported && !open) {
    return null;
  }

  return (
    <>
      <Button size="sm" variant="outline" className={cn('h-9 rounded-md text-xs', className)} onClick={() => setOpen(true)}>
        <BookOpen size={15} />
        {myCatalog ? 'کاتالوگ من' : 'ساخت کاتالوگ محصول'}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader className="text-start">
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen size={18} className="text-primary" />
              {editing ? 'تنظیمات کاتالوگ' : 'ساخت کاتالوگ محصول'}
            </DialogTitle>
            <DialogDescription className="text-start leading-5">
              یک صفحهٔ مستقل و زیبا از محصولاتتان — بدون شلوغی ایمچ — که لینکش را برای
              مشتری‌های خودتان می‌فرستید؛ محصولاتش همان‌ها هستند که این‌جا ثبت کرده‌اید.
            </DialogDescription>
          </DialogHeader>

          {/* نمای موفقیت — کاتالوگ ساخته/ذخیره شد؛ لینک + کپی + مشاهده */}
          {myCatalog && !error ? (
            <div className="space-y-3 rounded-md border border-primary/25 bg-primary/5 p-4">
              <p className="flex items-center gap-2 text-sm font-extrabold text-primary">
                <Check size={16} />
                {editing ? 'لینک کاتالوگ شما' : 'کاتالوگ شما آماده شد!'}
              </p>
              <p className="text-[11.5px] leading-5 text-muted-foreground">
                لینک زیر را برای مشتری‌هایتان بفرستید؛ هر تغییری در محصولات یا تنظیمات بدهید،
                کاتالوگ با همین لینک خودش به‌روز می‌شود.
              </p>
              <div className="flex items-center gap-1.5 rounded-md border bg-card px-3 py-2.5">
                <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-xs">{catalogUrl}</span>
                <button
                  type="button"
                  onClick={copyLink}
                  aria-label="کپی لینک کاتالوگ"
                  title="کپی لینک"
                  className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Copy size={14} />
                </button>
              </div>
              <Button asChild size="sm" className="h-9 w-full rounded-md text-xs">
                <Link href={`/catalog/${myCatalog.pageId}`} target="_blank">
                  <ExternalLink size={14} />
                  مشاهده کاتالوگ
                </Link>
              </Button>
            </div>
          ) : null}

          <form onSubmit={submit} className="space-y-4">
            {/* آیدی پیج */}
            <div>
              <label htmlFor="catalog-page-id" className="mb-1.5 block text-xs font-bold">
                آیدی پیج کاتالوگ
              </label>
              <Input
                id="catalog-page-id"
                dir="ltr"
                value={pageId}
                onChange={(e) => setPageId(e.target.value)}
                placeholder="my-shop"
                className="text-left font-mono"
                autoComplete="off"
                spellCheck={false}
                maxLength={30}
              />
              <p dir="ltr" className="mt-1.5 truncate text-left font-mono text-[10.5px] text-muted-foreground">
                {SITE_URL}/catalog/{normalized || '…'}
              </p>
              <p className="mt-1 flex min-h-4 items-center gap-1 text-[10.5px]" role="status">
                {idStatus.kind === 'invalid' && (
                  <span className="flex items-center gap-1 font-medium text-destructive">
                    <X size={12} /> {CATALOG_PAGEID_HINT}
                  </span>
                )}
                {idStatus.kind === 'checking' && (
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Loader2 size={12} className="animate-spin" /> در حال بررسی…
                  </span>
                )}
                {idStatus.kind === 'free' && (
                  <span className="flex items-center gap-1 font-medium text-emerald-600">
                    <Check size={12} /> {unchanged ? 'آیدی فعلی شما' : 'این آیدی آزاد است'}
                  </span>
                )}
                {idStatus.kind === 'taken' && (
                  <span className="flex items-center gap-1 font-medium text-destructive">
                    <X size={12} /> این آیدی قبلاً گرفته شده است
                  </span>
                )}
              </p>
            </div>

            {/* رنگ برند */}
            <div>
              <p className="mb-1.5 flex items-center gap-1.5 text-xs font-bold">
                <Palette size={13} className="text-primary" />
                رنگ برند کاتالوگ
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {CATALOG_COLORS.map(({ hex, name }) => {
                  const active = brandColor === hex;
                  return (
                    <button
                      key={hex}
                      type="button"
                      onClick={() => setBrandColor(hex)}
                      aria-label={`رنگ ${name}`}
                      aria-pressed={active}
                      title={name}
                      className={cn(
                        'grid size-8 place-items-center rounded-full transition-transform',
                        active ? 'scale-110' : 'hover:scale-105',
                      )}
                      style={{ backgroundColor: hex, ...(active ? { boxShadow: `0 0 0 2px ${hex}, 0 0 0 4px #fff` } : {}) }}
                    >
                      {active && <Check size={14} className="text-white" strokeWidth={3} />}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[10.5px] text-muted-foreground">
                دکمه‌ها و تاکیدهای صفحهٔ کاتالوگ با این رنگ برندینگ می‌شوند.
              </p>
            </div>

            {/* اینستاگرام + واتساپ — اختیاری */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="catalog-instagram" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold">
                  <Instagram size={13} className="text-primary" />
                  اینستاگرام <span className="font-normal text-muted-foreground">(اختیاری)</span>
                </label>
                <Input
                  id="catalog-instagram"
                  dir="ltr"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                  placeholder="@my.shop"
                  className="text-left"
                  autoComplete="off"
                  spellCheck={false}
                  maxLength={40}
                />
              </div>
              <div>
                <label htmlFor="catalog-whatsapp" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold">
                  <MessageCircle size={13} className="text-primary" />
                  واتساپ <span className="font-normal text-muted-foreground">(اختیاری)</span>
                </label>
                <Input
                  id="catalog-whatsapp"
                  dir="ltr"
                  inputMode="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="09xxxxxxxxx"
                  className="text-left font-num"
                  autoComplete="off"
                  maxLength={16}
                />
              </div>
            </div>

            {error && <p className="text-xs font-medium text-destructive">{error}</p>}

            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" className="h-9 rounded-md text-xs" disabled={busy || idStatus.kind === 'invalid' || idStatus.kind === 'taken' || idStatus.kind === 'checking'}>
                {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {editing ? 'ذخیره تنظیمات' : 'ساخت کاتالوگ'}
              </Button>
              <Button type="button" size="sm" variant="ghost" className="h-9 rounded-md text-xs" onClick={() => setOpen(false)}>
                بستن
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
