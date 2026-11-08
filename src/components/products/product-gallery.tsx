'use client';

/**
 * گالری تصویر صفحهٔ جزئیات محصول (خواسته مالک ۴-۱۱):
 *  — تامبنیل‌های آلبوم حذف شدند (جا می‌گرفتند)؛ به‌جایش سوییپ/درگ
 *  — نشانه‌های کاملاً بصری و بدون هیچ نوشته‌ای: فلش‌های جهت + نقطه‌های جایگاه
 *  — کلیک روی عکس بزرگ → نمایش تمام‌صفحه؛ بستن با ✕ یا Esc یا تپ روی صحنه
 *  — واترمارک: الگوی قطری ایمچ موقع آپلود داخل پیکسل‌های خود عکس نشسته
 *    (دور ۲۷) — لایهٔ نمایشی حذف شد؛ نشان «نردبان/ویدیو» روی عکس اصلی حفظ شده
 *  — امبلا با direction:rtl — اسلاید بعدی از سمت چپ می‌آید؛
 *    فلش چپ = بعدی (end)، فلش راست = قبلی (start)
 * عکس‌ها همان URLهای اصلیِ بهینه‌شدهٔ next/image صفحه‌اند (رفتار قبلی حفظ شد).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import useEmblaCarousel from 'embla-carousel-react';
import { ChevronLeft, ChevronRight, Package, X } from 'lucide-react';
import { LadderBadge } from '@/components/shared/badges';
import { cn } from '@/lib/utils';

/** دکمهٔ فلش شفاف روی تصویر — لمسیِ راحت، بدون متن */
const ARROW_CLS =
  'grid size-9 place-items-center rounded-full bg-black/40 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/65 sm:size-10';

export function ProductGallery({
  photos,
  alt,
  isLadder = false,
  hasVideo = false,
  priority = false,
  sizes = '(max-width: 640px) 100vw, 420px',
}: {
  photos: string[];
  alt: string;
  isLadder?: boolean;
  hasVideo?: boolean;
  /** فقط برای تصویر LCP اول صفحه */
  priority?: boolean;
  sizes?: string;
}) {
  const multi = photos.length > 1;

  const options = useMemo(
    () => ({ direction: 'rtl' as const, containScroll: 'trimSnaps' as const, watchDrag: multi }),
    [multi],
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(options);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [sel, setSel] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // فیلتر درگ/کلیک: تپِ بی‌حرکت = باز کردن تمام‌صفحه؛ کشیدن = سوییپ
  const downRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!emblaApi) return;
    const sync = () => {
      setSel(emblaApi.selectedScrollSnap());
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };
    sync();
    emblaApi.on('select', sync).on('reInit', sync);
    return () => {
      emblaApi.off('select', sync).off('reInit', sync);
    };
  }, [emblaApi]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    downRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const onStageClick = useCallback((e: React.MouseEvent) => {
    const d = downRef.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.x) < 8 && Math.abs(e.clientY - d.y) < 8) setFullscreen(true);
  }, []);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') emblaApi?.scrollNext();
      else if (e.key === 'ArrowRight') emblaApi?.scrollPrev();
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setFullscreen(true);
      }
    },
    [emblaApi],
  );

  const closeFullscreen = useCallback(
    (index: number) => {
      setFullscreen(false);
      // گالری اصلی هم‌گام با آخرین عکسِ دیده‌شده در تمام‌صفحه می‌ماند
      emblaApi?.scrollTo(index, true);
      viewportRef.current?.focus();
    },
    [emblaApi],
  );

  // بدون عکس — همان جایگزین آیکون دسته (رفتار قبلی ProductImage)
  if (photos.length === 0) {
    return (
      <div className="grid aspect-square w-full max-w-[420px] place-items-center rounded-md border bg-secondary">
        <Package size={96} strokeWidth={1.4} className="text-muted-foreground/50" />
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-full max-w-[420px] select-none overflow-hidden rounded-md border">
      {/* صحنهٔ سوییپ — کلیک (بدون درگ) تمام‌صفحه را باز می‌کند */}
      <div
        ref={(node) => {
          viewportRef.current = node;
          emblaRef(node);
        }}
        role="button"
        tabIndex={0}
        aria-label="گالری تصاویر محصول"
        className="h-full cursor-zoom-in touch-pan-y overflow-hidden outline-none"
        onPointerDown={onPointerDown}
        onClick={onStageClick}
        onKeyDown={onKeyDown}
      >
        <div className="flex h-full [backface-visibility:hidden]">
          {photos.map((ph, i) => (
            <div key={i} className="relative h-full min-w-0 flex-[0_0_100%]">
              <Image
                src={ph}
                alt={`${alt} — ${i + 1}`}
                fill
                sizes={sizes}
                priority={priority && i === 0}
                // اسلایدهای مجاور از قبل لود می‌شوند تا سوییپ بدون تصویرِ خالی باشد
                loading={i <= sel + 1 ? 'eager' : 'lazy'}
                draggable={false}
                className="bg-muted object-cover"
              />
            </div>
          ))}
        </div>
      </div>

      {/* نردبان روی گوشهٔ عکس (خواسته مالک ۱-۱۱) — واترمارک دیگر اینجا لازم
          نیست: الگوی قطری ایمچ موقع آپلود داخل پیکسل‌های خود عکس نشسته است
          (خواسته مالک ۸-۱۱ دور ۲۷ — ضدسرقت واقعی، همراه ذخیره/کپی می‌ماند) */}
      {isLadder && (
        <span className="pointer-events-none absolute left-0 top-0">
          <LadderBadge className="rounded-br-[6px] px-2.5 py-1.5 text-xs shadow-sm" />
        </span>
      )}
      {hasVideo && (
        <span className="pointer-events-none absolute bottom-2 end-2 rounded-sm bg-black/55 px-1.5 py-0.5 text-[10px] font-bold text-white backdrop-blur">
          ویدیو دارد
        </span>
      )}

      {multi && (
        <>
          {/* نقطه‌های جایگاه — نشانهٔ بصریِ «عکس بعدی هم هست» (بدون نوشته) */}
          <div className="absolute bottom-2.5 left-1/2 z-[2] -translate-x-1/2">
            <div className="flex items-center gap-1.5 rounded-full bg-black/40 px-2.5 py-1.5 backdrop-blur-sm">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`نمایش عکس ${i + 1}`}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={cn(
                    'h-1.5 rounded-full transition-all',
                    i === sel ? 'w-4 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/85',
                  )}
                />
              ))}
            </div>
          </div>

          {/* فلش‌های جهت — بعدی سمت چپ (RTL) */}
          {canNext && (
            <button
              type="button"
              aria-label="عکس بعدی"
              onClick={() => emblaApi?.scrollNext()}
              className={cn(ARROW_CLS, 'absolute end-2 top-1/2 z-[2] -translate-y-1/2')}
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {canPrev && (
            <button
              type="button"
              aria-label="عکس قبلی"
              onClick={() => emblaApi?.scrollPrev()}
              className={cn(ARROW_CLS, 'absolute start-2 top-1/2 z-[2] -translate-y-1/2')}
            >
              <ChevronRight size={20} />
            </button>
          )}
        </>
      )}

      {fullscreen && (
        <GalleryLightbox
          photos={photos}
          alt={alt}
          initialIndex={sel}
          onClose={closeFullscreen}
        />
      )}
    </div>
  );
}

