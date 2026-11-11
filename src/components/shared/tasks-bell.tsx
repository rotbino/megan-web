'use client';

/**
 * زنگولهٔ «کارهای مهم من» (خواستهٔ مالک ۱۱-۱۱ دور ۴):
 * هر کار مهمی که کاربر باید انجام بدهد و هنوز نکرده — پیگیری سرنخِ سررسیده،
 * احراز هویت، تکمیل پروفایل، اولین آگهی/درخواست — با بج شمارنده روی زنگوله
 * یادآوری می‌شود و تا انجام نشود غیب نمی‌شود (تسک‌ها stateless از وضعیت
 * واقعی محاسبه می‌شوند، پس «انجام دادن» همان کار خودش بج را می‌اندازد).
 *
 * دسکتاپ: دراپ‌داون زیر زنگوله؛ موبایل: بات‌شیت از پایین (قانون موبایل ایمچ).
 * دو بریک‌پوینت پشتیبانی می‌شود: nav-desktop (هدر سایت، ۹۹۲px) و lg (پنل،
 * ۱۰۲۴px) — چون پوستهٔ پنل با lg و هدر عمومی با nav-desktop کار می‌کند.
 *
 * مصارف: هدر سایت (دسکتاپ: آیکون+برچسب مثل پیام‌ها / موبایل: فقط آیکون)
 * و هدر پنل (موبایل و دسکتاپ: آیکون).
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  BellRing,
  CheckCircle2,
  ChevronLeft,
  FilePlus2,
  ListTodo,
  PackagePlus,
  ShieldCheck,
  UserRoundPen,
  X,
} from 'lucide-react';
import { useAuth } from '@/lib/mock/auth';
import { useMyTasks } from '@/lib/mock/hooks';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { UserTask } from '@/lib/types';

type TaskIcon = typeof Bell;

/** آیکون و رنگ کاشی هر تسک — کلیدهای بک‌اند؛ ناشناخته = لیستوی خاکستری */
const TASK_META: Record<string, { icon: TaskIcon; tone: string }> = {
  follow_due_buy: { icon: BellRing, tone: 'bg-amber-100 text-amber-600' },
  follow_due_sell: { icon: BellRing, tone: 'bg-amber-100 text-amber-600' },
  verify: { icon: ShieldCheck, tone: 'bg-sky-100 text-sky-600' },
  profile: { icon: UserRoundPen, tone: 'bg-violet-100 text-violet-600' },
  first_product: { icon: PackagePlus, tone: 'bg-emerald-100 text-emerald-600' },
  first_request: { icon: FilePlus2, tone: 'bg-emerald-100 text-emerald-600' },
};
const TASK_FALLBACK: { icon: TaskIcon; tone: string } = {
  icon: ListTodo,
  tone: 'bg-secondary text-muted-foreground',
};

/** بج شمارندهٔ تسک‌ها — هم‌خانوادهٔ بج پیام‌ها (قرمز، فارسی، سقف ۹۹+) */
function TasksBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      role="status"
      aria-label={`${toFa(count)} کار مهم مانده`}
      className="pointer-events-none absolute -top-1.5 -end-1.5 grid h-[17px] min-w-[17px] place-items-center rounded-full border-2 border-card bg-red-500 px-1 text-[10px] font-bold leading-none text-white"
    >
      {count > 99 ? '۹۹+' : toFa(count)}
    </span>
  );
}

