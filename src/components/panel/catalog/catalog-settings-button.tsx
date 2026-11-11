'use client';

/**
 * دکمه + دیالوگ «تنظیمات کاتالوگ» (خواستهٔ مالک ۱۰-۱۱ دور ۳) — سربرگ
 * «محصولات من». کاتالوگ فروشنده همان صفحهٔ عمومی اوست (/c/{id}) که
 * با ثبت اولین محصول خودبه‌خود ساخته می‌شود. این دیالوگ شخصی‌سازی آن است:
 *  • آیدی پیش‌فرض لینک (userName) قابل تغییر به آیدی دلخواه است — با
 *    بررسی زندهٔ آزاد بودن (resolvePublicId) + اعتبارسنجی فرمت
 *  • نام برند، رنگ و آیکون دلخواه — با پیش‌نمایش زندهٔ هدر کاتالوگ
 *  • دکمهٔ تماس کاتالوگ (خواستهٔ مالک ۱۱-۱۱) — کلید مستقل این صفحه؛ خاموش =
 *    خریداران فقط دکمهٔ چت می‌بینند (دفتر خرید/پروفایل کلید خودش را دارند)
 *  • آمار ذخیره‌کنندگان
 * ذخیره: catalog/updateSettings (سرور منبع حقیقت ولیدیشن است — خطای
 * تکراری‌بودن آیدی با پیام خودش نمایش داده می‌شود).
 * چیدمان (خواستهٔ مالک ۱۰-۱۱ دور ۴): بدنهٔ اسکرول‌شونده + فوتر فیکسِ
 * پایین مودال با دکمه‌های «انصراف» و «ذخیره تغییرات» که با اسکرول
 * حرکت نمی‌کنند؛ بدون اسکرول افقی.
 */

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Bookmark,
  Check,
  Copy,
  ExternalLink,
  Loader2,
  Palette,
  PhoneOff,
  Store,
  Users,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/mock/auth';
import { useCatalogSavers, useMyCatalogSettings, useUpdateCatalogSettings } from '@/lib/mock/hooks';
import { resolveCatalogPublicId } from '@/lib/mock/api';
import { useToast } from '@/hooks/use-toast';
import { useOrigin } from '@/lib/use-origin';
import { toFa } from '@/lib/format';
import {
  CATALOG_COLORS,
  CATALOG_ICONS,
  catalogIcon,
  catalogIdError,
  isValidBrandColor,
} from '@/lib/catalog-brand';
import type { CatalogSettings } from '@/lib/types';
import { cn } from '@/lib/utils';

type IdStatus = { kind: 'idle' } | { kind: 'checking' } | { kind: 'free' } | { kind: 'taken'; by: string } | { kind: 'error'; message: string };

