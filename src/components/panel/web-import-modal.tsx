'use client';

/**
 * مدال «ثبت گروهی محصول» (خواستهٔ مالک ۱۸-۱۱) — تنها برای کاربران واجد
 * شرایط (اعضای سابقِ از پیش ثبت‌شده؛ دکمهٔ ورودی در صفحهٔ محصولات است).
 *
 * سه نما:
 *   choose  — انتخاب روش: «ایمپورت از وب» (اصلی)، «به‌روزرسانی قیمت و
 *             موجودی از وب»، «ایمپورت از فایل اکسل» (به‌زودی)
 *   running — نوار درصد + فاز جاری + گزارش زنده + شمارنده‌ها؛ حلقهٔ
 *             step سمت کلاینت می‌چرخد (هر گام در بک ≤ ~۱۰ث)
 *   done    — پیام پایانی (جملهٔ دقیق مالک) + خلاصهٔ اعداد؛ بازگشت به لیست
 *
 * ⚠️ هیچ‌جا نام منبع (باسکول) نمی‌آید — کاربر حس می‌کند ایمچ کل وب را
 * برایش می‌گردد. خطاها هم عمومی‌اند («اتصال به وب…»).
 */

import { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  Globe,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { startWebImport, stepWebImport } from '@/lib/mock/api';
import { toFa } from '@/lib/format';
import type { WebImportMode, WebImportProgress } from '@/lib/types';
import { cn } from '@/lib/utils';

type View = 'choose' | 'running' | 'done' | 'failed';

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** متن فاز — بدون هیچ اشاره‌ای به منبع */
function phaseText(p: WebImportProgress): string {
  switch (p.phase) {
    case 'search':
      return 'در حال جستجوی کالاهای شما در سطح وب…';
    case 'profile':
      return 'در حال تکمیل اطلاعات پروفایل و کسب‌وکار شما…';
    case 'gallery':
      return 'در حال دریافت تصاویر کسب‌وکار…';
    case 'products':
      return p.total > 0
        ? `در حال جمع‌آوری کالاها از وب… (${toFa(p.processed)} از ${toFa(p.total)})`
        : 'در حال جمع‌آوری کالاها از وب…';
    default:
      return 'در حال جمع‌آوری…';
  }
}

export function WebImportModal({
  open,
  onClose,
  onFinished,
}: {
  open: boolean;
  onClose: () => void;
  /** بعد از اتمام موفق — صفحه لیست/پروفایل را تازه می‌کند و تب را هدایت می‌کند */
  onFinished?: (counters: WebImportProgress['counters']) => void;
}) {
  const queryClient = useQueryClient();
  const [view, setView] = useState<View>('choose');
  const [progress, setProgress] = useState<WebImportProgress | null>(null);
  const [pausing, setPausing] = useState(false); // خطای پیاپی — توقف با تلاش دوبارهٔ دستی
  const aliveRef = useRef(true);
  const loopingRef = useRef(false);

  // بازشدن مدال → نمای انتخاب؛ بسته‌شدن → حلقهٔ گام با unmount متوقف می‌شود
  useEffect(() => {
    if (open) {
      setView('choose');
      setProgress(null);
      setPausing(false);
    }
  }, [open]);

  // نبض حیات حلقه — با بسته‌شدن مدال (unmount) false می‌شود
  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  /** حلقهٔ گام‌ها تا done/failed — با توقف خودکار بعد از خطاهای پیاپی */
  const runLoop = async () => {
    if (loopingRef.current) return;
    loopingRef.current = true;
    let fails = 0;
    try {
      for (let guard = 0; guard < 600; guard++) {
        if (!aliveRef.current) return;
        let p: WebImportProgress;
        try {
          p = await stepWebImport();
          fails = 0;
        } catch {
          // خطای شبکه/سرور — چند بار خودمان دوباره می‌پرسیم
          if (++fails >= 5) {
            if (!aliveRef.current) return;
            setPausing(true);
            return;
          }
          await sleep(2500);
          continue;
        }
        if (!aliveRef.current) return;
        setProgress(p);
        if (p.status === 'done') {
          setView('done');
          queryClient.invalidateQueries({ queryKey: ['panel-my-products'] });
          queryClient.invalidateQueries({ queryKey: ['panel-profile'] });
          onFinished?.(p.counters);
          return;
        }
        if (p.status === 'failed' || p.status === 'missing') {
          setView(p.status === 'failed' ? 'failed' : 'done');
          return;
        }
        if (p.retry) {
          if (++fails >= 5) {
            setPausing(true);
            return;
          }
          await sleep(2500);
          continue;
        }
        await sleep(450);
      }
    } finally {
      loopingRef.current = false;
    }
  };

  /** شروع (یا ادامهٔ جلسهٔ در جریان) */
  const start = async (mode: WebImportMode) => {
    setView('running');
    setPausing(false);
    try {
      const p = await startWebImport(mode);
      setProgress(p);
      if (p.status === 'running') {
        void runLoop();
      } else if (p.status === 'done' || p.status === 'missing') {
        setView('done');
      } else {
        setView('failed');
      }
    } catch {
      setView('failed');
      setProgress(null);
    }
  };

  const retry = () => {
    setPausing(false);
    void runLoop();
  };

  const c = progress?.counters;
  const foundNothing = view === 'done' && (c?.found ?? 0) === 0;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="rounded-lg sm:max-w-md">
        <DialogHeader className="space-y-0">
          <DialogTitle className="flex items-center gap-2 text-base font-extrabold">
            {view === 'choose' && <Globe size={18} className="text-emphasis" />}
            {view === 'running' && <Loader2 size={18} className="animate-spin text-emphasis" />}
            {view === 'done' && !foundNothing && <CheckCircle2 size={18} className="text-emerald-600" />}
            {view === 'done' && foundNothing && <Globe size={18} className="text-muted-foreground" />}
            {view === 'failed' && <AlertTriangle size={18} className="text-red-500" />}
            {view === 'choose' ? 'ثبت گروهی محصول' : view === 'running' ? 'در حال جمع‌آوری از وب' : view === 'done' ? (foundNothing ? 'جستجو کامل شد' : 'ایمپورت انجام شد') : 'جمع‌آوری کامل نشد'}
          </DialogTitle>
        </DialogHeader>

        {/* ─── نمای انتخاب ─── */}
        {view === 'choose' && (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => void start('full')}
              className="group flex w-full items-start gap-3 rounded-lg border border-emphasis/30 bg-emphasis-soft p-4 text-start transition-colors hover:border-emphasis/60 hover:bg-emphasis/10"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-emphasis text-emphasis-foreground shadow-[0_2px_8px_rgba(249,115,22,0.35)]">
                <Globe size={20} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold text-emphasis-deep">ایمپورت از وب</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  کالاهایتان را در سطح وب می‌گردانیم و با قیمت، موجودی، حداقل سفارش و تصاویر، یک‌جا به ایمچ اضافه می‌کنیم.
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => void start('prices')}
              className="group flex w-full items-start gap-3 rounded-lg border bg-card p-4 text-start transition-colors hover:border-primary/40"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-foreground">
                <RefreshCw size={18} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-extrabold">به‌روزرسانی قیمت و موجودی از وب</span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  آخرین قیمت، حداقل سفارش و موجودی کالاهای فعلی‌تان از وب خوانده و در ایمچ به‌روز می‌شود.
                </span>
              </span>
            </button>

            <div
              aria-disabled
              className="flex w-full cursor-not-allowed items-start gap-3 rounded-lg border border-dashed bg-card/50 p-4 opacity-60"
              title="به‌زودی"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground">
                <FileSpreadsheet size={18} />
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-sm font-extrabold text-muted-foreground">
                  ایمپورت از فایل اکسل
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold">به‌زودی</span>
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  کالاهایتان را از فایل اکسل بارگذاری و یک‌جا ثبت کنید.
                </span>
              </span>
            </div>
          </div>
        )}

        {/* ─── نمای پیشرفت ─── */}
        {view === 'running' && progress && (
          <div className="space-y-4">
            {/* نوار درصد */}
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">{phaseText(progress)}</span>
                <span className="font-num text-emphasis">{toFa(Math.min(100, progress.percent))}٪</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-emphasis to-emphasis-deep transition-[width] duration-700 ease-out"
                  style={{ width: `${Math.max(3, Math.min(100, progress.percent))}%` }}
                />
              </div>
            </div>

            {/* شمارنده‌ها */}
            <div className="flex flex-wrap gap-2 text-[11px] font-bold">
              {c && c.found > 0 && (
                <span className="rounded-full bg-secondary px-2.5 py-1">
                  {toFa(c.found)} کالا پیدا شد
                </span>
              )}
              {c && c.created > 0 && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                  {toFa(c.created)} کالای جدید
                </span>
              )}
              {c && c.updated + c.reassigned > 0 && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-primary">
                  {toFa(c.updated + c.reassigned)} به‌روز
                </span>
              )}
              {c && c.imagesDone > 0 && (
                <span className="rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
                  {toFa(c.imagesDone)} تصویر
                </span>
              )}
            </div>

            {/* گزارش زنده */}
            <div className="max-h-28 space-y-1 overflow-y-auto rounded-md border bg-secondary/40 p-2.5" dir="rtl">
              {progress.log.slice(-4).map((l, i, arr) => (
                <p
                  key={`${l}-${i}`}
                  className={cn('text-[11px] leading-5', i === arr.length - 1 ? 'font-bold text-foreground' : 'text-muted-foreground')}
                >
                  {l}
                </p>
              ))}
            </div>

            {pausing ? (
              <div className="flex items-center justify-between gap-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
                <p className="text-xs font-bold text-amber-700">اتصال به وب دچار وقفه شده است.</p>
                <Button type="button" size="sm" onClick={retry} className="h-8 rounded-md bg-amber-500 px-3 text-xs text-white hover:bg-amber-600">
                  <RefreshCw size={13} /> تلاش دوباره
                </Button>
              </div>
            ) : (
              <p className="text-center text-[11px] text-muted-foreground">
                این پنجره را نبندید؛ جمع‌آوری چند لحظه طول می‌کشد.
              </p>
            )}
          </div>
        )}

        {/* ─── نمای پایان ─── */}
        {view === 'done' && (
          <div className="space-y-4">
            {foundNothing ? (
              <p className="text-sm leading-6">
                کالایی برای شما در وب پیدا نشد. می‌توانید محصول جدید را همین حالا ثبت کنید.
              </p>
            ) : (
              <>
                {/* پیام پایانی — جملهٔ دقیق مالک؛ آخرین خط گزارش بک‌اند */}
                <p className="text-sm font-bold leading-6">
                  {c && c.found > 0
                    ? progress?.log[progress.log.length - 1] ??
                      'کالاهای شما از سطح اینترنت جمع‌آوری و ایمپورت شد. اکنون می‌توانید قیمت، موجودی و مشخصات کالای خود را به‌روز کنید.'
                    : 'جمع‌آوری تمام شد.'}
                </p>
                {c && (c.created > 0 || c.updated + c.reassigned > 0) && (
                  <div className="flex flex-wrap gap-2 text-[11px] font-bold">
                    {c.created > 0 && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700">
                        {toFa(c.created)} کالای جدید (در انتظار تایید)
                      </span>
                    )}
                    {c.updated + c.reassigned > 0 && (
                      <span className="rounded-full bg-secondary px-2.5 py-1">
                        {toFa(c.updated + c.reassigned)} کالا به‌روز
                      </span>
                    )}
                    {c.imagesDone > 0 && (
                      <span className="rounded-full bg-secondary px-2.5 py-1 text-muted-foreground">
                        {toFa(c.imagesDone)} تصویر ذخیره شد
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-md text-xs" onClick={onClose}>
                بستن
              </Button>
              <Button type="button" size="sm" className="rounded-md bg-emphasis text-xs text-emphasis-foreground hover:bg-emphasis-deep" onClick={onClose}>
                مشاهده کالاها
              </Button>
            </div>
          </div>
        )}

        {/* ─── نمای خطا ─── */}
        {view === 'failed' && (
          <div className="space-y-4">
            <p className="text-sm leading-6">
              {progress?.message ?? 'جمع‌آوری از وب کامل نشد؛ لطفاً کمی بعد دوباره تلاش کنید.'}
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" className="rounded-md text-xs" onClick={onClose}>
                بستن
              </Button>
              <Button
                type="button"
                size="sm"
                className="rounded-md bg-emphasis text-xs text-emphasis-foreground hover:bg-emphasis-deep"
                onClick={() => void start(progress?.mode ?? 'full')}
              >
                <RefreshCw size={13} /> شروع دوباره
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