/** محتوای مشترک دراپ‌داون/شیت — فهرست تسک‌ها + حالت خالی + پانوشت */
function TasksList({ tasks, onGo }: { tasks: UserTask[]; onGo: (href: string) => void }) {
  if (tasks.length === 0) {
    return (
      <div className="p-6 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-emerald-50 text-emerald-500">
          <CheckCircle2 size={24} />
        </span>
        <p className="mt-3 text-sm font-bold">هیچ کار مهمی مانده نیست</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">
          کارهای مهم بعدی‌تان — مثل پیگیری سرنخ‌ها — همین‌جا اعلام می‌شود.
        </p>
      </div>
    );
  }
  return (
    <div>
      <ul className="max-h-[62vh] overflow-y-auto p-1.5">
        {tasks.map((t) => {
          const meta = TASK_META[t.key] ?? TASK_FALLBACK;
          const Icon = meta.icon;
          return (
            <li key={t.key}>
              <button
                type="button"
                onClick={() => onGo(t.href)}
                className="flex w-full items-start gap-3 rounded-md p-2.5 text-start transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg', meta.tone)}>
                  <Icon size={19} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="text-[13px] font-bold leading-5">{t.title}</span>
                    {typeof t.count === 'number' && t.count > 0 && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-1.5 py-0.5 font-num text-[11px] font-bold text-amber-700">
                        {toFa(t.count)}
                      </span>
                    )}
                  </span>
                  <span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">
                    {t.description}
                  </span>
                </span>
                <ChevronLeft size={16} className="mt-2.5 shrink-0 text-muted-foreground" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="border-t border-border/60 px-3.5 py-2.5 text-[11px] leading-5 text-muted-foreground">
        هر کار را که انجام دهید از این فهرست حذف می‌شود — تا تمام نشود، زنگوله یادتان می‌اندازد.
      </p>
    </div>
  );
}

export function TasksBell({
  /** بریک‌پوینت دسکتاپ: هدر سایت nav-desktop (۹۹۲px)، پوستهٔ پنل lg (۱۰۲۴px) */
  breakpoint = 'nav-desktop',
  /** حالت ستونی آیکون+برچسب (نوار کاربر هدر سایت) — پیش‌فرض فقط آیکون */
  showLabel = false,
  /** استایل دکمهٔ آیکونی: card = کاشی بوردر‌دار (پنل)، plain = دایرهٔ ساده (هدر موبایل) */
  variant = 'card',
  /** کلاس اضافهٔ والد (مثلاً ms-auto برای چسباندن به انتهای هدر پنل) */
  className,
}: {
  breakpoint?: 'nav-desktop' | 'lg';
  showLabel?: boolean;
  variant?: 'card' | 'plain';
  className?: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { data } = useMyTasks(Boolean(user));
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const tasks = data ?? [];
  const count = tasks.length;
  const sheetHidden = breakpoint === 'lg' ? 'lg:hidden' : 'nav-desktop:hidden';
  const dropVisible = breakpoint === 'lg' ? 'hidden lg:block' : 'hidden nav-desktop:block';

  /** کلیک روی تسک → دقیقاً همان فرم/صفحه‌ای که کار باید آنجا انجام شود */
  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const label = count > 0 ? `کارهای مهم من — ${toFa(count)} کار مانده` : 'کارهای مهم من';

  const iconBtnClass =
    variant === 'plain'
      ? 'relative grid size-9 shrink-0 place-items-center rounded-full text-foreground transition-colors hover:bg-secondary'
      : 'relative grid size-9 shrink-0 place-items-center rounded-lg border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground';

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        title="کارهای مهم من"
        className={showLabel ? 'flex min-w-20 flex-col items-center rounded-md px-2.5 py-1 text-sm text-secondary-foreground transition-colors hover:bg-accent hover:text-foreground' : iconBtnClass}
      >
        {showLabel ? (
          <>
            <span className="relative">
              <Bell size={24} />
              <TasksBadge count={count} />
            </span>
            <span className="mt-1">کارها</span>
          </>
        ) : (
          <>
            <Bell size={18} />
            <TasksBadge count={count} />
          </>
        )}
      </button>

      {open && (
        <>
          {/* کلیک بیرون = بستن (لایهٔ نامرئی زیر دراپ‌داون، بالای محتوای صفحه) */}
          <button
            type="button"
            aria-hidden
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className={cn('fixed inset-0 z-40 cursor-default', dropVisible)}
          />
          {/* دراپ‌داون دسکتاپ — زیر زنگوله، هم‌عرض محتوا */}
          <div
            className={cn(
              'absolute end-0 top-full z-50 mt-2 w-[340px] max-w-[calc(100vw-24px)] overflow-hidden rounded-lg border bg-popover shadow-lg',
              dropVisible,
            )}
          >
            <div className="flex items-center gap-2 border-b border-border/60 px-3.5 py-3">
              <BellRing size={16} className="text-amber-500" />
              <h2 className="text-sm font-extrabold">کارهای مهم من</h2>
              {count > 0 && (
                <span className="ms-auto rounded-full bg-red-500 px-2 py-0.5 font-num text-[11px] font-bold leading-none text-white">
                  {toFa(count)}
                </span>
              )}
            </div>
            <TasksList tasks={tasks} onGo={go} />
          </div>

          {/* بات‌شیت موبایل — قانون موبایل ایمچ (از پایین صفحه) */}
          <div className={cn('fixed inset-0 z-[60]', sheetHidden)} role="dialog" aria-modal="true" aria-label="کارهای مهم من">
            <div className="animate-sheet-fade absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
            <div className="animate-sheet-up absolute inset-x-0 bottom-0 flex max-h-[82vh] flex-col rounded-t-2xl bg-card shadow-2xl">
              <span className="mx-auto mt-2 h-1 w-10 shrink-0 rounded-full bg-border" aria-hidden />
              <div className="flex shrink-0 items-center gap-2 border-b border-border/70 px-3 py-3">
                <BellRing size={17} className="text-amber-500" />
                <h2 className="min-w-0 flex-1 truncate px-1 text-base font-bold">کارهای مهم من</h2>
                {count > 0 && (
                  <span className="rounded-full bg-red-500 px-2 py-0.5 font-num text-[11px] font-bold leading-none text-white">
                    {toFa(count)}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="بستن"
                  className="grid size-8 shrink-0 place-items-center rounded-lg text-foreground hover:bg-accent"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="min-h-0 flex-1 overscroll-contain overflow-y-auto p-1 pb-6">
                <TasksList tasks={tasks} onGo={go} />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