/* ─────────────────────────── تمام‌صفحه ─────────────────────────── */

/** نمایش تمام‌صفحهٔ عکس — تپ/Esc/✕ می‌بندد؛ سوییپ و فلش‌ها همان گالری‌اند.
 *  تصویر با object-contain در کادرِ اندازه‌شدهٔ خودش می‌نشیند. واترمارک
 *  داخل خود فایل است (دور ۲۷) — لایهٔ نمایشی دیگر لازم نیست. */
function GalleryLightbox({
  photos,
  alt,
  initialIndex,
  onClose,
}: {
  photos: string[];
  alt: string;
  initialIndex: number;
  onClose: (index: number) => void;
}) {
  const multi = photos.length > 1;

  const options = useMemo(
    () => ({
      direction: 'rtl' as const,
      containScroll: 'trimSnaps' as const,
      watchDrag: multi,
      startIndex: initialIndex,
    }),
    [multi, initialIndex],
  );
  const [emblaRef, emblaApi] = useEmblaCarousel(options);
  const [sel, setSel] = useState(initialIndex);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  // اندازهٔ نمایش‌یافتهٔ هر عکس داخل صحنه (fit داخل viewport منهای پدینگ)
  const [dims, setDims] = useState<Record<number, { w: number; h: number }>>({});
  const naturalRef = useRef<Record<number, { nw: number; nh: number }>>({});
  const stageRef = useRef<HTMLDivElement | null>(null);

  const downRef = useRef<{ x: number; y: number } | null>(null);
  // onClose و sel در افکتِ mount-only — از طریق ref تا هویت پراپ/استیت اذیت نکند
  const onCloseRef = useRef(onClose);
  const selRef = useRef(sel);
  useEffect(() => {
    onCloseRef.current = onClose;
    selRef.current = sel;
  }, [onClose, sel]);

  useEffect(() => {
    if (!emblaApi) return;
    const sync = () => {
      setSel(emblaApi.selectedScrollSnap());
      setCanPrev(emblaApi.canScrollPrev());
      setCanNext(emblaApi.canScrollNext());
    };
    sync();
    emblaApi.on('select', sync).on('reInit', sync);
    return () => {
      emblaApi.off('select', sync).off('reInit', sync);
    };
  }, [emblaApi]);

  // قفل اسکرول بدنه + Esc
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current(selRef.current);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  // جای‌گیری هر عکس داخل صحنه (بدون کشیدگی) — با resize هم دوباره حساب می‌شود
  const fitAll = useCallback(() => {
    const st = stageRef.current;
    if (!st) return;
    const maxW = st.clientWidth - 32;
    const maxH = st.clientHeight - 32;
    if (maxW <= 0 || maxH <= 0) return;
    setDims((prev) => {
      const next = { ...prev };
      for (const [k, { nw, nh }] of Object.entries(naturalRef.current)) {
        const i = Number(k);
        const s = Math.min(maxW / nw, maxH / nh);
        const w = Math.round(nw * s);
        const h = Math.round(nh * s);
        if (!next[i] || next[i].w !== w || next[i].h !== h) next[i] = { w, h };
      }
      return next;
    });
  }, []);

  useEffect(() => {
    const st = stageRef.current;
    if (!st) return;
    const ro = new ResizeObserver(() => fitAll());
    ro.observe(st);
    return () => ro.disconnect();
  }, [fitAll]);

  const onImgLoad = useCallback(
    (i: number, img: HTMLImageElement) => {
      const nw = img.naturalWidth;
      const nh = img.naturalHeight;
      if (!nw || !nh) return;
      const prevNat = naturalRef.current[i];
      if (prevNat && prevNat.nw === nw && prevNat.nh === nh) return;
      naturalRef.current[i] = { nw, nh };
      fitAll();
    },
    [fitAll],
  );

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    downRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  // تپِ بی‌حرکت روی صحنه = بستن (درگ = سوییپ)
  const onStageClick = useCallback((e: React.MouseEvent) => {
    const d = downRef.current;
    if (!d) return;
    if (Math.abs(e.clientX - d.x) < 8 && Math.abs(e.clientY - d.y) < 8)
      onCloseRef.current(selRef.current);
  }, []);

  const onRootKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowLeft') emblaApi?.scrollNext();
      else if (e.key === 'ArrowRight') emblaApi?.scrollPrev();
    },
    [emblaApi],
  );

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onKeyDown={onRootKeyDown}
      className="fixed inset-0 z-[100] animate-in fade-in duration-150"
      style={{ background: 'rgba(0,0,0,0.96)' }}
    >
      {/* بستن — ✕ در بالا-آغاز (راستِ RTL) */}
      <button
        type="button"
        autoFocus
        aria-label="بستن نمایش تمام‌صفحه"
        onClick={() => onCloseRef.current(selRef.current)}
        className="absolute start-3 top-3 z-10 grid size-11 place-items-center rounded-full bg-black/45 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/70"
      >
        <X size={22} />
      </button>

      {/* صحنه — تپ می‌بندد، درگ سوییپ می‌کند */}
      <div ref={stageRef} className="absolute inset-0 p-4">
        <div
          ref={emblaRef}
          className="h-full cursor-zoom-out touch-pan-y overflow-hidden"
          onPointerDown={onPointerDown}
          onClick={onStageClick}
        >
          <div className="flex h-full [backface-visibility:hidden]">
            {photos.map((ph, i) => (
              <div key={i} className="grid h-full min-w-0 flex-[0_0_100%] place-items-center">
                <div
                  className="relative"
                  // قبل از محاسبهٔ اندازه: کل صحنه (object-contain خودش جای می‌شود)؛
                  // بعد از load → دقیقاً کادر عکس تا واترمارک روی خودش بنشیند
                  style={dims[i] ? { width: dims[i].w, height: dims[i].h } : { width: '100%', height: '100%' }}
                >
                  <Image
                    src={ph}
                    alt={`${alt} — ${i + 1}`}
                    fill
                    sizes="100vw"
                    priority={i === initialIndex}
                    loading={i <= sel + 1 ? 'eager' : 'lazy'}
                    draggable={false}
                    onLoad={(e) => onImgLoad(i, e.currentTarget)}
                    className="object-contain"
                  />
                  {/* واترمارک داخل خود فایل است (دور ۲۷) — لایهٔ نمایشی حذف شد */}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {multi && (
        <>
          <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
            <div className="flex items-center gap-2 rounded-full bg-black/45 px-3 py-2 shadow-sm backdrop-blur-sm">
              {photos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`نمایش عکس ${i + 1}`}
                  onClick={() => emblaApi?.scrollTo(i)}
                  className={cn(
                    'h-2 rounded-full transition-all',
                    i === sel ? 'w-5 bg-white' : 'w-2 bg-white/55 hover:bg-white/85',
                  )}
                />
              ))}
            </div>
          </div>

          {canNext && (
            <button
              type="button"
              aria-label="عکس بعدی"
              onClick={() => emblaApi?.scrollNext()}
              className="absolute end-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/70"
            >
              <ChevronLeft size={26} />
            </button>
          )}
          {canPrev && (
            <button
              type="button"
              aria-label="عکس قبلی"
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute start-3 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white shadow-sm backdrop-blur-sm transition hover:bg-black/70"
            >
              <ChevronRight size={26} />
            </button>
          )}
        </>
      )}
    </div>,
    document.body,
  );
}
