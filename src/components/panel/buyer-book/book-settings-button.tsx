'use client';

/**
 * دکمه + دیالوگ «تنظیمات دفتر خرید» (خواستهٔ مالک ۱۰-۱۱ دور ۵ + ۱۱-۱۱) — تب
 * «درخواست‌های خرید دوره‌ای» پنل. دفتر خرید همان کالاهای دوره‌ای کاربر است که
 * فروشندگان می‌بینند و ذخیره می‌کنند؛ این دیالوگ شخصی‌سازی آن است:
 *  • آیدی لینک (/b/{bookId}) — پیش‌فرض تصادفی؛ با بررسی زندهٔ آزاد بودن
 *  • متن‌های دفتر (خواستهٔ مالک ۱۱-۱۱): عنوان بنر معرفی دفتر، سمت مسئول خرید
 *    (مثل «مسوول خرید») و شرایط تامین — هر شرطی که تامین‌کنندگان باید بدانند
 *    (مثل «فقط تولیدکنندگان پیشنهاد بدهند» یا «حمل بر عهده فروشنده»)؛ اختیاری
 *  • رنگ برند + لوگوی دلخواه (آپلود) — با پیش‌نمایش زندهٔ جلد دفتر
 * ذخیره: buyerBook/updateSettings (سرور منبع حقیقت ولیدیشن است).
 * چیدمان عین مودال تنظیمات کاتالوگ: بدنهٔ اسکرول‌شوندهٔ عمودی + فوتر فیکس.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  ImagePlus,
  Loader2,
  Palette,
  ScrollText,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/mock/auth';
import { useMyBuyerBookSettings, usePanelProfile, useUpdateBuyerBookSettings } from '@/lib/mock/hooks';
import { resolveBuyerBookPublicId } from '@/lib/mock/api';
import { useToast } from '@/hooks/use-toast';
import { uploadImage } from '@/lib/api/client';
import { compressImage } from '@/lib/image-compress';
import { useOrigin } from '@/lib/use-origin';
import { CATALOG_COLORS, catalogIdError, isValidBrandColor } from '@/lib/catalog-brand';
import { toFa } from '@/lib/format';
import type { BuyerBookSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

type IdStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'free' }
  | { kind: 'taken'; by: string }
  | { kind: 'error'; message: string };

/** سقف نویسه‌های متن‌های دفتر — همان ولیدیشن بک‌اند (stub + مگان) */
const BANNER_TITLE_MAX = 120;
const SUPPLY_TERMS_MAX = 600;

/** جعبهٔ لوگو — کلیک = انتخاب فایل → فشرده‌سازی → آپلود واقعی؛ حذف جدا */
function LogoBox({
  logo,
  uploading,
  onPick,
  onRemove,
}: {
  logo: string | null;
  uploading: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => !uploading && fileRef.current?.click()}
        aria-label="بارگذاری لوگو"
        title="بارگذاری لوگو (png / jpg / webp)"
        className={cn(
          'relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border-2 border-dashed transition-colors',
          logo ? 'border-emerald-300 bg-emerald-50/50' : 'border-border bg-secondary/40 hover:border-primary/50',
        )}
      >
        {logo ? (
          <img src={logo} alt="لوگوی دفتر" className="size-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-muted-foreground">
            <ImagePlus size={20} />
            <span className="text-[10px] font-bold">انتخاب لوگو</span>
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 grid place-items-center bg-card/80">
            <Loader2 size={20} className="animate-spin text-primary" />
          </span>
        )}
      </button>
      <div className="min-w-0 space-y-1.5">
        {logo && (
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[11px] font-bold text-destructive transition-colors hover:bg-red-50"
          >
            <Trash2 size={12} />
            حذف لوگو
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onPick(f);
        }}
      />
    </div>
  );
}