export function CatalogSettingsButton({ className }: { className?: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const userName = user?.userName ?? '';
  // تنظیمات فعلی — فقط وقتی دیالوگ باز است واکشی می‌شود. بک‌اند بدون
  // اندپوینت (بک‌اند واقعی هنوز نساخته) = پیش‌فرض‌های محلی — فقط بعد از
  // «تسویهٔ» فچ (isFetched) تا با پاسخ سرور مسابقه ندهد
  const settingsQuery = useMyCatalogSettings(open && !!userName);
  const fetched = settingsQuery.data;
  const settledEmpty =
    !settingsQuery.isLoading && settingsQuery.isFetched && !fetched && !!userName;
  const settings: CatalogSettings | null = fetched ??
    (settledEmpty ? { catalogId: userName, brandName: null, brandColor: null, brandIcon: 'store', allowCalls: true } : null);
  const { data: savers } = useCatalogSavers(userName, open && !!userName);
  const updateSettings = useUpdateCatalogSettings();

  // ── پیش‌نویس فیلدها ── seed با دیتای سرور؛ اگر فچ با خطا تسویه شد
  // (بک‌اند واقعی هنوز اندپوینت نساخته) با پیش‌فرض‌های محلی seed می‌شود
  // تا مودال قفل نشود ──
  const [idDraft, setIdDraft] = useState('');
  const [nameDraft, setNameDraft] = useState('');
  const [colorDraft, setColorDraft] = useState('');
  const [iconDraft, setIconDraft] = useState('store');
  const [callsDraft, setCallsDraft] = useState(true);
  const [seeded, setSeeded] = useState(false);

  // seed — اولین دیتای غیرتهی (سرور یا پیش‌فرض محلی پس از تسویهٔ فچ)
  useEffect(() => {
    if (!settings || seeded) return;
    setIdDraft(settings.catalogId ?? userName);
    setNameDraft(settings.brandName ?? '');
    setColorDraft(settings.brandColor ?? '');
    setIconDraft(settings.brandIcon || 'store');
    // دکمهٔ تماس — undefined (بک‌اند قدیمی) = روشن
    setCallsDraft(settings.allowCalls !== false);
    setSeeded(true);
  }, [settings, seeded, userName]);

  // بستن دیالوگ = ریست پیش‌نویس‌ها برای باز شدن بعدی
  useEffect(() => {
    if (!open) setSeeded(false);
  }, [open]);

  // ── بررسی زندهٔ آزاد بودن آیدی (debounce) ──
  const formatError = useMemo(() => catalogIdError(idDraft), [idDraft]);
  const [idStatus, setIdStatus] = useState<IdStatus>({ kind: 'idle' });
  const currentCatalogId = settings?.catalogId ?? userName;

  useEffect(() => {
    // بدون تغییر یا فرمت غلط → سرور بی‌خیال
    if (!open || !seeded || formatError || idDraft === currentCatalogId) {
      setIdStatus({ kind: 'idle' });
      return;
    }
    let cancelled = false;
    setIdStatus({ kind: 'checking' });
    const t = setTimeout(async () => {
      try {
        const hit = await resolveCatalogPublicId(idDraft);
        if (cancelled) return;
        // رزولو شد = این آیدی یا userName کسی است یا کاتالوگ دیگری
        if (hit) {
          setIdStatus(
            hit.userName === userName
              ? { kind: 'free' } // مال خودم (userName خودم) — آزاد
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
  }, [idDraft, open, seeded, formatError, currentCatalogId, userName]);

  // ── تغییرات ذخیره‌نشده؟ ──
  const dirty =
    !!settings &&
    (idDraft !== currentCatalogId ||
      (nameDraft || null) !== (settings.brandName ?? null) ||
      (colorDraft || null) !== (settings.brandColor ?? null) ||
      iconDraft !== (settings.brandIcon || 'store') ||
      callsDraft !== (settings.allowCalls !== false));

  const idBlocked = !!formatError || idStatus.kind === 'taken' || idStatus.kind === 'checking';
  const canSave = dirty && !idBlocked && !updateSettings.isPending;

  const previewAccent = colorDraft || 'var(--primary)';
  const previewIcon = catalogIcon(iconDraft);
  // لینک کاتالوگ از location صفحهٔ فعلی ساخته می‌شود — نه دامنهٔ کانفیگ
  // (خواستهٔ مالک ۱۰-۱۱ دور ۴؛ قبلاً imach.example.com می‌آمد)
  const origin = useOrigin();
  const catalogUrl = settings ? `${origin}/c/${settings.catalogId}` : '';

  const copyLink = async () => {
    if (!catalogUrl) return;
    try {
      await navigator.clipboard.writeText(catalogUrl);
      toast({ description: 'لینک کاتالوگ کپی شد.' });
    } catch {
      toast({ description: 'کپی ممکن نشد؛ لینک را دستی انتخاب کنید.', variant: 'destructive' });
    }
  };

  const save = async () => {
    if (!canSave) return;
    try {
      await updateSettings.mutateAsync({
        catalogId: idDraft,
        brandName: nameDraft.trim(),
        brandColor: colorDraft,
        brandIcon: iconDraft,
        ...(callsDraft !== (settings.allowCalls !== false) ? { allowCalls: callsDraft } : {}),
      });
      toast({ description: 'تنظیمات کاتالوگ ذخیره شد.' });
    } catch (e) {
      // پیام خود بک‌اند (تکراری/ولیدیشن) یا پیام پیش‌فرض
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
        تنظیمات کاتالوگ
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        {/* چیدمان ستونی: هدر ثابت + بدنهٔ اسکرول‌شونده (فقط عمودی — بدون
            اسکرول افقی) + فوتر فیکس پایین (خواستهٔ مالک ۱۰-۱۱ دور ۴) */}
        <DialogContent dir="rtl" className="flex max-h-[88dvh] flex-col overflow-hidden sm:max-w-lg">
          <DialogHeader className="shrink-0 text-start">
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen size={18} className="text-primary" />
              تنظیمات کاتالوگ
            </DialogTitle>
            <DialogDescription className="text-start leading-5">
              کاتالوگ شما همان صفحهٔ عمومی‌تان است؛ با ثبت هر محصول خودش به‌روز
              می‌شود. این‌جا آیدی لینک، نام برند، رنگ و آیکون آن را شخصی کنید.
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
              {/* ── آیدی و لینک کاتالوگ ── */}
              <div className="space-y-2.5 rounded-md border border-primary/25 bg-primary/5 p-4">
                <p className="flex items-center gap-2 text-sm font-extrabold text-primary">
                  <Bookmark size={16} />
                  آیدی و لینک کاتالوگ شما
                </p>
                <div className="flex items-center gap-2">
                  <span
                    dir="ltr"
                    className="shrink-0 rounded-md border bg-card px-2.5 py-2 font-mono text-[11px] text-muted-foreground"
                  >
                    /c/
                  </span>
                  <Input
                    dir="ltr"
                    value={idDraft}
                    onChange={(e) => {
                      setIdDraft(e.target.value.trim().toLowerCase());
                    }}
                    placeholder="my-shop"
                    className="h-10 rounded-md font-mono text-xs"
                    aria-label="آیدی کاتالوگ"
                    autoComplete="off"
                    spellCheck={false}
                  />
                </div>
                {/* وضعیت آیدی — فرمت / آزاد / گرفته‌شده / در حال بررسی */}
                <div className="min-h-5 text-[11px] leading-5">
                  {formatError ? (
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
                    </span>
                  )}
                </div>
                {/* هشدار تغییر آیدی — لینک قبلی می‌میرد؛ فقط وقتی آیدی عوض شده */}
                {!formatError && idDraft !== currentCatalogId && idStatus.kind !== 'taken' && (
                  <p className="flex items-center gap-1 text-[11px] leading-5 text-amber-600 dark:text-amber-400">
                    <Bookmark size={11} className="shrink-0" />
                    با ذخیرهٔ آیدی جدید، لینک قبلی (‏{currentCatalogId}‏) از کار می‌افتد؛ لینک‌هایی که قبلاً فرستاده‌اید را به‌روز کنید.
                  </p>
                )}
                <p className="text-[11.5px] leading-5 text-muted-foreground">
                  لینک کاتالوگ برای مشتری‌هایتان؛ با هر تغییری در محصولات، خودش
                  به‌روز می‌شود.
                </p>
                <div className="flex items-center gap-1.5 rounded-md border bg-card px-3 py-2.5">
                  <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-xs">
                    {catalogUrl || '…'}
                  </span>
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
                <Button asChild size="sm" variant="outline" className="h-9 w-full rounded-md text-xs">
                  <Link href={`/c/${settings.catalogId}`} target="_blank">
                    <ExternalLink size={14} />
                    مشاهده کاتالوگ
                  </Link>
                </Button>
              </div>

              {/* ── برند و ظاهر ── */}
              <div className="space-y-3 rounded-md border bg-card p-4">
                <p className="flex items-center gap-2 text-sm font-bold">
                  <Palette size={15} className="text-primary" />
                  برند و ظاهر کاتالوگ
                </p>

                {/* نام برند */}
                <div className="space-y-1.5">
                  <label htmlFor="catalog-brand-name" className="text-xs font-bold">
                    نام برند / فروشگاه
                  </label>
                  <Input
                    id="catalog-brand-name"
                    value={nameDraft}
                    onChange={(e) => setNameDraft(e.target.value.slice(0, 40))}
                    placeholder={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'نام فروشگاه شما'}
                    className="h-10 rounded-md text-sm"
                    autoComplete="off"
                  />
                  <p className="text-[10.5px] text-muted-foreground">
                    خالی بماند = نام خودتان. این نام در هدر و عنوان کاتالوگ می‌آید.
                  </p>
                </div>

                {/* آیکون برند */}
                <div className="space-y-1.5">
                  <p className="text-xs font-bold">آیکون کاتالوگ</p>
                  {/* آیکون‌ها — موبایل  ستون کمتر تا دکمه‌ها ریز نشوند و
                      اسکرول افقی نیفتد (خواستهٔ مالک ۱۰-۱۱ دور ۴) */}
                  <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-8">
                    {CATALOG_ICONS.map(({ key, label, Icon }) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setIconDraft(key)}
                        title={label}
                        aria-label={`آیکون ${label}`}
                        aria-pressed={iconDraft === key}
                        className={cn(
                          'grid aspect-square place-items-center rounded-md border transition-colors',
                          iconDraft === key
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                        )}
                      >
                        <Icon size={17} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* رنگ برند */}
                <div className="space-y-1.5">
                  <p className="text-xs font-bold">رنگ کاتالوگ</p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {CATALOG_COLORS.map(({ hex, label }) => (
                      <button
                        key={label}
                        type="button"
                        title={label}
                        aria-label={`رنگ ${label}`}
                        aria-pressed={colorDraft === hex}
                        onClick={() => setColorDraft(hex)}
                        className={cn(
                          'grid size-8 place-items-center rounded-full border-2 transition-transform hover:scale-110',
                          colorDraft === hex ? 'border-foreground' : 'border-transparent',
                        )}
                        style={hex ? { backgroundColor: hex } : undefined}
                      >
                        {!hex && (
                          <span className="text-[9px] font-bold text-muted-foreground">پیش‌فرض</span>
                        )}
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

                {/* پیش‌نمایش زندهٔ هدر — حسِ مالکیت */}
                <div className="space-y-1.5">
                  <p className="text-xs font-bold">پیش‌نمایش</p>
                  <div
                    className="flex items-center gap-2.5 rounded-lg border px-3 py-2.5"
                    style={{ borderColor: colorDraft ? `${colorDraft}55` : undefined }}
                  >
                    <span
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-white shadow-sm"
                      style={{ backgroundColor: previewAccent }}
                    >
                      <previewIcon.Icon size={18} strokeWidth={2.2} />
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="truncate text-sm font-extrabold">
                        {nameDraft.trim() || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || 'نام شما'}
                      </p>
                      <p
                        className="mt-0.5 flex items-center gap-1 text-[10.5px] font-medium text-muted-foreground"
                        style={colorDraft ? { color: colorDraft } : undefined}
                      >
                        <BookOpen size={10} />
                        کاتالوگ آنلاین
                      </p>
                    </div>
                    <span
                      className="ms-auto flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-[11px] font-bold text-white shadow-sm"
                      style={{ backgroundColor: previewAccent }}
                    >
                      <Store size={12} />
                      اشتراک گذاری
                    </span>
                  </div>
                </div>
              </div>

              {/* ── دکمهٔ تماس (خواستهٔ مالک ۱۱-۱۱) — کلید مستقل کاتالوگ؛
                  خاموش = خریداران در کاتالوگ فقط دکمهٔ چت را می‌بینند. سوییچ
                  «امکان تماس» پروفایل و کلید دفتر خرید جدا اعمال می‌شوند ── */}
              <div className="flex items-start justify-between gap-3 rounded-md border bg-card p-3.5">
                <div className="min-w-0">
                  <label htmlFor="catalog-allow-calls" className="flex items-center gap-1.5 text-xs font-bold">
                    <PhoneOff size={14} className="text-muted-foreground/70" />
                    دکمهٔ تماس در کاتالوگ
                  </label>
                  <p className="mt-1.5 text-[11px] leading-5 text-muted-foreground">
                    اگر خاموش کنید، خریداران در کاتالوگ شما فقط می‌توانند چت کنند؛
                    شمارهٔ شما هرگز نمایش داده نمی‌شود.
                  </p>
                </div>
                <Switch
                  id="catalog-allow-calls"
                  checked={callsDraft}
                  onCheckedChange={setCallsDraft}
                  aria-label="دکمهٔ تماس در کاتالوگ"
                  className="mt-1 shrink-0"
                />
              </div>

              {/* ── ذخیره‌کنندگان ── */}
              <div className="flex items-center justify-between gap-3 rounded-md border bg-card p-4">
                <p className="flex items-center gap-2 text-xs font-bold">
                  <Users size={15} className="text-primary" />
                  ذخیره کنندگان کاتالوگ شما
                  <span className="font-num text-[13px] font-extrabold text-primary">
                    {toFa(savers?.count ?? 0)}
                  </span>
                  نفر
                </p>
                <Button asChild size="sm" variant="ghost" className="h-8 rounded-md text-[11px]">
                  <Link href={`/c/${settings.catalogId}#about`} target="_blank">
                    مشاهده لیست
                  </Link>
                </Button>
              </div>

              {/* ── فوتر فیکس — بیرون از ناحیهٔ اسکرول؛ همیشه پایین مودال
                  دیده می‌شود. انصراف = بستن (پیش‌نویس‌ها با باز شدن بعدی
                  از نو seed می‌شوند) ── */}
              </div>
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