export function BookSettingsButton({ className }: { className?: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: profile } = usePanelProfile();
  const [open, setOpen] = useState(false);

  const userName = user?.userName ?? '';
  // تنظیمات فعلی — فقط وقتی دیالوگ باز است واکشی می‌شود
  const settingsQuery = useMyBuyerBookSettings(open && !!userName);
  const fetched = settingsQuery.data;
  const settledEmpty =
    !settingsQuery.isLoading && settingsQuery.isFetched && !fetched && !!userName;
  const settings: BuyerBookSettings | null = fetched ??
    (settledEmpty
      ? {
          bookId: null, brandColor: null, logo: null,
          bannerTitle: null, managerTitle: null, supplyTerms: null,
        }
      : null);
  const updateSettings = useUpdateBuyerBookSettings();

  // ── پیش‌نویس فیلدها ── seed با دیتای سرور ──
  const [idDraft, setIdDraft] = useState('');
  const [colorDraft, setColorDraft] = useState('');
  const [logoDraft, setLogoDraft] = useState<string | null>(null);
  const [bannerDraft, setBannerDraft] = useState('');
  const [termsDraft, setTermsDraft] = useState('');
  const [logoUploading, setLogoUploading] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (!settings || seeded) return;
    setIdDraft(settings.bookId ?? '');
    setColorDraft(settings.brandColor ?? '');
    setLogoDraft(settings.logo ?? null);
    setBannerDraft(settings.bannerTitle ?? '');
    setTermsDraft(settings.supplyTerms ?? '');
    setSeeded(true);
  }, [settings, seeded]);

  useEffect(() => {
    if (!open) setSeeded(false);
  }, [open]);

  // ── بررسی زندهٔ آزاد بودن آیدی (debounce) ──
  const formatError = useMemo(() => (idDraft ? catalogIdError(idDraft) : null), [idDraft]);
  const [idStatus, setIdStatus] = useState<IdStatus>({ kind: 'idle' });
  const currentBookId = settings?.bookId ?? '';

  useEffect(() => {
    if (!open || !seeded || formatError || !idDraft || idDraft === currentBookId) {
      setIdStatus({ kind: 'idle' });
      return;
    }
    let cancelled = false;
    setIdStatus({ kind: 'checking' });
    const t = setTimeout(async () => {
      try {
        const hit = await resolveBuyerBookPublicId(idDraft);
        if (cancelled) return;
        if (hit) {
          setIdStatus(
            hit.userName === userName
              ? { kind: 'free' } // مال خودم — آزاد
              : { kind: 'taken', by: hit.userName },
          );
        } else {
          setIdStatus({ kind: 'free' });
        }
      } catch {
        if (!cancelled) setIdStatus({ kind: 'idle' }); // خطای شبکه → سرور موقع ذخیره می‌گوید
      }
    }, 600);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [idDraft, open, seeded, formatError, currentBookId, userName]);

  // ── تغییرات ذخیره‌نشده؟ ──
  const dirty =
    !!settings &&
    (idDraft !== currentBookId ||
      (colorDraft || null) !== (settings.brandColor ?? null) ||
      (logoDraft ?? null) !== (settings.logo ?? null) ||
      (bannerDraft.trim() || null) !== (settings.bannerTitle ?? null) ||
      (termsDraft.trim() || null) !== (settings.supplyTerms ?? null));

  const idBlocked =
    (!!idDraft && !!formatError) || idStatus.kind === 'taken' || idStatus.kind === 'checking';
  const canSave = dirty && !idBlocked && !updateSettings.isPending;

  const previewAccent = colorDraft || 'var(--primary)';
  const previewName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'نام شما';
  // نام کسب‌وکار پروفایل — پیش‌فرض عنوان بنر «دفتر خرید + کسب‌وکار» (خواستهٔ مالک ۱۱-۱۱)
  const previewCompanyName = profile?.profile.companyName?.trim() || '';
  const origin = useOrigin();
  const bookUrl = settings ? `${origin}/b/${currentBookId || '…'}` : '';

  const copyLink = async () => {
    if (!bookUrl || !currentBookId) return;
    try {
      await navigator.clipboard.writeText(bookUrl);
      toast({ description: 'لینک دفتر خرید کپی شد.' });
    } catch {
      toast({ description: 'کپی ممکن نشد؛ لینک را دستی انتخاب کنید.', variant: 'destructive' });
    }
  };

  /** آپلود لوگو — فشرده‌سازی کوچک (۵۱۲px) + uploads/uploadImage واقعی */
  const pickLogo = async (file: File) => {
    if (!/^image\/(png|jpe?g|webp)$/i.test(file.type)) {
      toast({ description: 'تصویر لوگو باید png، jpg یا webp باشد.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ description: 'حجم لوگو باید کمتر از ۵ مگابایت باشد.' });
      return;
    }
    setLogoUploading(true);
    try {
      const optimized = await compressImage(file, { maxEdge: 512, quality: 0.9, skipBelow: 200_000 });
      const uploaded = await uploadImage(optimized, {
        model: 'User',
        modelId: profile?.userInfo.id ?? userName,
        key: 'book-logo',
        replace: true,
      });
      setLogoDraft(uploaded.url);
      toast({ description: 'لوگو بارگذاری شد؛ برای اعمال، تغییرات را ذخیره کنید.' });
    } catch (err) {
      toast({ description: err instanceof Error ? err.message : 'آپلود لوگو ناموفق بود.' });
    } finally {
      setLogoUploading(false);
    }
  };

  const save = async () => {
    if (!canSave) return;
    try {
      await updateSettings.mutateAsync({
        ...(idDraft !== currentBookId ? { bookId: idDraft } : {}),
        ...(colorDraft !== (settings?.brandColor ?? '') ? { brandColor: colorDraft } : {}),
        ...(logoDraft !== (settings?.logo ?? null) ? { logo: logoDraft } : {}),
        ...((bannerDraft.trim() || null) !== (settings?.bannerTitle ?? null)
          ? { bannerTitle: bannerDraft.trim() }
          : {}),
        ...((termsDraft.trim() || null) !== (settings?.supplyTerms ?? null)
          ? { supplyTerms: termsDraft.trim() }
          : {}),
      });
      toast({ description: 'تنظیمات دفتر خرید ذخیره شد.' });
    } catch (e) {
      toast({
        description: e instanceof Error && e.message ? e.message : 'ذخیره ممکن نشد؛ دوباره تلاش کنید.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={cn('h-9 rounded-md text-xs', className)}
        onClick={() => setOpen(true)}
      >
        <BookOpen size={15} />
        تنظیمات دفتر خرید
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* چیدمان ستونی عین مودال کاتالوگ — هدر ثابت + بدنهٔ اسکرول عمودی + فوتر فیکس */}
        <DialogContent dir="rtl" className="flex max-h-[88dvh] flex-col overflow-hidden sm:max-w-lg">
          <DialogHeader className="shrink-0 text-start">
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen size={18} className="text-primary" />
              تنظیمات دفتر خرید
            </DialogTitle>
            <DialogDescription className="text-start leading-5">
              تامین‌کنندگان با مشاهده دفتر خرید شما می‌توانند قیمت‌ها و پیشنهادات رقابتی خود را برای شما ارسال کنند.
            </DialogDescription>
          </DialogHeader>

          {settingsQuery.isLoading || !settings || !seeded ? (
            <div className="flex min-h-24 flex-1 items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              در حال دریافت تنظیمات…
            </div>
          ) : (
            <>
              {/* ── بدنه — تنها همین بخش اسکرول می‌خورد (عمودی) ── */}
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overflow-x-hidden pb-1">
                {/* ── آیدی و لینک دفتر ── */}
                <div className="space-y-2.5 rounded-md border border-primary/25 bg-primary/5 p-4">
                  <p className="flex items-center gap-2 text-sm font-extrabold text-primary">
                    <Bookmark size={16} />
                    آیدی و لینک دفتر خرید شما
                  </p>
                  <div className="flex items-center gap-2">
                    <span
                      dir="ltr"
                      className="shrink-0 rounded-md border bg-card px-2.5 py-2 font-mono text-[11px] text-muted-foreground"
                    >
                      /b/
                    </span>
                    <Input
                      dir="ltr"
                      value={idDraft}
                      onChange={(e) => {
                        setIdDraft(e.target.value.trim().toLowerCase());
                      }}
                      placeholder="phaksh-seyyed"
                      className="h-10 rounded-md font-mono text-xs"
                      aria-label="آیدی دفتر خرید"
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                  {/* وضعیت آیدی — فرمت / آزاد / گرفته‌شده / در حال بررسی */}
                  <div className="min-h-5 text-[11px] leading-5">
                    {idDraft && formatError ? (
                      <span className="flex items-center gap-1 text-destructive">
                        <X size={12} className="shrink-0" />
                        {formatError}
                      </span>
                    ) : idStatus.kind === 'checking' ? (
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Loader2 size={12} className="shrink-0 animate-spin" />
                        بررسی آزاد بودن…
                      </span>
                    ) : idStatus.kind === 'taken' ? (
                      <span className="flex items-center gap-1 text-destructive">
                        <X size={12} className="shrink-0" />
                        این آیدی قبلاً گرفته شده است؛ یکی دیگر انتخاب کنید.
                      </span>
                    ) : idStatus.kind === 'free' ? (
                      <span className="flex items-center gap-1 text-success">
                        <Check size={12} className="shrink-0" />
                        این آیدی آزاد است.
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        فقط حروف کوچک لاتین، رقم و خط تیره (-)؛ بین ۳ تا ۳۰ نویسه.
                        خالی بماند = آیدی تصادفی فعلی می‌ماند.
                      </span>
                    )}
                  </div>
                  {!formatError && !!idDraft && idDraft !== currentBookId && idStatus.kind !== 'taken' && (
                    <p className="flex items-center gap-1 text-[11px] leading-5 text-amber-600 dark:text-amber-400">
                      <Bookmark size={11} className="shrink-0" />
                      با ذخیرهٔ آیدی جدید، لینک قبلی (‏{currentBookId || 'تصادفی'}‏) از کار می‌افتد.
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 rounded-md border bg-card px-3 py-2.5">
                    <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-xs">
                      {currentBookId ? bookUrl : '—'}
                    </span>
                    <button
                      type="button"
                      onClick={copyLink}
                      aria-label="کپی لینک دفتر خرید"
                      title="کپی لینک"
                      className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                  {currentBookId && (
                    <Button asChild size="sm" variant="outline" className="h-9 w-full rounded-md text-xs">
                      <Link href={`/b/${currentBookId}`} target="_blank">
                        <ExternalLink size={14} />
                        مشاهده دفتر خرید من
                      </Link>
                    </Button>
                  )}
                </div>


                  {/* عنوان بنر — معرفی دفتر روی جلد برند */}
                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <label htmlFor="book-banner-title" className="text-xs font-bold">
                        عنوان دفتر روی بنر
                      </label>
                      <span className="font-num text-[10px] text-muted-foreground">
                        {toFaCount(bannerDraft.length, BANNER_TITLE_MAX)}
                      </span>
                    </div>
                    {/* تکست‌ایریای چندخطی (خواستهٔ مالک ۱۱-۱۱): توضیح دفتر
                        چندجمله‌ای است — Enter می‌افتد و بنر هم همان‌طور نشان می‌دهد */}
                    <Textarea
                      id="book-banner-title"
                      value={bannerDraft}
                      onChange={(e) => setBannerDraft(e.target.value.slice(0, BANNER_TITLE_MAX))}
                      placeholder={'مثال:\nخرید ماهانه سیب و گردو در حجم بالا.\nبهترین قیمت و شرایط تامین خود را پیشنهاد دهید.'}
                      rows={3}
                      dir="rtl"
                      className="resize-none rounded-md text-xs leading-6"
                      aria-label="عنوان دفتر روی بنر (چندخطی)"
                    />
                  </div>


                  <div className="space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <label htmlFor="book-supply-terms" className="flex items-center gap-1.5 text-xs font-bold">
                        <ScrollText size={13} className="text-primary/80" />
                        شرایط تامین (اختیاری)
                      </label>
                      <span className="font-num text-[10px] text-muted-foreground">
                        {toFaCount(termsDraft.length, SUPPLY_TERMS_MAX)}
                      </span>
                    </div>
                    <Textarea
                      id="book-supply-terms"
                      value={termsDraft}
                      onChange={(e) => setTermsDraft(e.target.value.slice(0, SUPPLY_TERMS_MAX))}
                      placeholder={
                        'مثال:\nفقط تولیدکنندگان پیشنهاد تامین ارسال کنند.\nهزینه حمل بر عهده تامین‌کننده است.\nپرداخت نقدی در لحظه تحویل انجام می‌شود.'
                      }
                      rows={7}
                      className="resize-none rounded-md text-[11px] font-normal leading-6"
                      aria-label="شرایط تامین برای تامین‌کنندگان"
                    />
                  </div>


                  {/* لوگو — خواستهٔ مالک: خریدار رنگ برند و لوگو داشته باشد */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold">لوگوی دفتر</p>
                    <LogoBox
                      logo={logoDraft}
                      uploading={logoUploading}
                      onPick={(f) => void pickLogo(f)}
                      onRemove={() => setLogoDraft(null)}
                    />
                  </div>

                  {/* رنگ برند */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold">رنگ برند دفتر</p>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {CATALOG_COLORS.map(({ hex, label }) => (
                        <button
                          key={label}
                          type="button"
                          title={label}
                          aria-label={`رنگ ${label}`}
                          aria-pressed={hex ? colorDraft === hex : colorDraft === ''}
                          onClick={() => setColorDraft(hex)}
                          className={cn(
                            'grid size-8 place-items-center rounded-full border-2 transition-transform hover:scale-110',
                            hex ? colorDraft === hex : colorDraft === ''
                              ? 'border-foreground'
                              : 'border-transparent',
                          )}
                          style={hex ? { backgroundColor: hex } : undefined}
                        >
                          {!hex && <span className="text-[9px] font-bold text-muted-foreground">پیش‌فرض</span>}
                          {hex === '' && colorDraft === '' && <Check size={12} className="text-foreground" />}
                        </button>
                      ))}
                      {/* رنگ دلخواه — native color input */}
                      <label
                        className={cn(
                          'relative grid size-8 cursor-pointer place-items-center rounded-full border-2 transition-transform hover:scale-110',
                          isValidBrandColor(colorDraft) &&
                            colorDraft &&
                            !CATALOG_COLORS.some((c) => c.hex === colorDraft)
                            ? 'border-foreground'
                            : 'border-transparent',
                        )}
                        title="رنگ دلخواه"
                        style={{
                          backgroundColor:
                            isValidBrandColor(colorDraft) && colorDraft && !CATALOG_COLORS.some((c) => c.hex === colorDraft)
                              ? colorDraft
                              : 'var(--secondary)',
                        }}
                      >
                        <Palette
                          size={13}
                          className={cn(
                            'text-muted-foreground',
                            isValidBrandColor(colorDraft) &&
                              colorDraft &&
                              !CATALOG_COLORS.some((c) => c.hex === colorDraft) &&
                              'text-white mix-blend-difference',
                          )}
                        />
                        <input
                          type="color"
                          className="absolute inset-0 size-full cursor-pointer opacity-0"
                          value={isValidBrandColor(colorDraft) && colorDraft ? colorDraft : '#64748b'}
                          onChange={(e) => setColorDraft(e.target.value)}
                          aria-label="انتخاب رنگ دلخواه"
                        />
                      </label>
                    </div>
                  </div>

                  {/* پیش‌نمایش زندهٔ جلد دفتر — طراحی جدید (خواستهٔ مالک ۱۱-۱۱):
                      لوگو روی بنر، تصویر پروفایل در ردیف هویت، «مسوول خرید: نام» */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold">پیش‌نمایش</p>
                    <div className="overflow-hidden rounded-lg border">
                      {/* بنر — لوگوی کسب‌وکار بالا + عنوان */}
                      <div
                        className="flex flex-col gap-1.5 px-3 py-2.5"
                        style={{
                          background: `linear-gradient(135deg, ${previewAccent} 0%, color-mix(in srgb, ${previewAccent} 72%, black) 100%)`,
                        }}
                      >
                        {logoDraft ? (
                          <img
                            src={logoDraft}
                            alt="لوگو"
                            className="size-8 w-fit rounded-lg border border-white/50 bg-white/90 object-cover"
                          />
                        ) : (
                          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[9px] font-extrabold text-white">
                            <BookOpen size={9} strokeWidth={2.4} />
                            دفتر خرید
                          </span>
                        )}
                        <p className="line-clamp-2 whitespace-pre-line text-[11px] font-extrabold leading-5 text-white">
                          {bannerDraft.trim() ||
                            `دفتر خرید ${previewCompanyName || previewName}`}
                        </p>
                      </div>
                      {/* ردیف هویت — تصویر پروفایل + «مسوول خرید: نام» */}
                      <div className="flex items-center gap-2.5 bg-card px-3 py-2.5">
                        {user?.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt="تصویر پروفایل"
                            className="size-9 shrink-0 rounded-lg border object-cover"
                          />
                        ) : (
                          <span
                            className="grid size-9 shrink-0 place-items-center rounded-lg text-base font-black text-white shadow-sm"
                            style={{ backgroundColor: previewAccent }}
                          >
                            {previewName.charAt(0) || 'د'}
                          </span>
                        )}
                        <p className="min-w-0 truncate text-[13px] font-extrabold">
                          <span
                            className="text-[10px] font-bold"
                            style={{ color: colorDraft || 'var(--primary)' }}
                          >
                            مسوول خرید:{" "}
                          </span>
                          {previewName}
                        </p>
                        <span
                          className="ms-auto flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold text-white shadow-sm"
                          style={{ backgroundColor: previewAccent }}
                        >
                          <Bookmark size={12} />
                          ذخیره دفتر
                        </span>
                      </div>
                    </div>
                  </div>
              </div>

              {/* ── فوتر فیکس — عین مودال کاتالوگ ── */}
              <div className="shrink-0 space-y-1.5 border-t pt-3">
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setOpen(false)}
                    className="h-10 flex-1 rounded-md text-sm sm:flex-none sm:px-6"
                  >
                    انصراف
                  </Button>
                  <Button
                    onClick={save}
                    disabled={!canSave}
                    className="h-10 flex-1 rounded-md text-sm font-bold sm:flex-none sm:px-8"
                  >
                    {updateSettings.isPending && <Loader2 size={15} className="animate-spin" />}
                    ذخیره تغییرات
                  </Button>
                </div>
                {!dirty && (
                  <p className="text-center text-[10.5px] text-muted-foreground">
                    تغییری برای ذخیره نیست.
                  </p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

/** شمارندهٔ نویسهٔ فارسی — «۱۲/۱۲۰» */
function toFaCount(n: number, max: number): string {
  return `${toFa(n)}/${toFa(max)}`;
}
