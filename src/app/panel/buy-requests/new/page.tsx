'use client';

/**
 * ثبت درخواست خرید — ویزارد ۲ مرحله‌ای عین باسکول (MHTML «ثبت درخواست خرید ۱ و ۲»):
 * مرحله ۱: انتخاب دسته بندی (کاسکید مشترک با ثبت محصول) + چیپ مسیر + «انتخاب و ادامه» / «پاک کردن»
 * مرحله ۲: نوع کالا (مثال هر دسته) + میزان نیازمندی (بادکنک تبدیل به تن!) +
 *           سابقه خرید عمده (بله/خیر) + هدف (قیمت و خرید سریع / فقط اطلاع از قیمت) + «ثبت درخواست» / «مرحله قبل»
 * نتیجه: «در انتظار تایید» — ذخیره در بک‌اند و قابل مشاهده در «درخواست های من».
 */

import { useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, PartyPopper, RotateCcw } from 'lucide-react';
import { ProductStepper } from '@/components/panel/product-form/stepper';
import { CategoryCascade } from '@/components/panel/product-form/category-cascade';
import { PanelCard } from '@/components/panel/panel-parts';
import { UnitInput } from '@/components/shared/unit-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSubmitPanelBuyRequest } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { Category } from '@/lib/types';

const BUY_REQUEST_STEPS = ['انتخاب دسته بندی', 'اطلاعات درخواست'] as const;

const num = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0;

interface Draft {
  path: Category[];
  leaf: Category | null;
  productType: string;
  amount: string;
  hasHistory: 'yes' | 'no' | null;
  goal: 'price_and_buy' | 'price_only' | null;
}

const EMPTY_DRAFT: Draft = {
  path: [],
  leaf: null,
  productType: '',
  amount: '',
  hasHistory: null,
  goal: null,
};

export default function RegisterBuyRequestPage() {
  const submit = useSubmitPanelBuyRequest();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const goTo = (s: number) => {
    setStep(s);
    setMaxReached((m) => Math.max(m, s));
    setError('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stepError = (s: number): string | null => {
    const leaf = draft.leaf;
    if (s === 0 && !leaf) return 'دسته بندی محصول خود را انتخاب کنید.';
    if (s === 1) {
      if (!draft.productType.trim() && leaf?.example) return `نوع ${leaf.categoryName} مورد نیاز خود را وارد کنید.`;
      if (num(draft.amount) < 1) return 'میزان نیازمندی محصول را وارد کنید.';
      if (num(draft.amount) < (leaf?.min ?? 100)) {
        return `حداقل میزان درخواست ${leaf?.categoryName ?? 'کالا'} ${((leaf?.min ?? 100) as number).toLocaleString('fa-IR')} ${leaf?.unit ?? 'کیلوگرم'} است (مقیاس خرده قابل قبول نیست).`;
      }
      if (!draft.hasHistory) return 'سابقه خرید عمده را انتخاب کنید.';
      if (!draft.goal) return 'انتخاب «به دنبال چه هستید؟» را مشخص کنید.';
    }
    return null;
  };

  const next = () => {
    const err = stepError(step);
    if (err) {
      setError(err);
      return;
    }
    if (step === 1) {
      submit.mutate(
        {
          subCategoryId: draft.leaf!.id,
          productType: draft.productType.trim(),
          requirementAmount: num(draft.amount),
          goal: draft.goal!,
          hasHistory: draft.hasHistory === 'yes',
        },
        {
          onSuccess: () => setDone(true),
          onError: () => toast({ description: 'ثبت درخواست ناموفق بود، دوباره تلاش کنید.' }),
        },
      );
      return;
    }
    goTo(1);
  };

  // ─── صفحه موفقیت ───
  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        <PanelCard className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <PartyPopper size={28} />
          </span>
          <h1 className="mt-4 text-base font-extrabold">درخواست خرید شما با موفقیت ثبت شد</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            درخواست «{draft.leaf?.categoryName} {draft.productType}» ثبت شد و پس از بررسی کارشناسان ایمچ، برای
            فروشندگان هم‌کالا ارسال می‌شود.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => {
                setDraft(EMPTY_DRAFT);
                setStep(0);
                setMaxReached(0);
                setDone(false);
                if (typeof window !== 'undefined') window.scrollTo({ top: 0 });
              }}
            >
              <RotateCcw size={15} /> ثبت درخواست دیگر
            </Button>
            <Button asChild className="rounded-md">
              <Link href="/panel/my-requests">درخواست های من</Link>
            </Button>
          </div>
        </PanelCard>
      </div>
    );
  }

  const leaf = draft.leaf;
  const unit = leaf?.unit ?? 'کیلوگرم';

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div>
        <h1 className="text-lg font-extrabold">ثبت درخواست خرید</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {step === 0
            ? 'برای ثبت درخواست خرید ابتدا دسته بندی محصول خود را انتخاب کنید.'
            : 'اطلاعات محصول مورد نیاز خود را وارد کنید.'}
        </p>
      </div>

      <ProductStepper
        current={step}
        maxReached={maxReached}
        onJump={goTo}
        steps={BUY_REQUEST_STEPS}
        ariaLabel="مراحل ثبت درخواست خرید"
      />

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</p>
      )}

      {/* ─── مرحله ۱: انتخاب دسته بندی ─── */}
      {step === 0 && (
        <PanelCard>
          <p className="text-sm font-bold">به دنبال خرید عمده چه محصولی هستید؟</p>
          <div className="mt-4">
            <CategoryCascade
              value={{ path: draft.path, leaf: draft.leaf }}
              onChange={(v) => patch({ path: v.path, leaf: v.leaf, productType: '' })}
            />
          </div>

          {draft.path.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-md bg-secondary/60 px-3 py-2 text-xs">
              <span className="text-muted-foreground">دسته بندی انتخابی شما:</span>
              {draft.path.map((c) => (
                <span key={c.id} className="font-bold">
                  {c.categoryName}
                </span>
              ))}
            </div>
          )}

          <div className="mt-5 flex flex-wrap gap-2">
            <Button className="rounded-md" onClick={next} disabled={!leaf}>
              انتخاب و ادامه
            </Button>
            {draft.path.length > 0 && (
              <Button
                variant="outline"
                className="rounded-md"
                onClick={() => {
                  setDraft(EMPTY_DRAFT);
                  setError('');
                }}
              >
                پاک کردن
              </Button>
            )}
          </div>
        </PanelCard>
      )}

      {/* ─── مرحله ۲: اطلاعات درخواست ─── */}
      {step === 1 && (
        <PanelCard>
          <div className="space-y-5">
            {/* نوع کالا */}
            <div className="space-y-1.5">
              <Label htmlFor="buy-req-type">
                نوع <span className="font-bold">{leaf?.categoryName}</span> مورد نیاز
              </Label>
              <Input
                id="buy-req-type"
                value={draft.productType}
                onChange={(e) => patch({ productType: e.target.value })}
                placeholder={leaf?.example ? `مثال: ${leaf.example}` : 'نوع کالای مورد نیاز خود را وارد کنید.'}
                className="rounded-md"
                autoFocus
              />
            </div>

            {/* میزان نیازمندی — با بادکنک تبدیل به تن */}
            <div className="space-y-1.5">
              <Label htmlFor="buy-req-amount">
                میزان نیازمندی محصول <span className="text-muted-foreground">({unit})</span>{' '}
                <span className="text-red-500">*</span>
              </Label>
              <UnitInput
                id="buy-req-amount"
                kind="weight"
                unit={unit}
                value={draft.amount}
                onValueChange={(v) => patch({ amount: v })}
                placeholder="مثال: 50,000"
                invalid={Boolean(error && num(draft.amount) < 1)}
              />
              <p className="text-[11px] text-muted-foreground">مقیاس خرده‌فروشی قابل قبول نیست — عمده بخرید، ارزان‌تر بخرید.</p>
            </div>

            {/* سابقه خرید عمده */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-bold">
                آیا سابقه خرید عمده <span className="font-bold">{leaf?.categoryName}</span> را دارید؟
              </legend>
              <div className="flex gap-2">
                {(
                  [
                    { key: 'yes', label: 'بله' },
                    { key: 'no', label: 'خیر' },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={draft.hasHistory === key}
                    onClick={() => patch({ hasHistory: key })}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 rounded-md border px-3 py-2.5 text-sm transition-colors',
                      draft.hasHistory === key
                        ? 'border-primary bg-primary/5 font-bold text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-foreground/30',
                    )}
                  >
                    {draft.hasHistory === key && <CheckCircle2 size={16} />}
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>

            {/* به دنبال چه هستید؟ */}
            <fieldset className="space-y-2">
              <legend className="text-sm font-bold">به دنبال چه هستید؟</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(
                  [
                    { key: 'price_and_buy', label: `اطلاع از قیمت عمده و خرید سریع ${leaf?.categoryName}` },
                    { key: 'price_only', label: 'فقط اطلاع از قیمت عمده' },
                  ] as const
                ).map(({ key, label }) => (
                  <button
                    key={key}
                    type="button"
                    role="radio"
                    aria-checked={draft.goal === key}
                    onClick={() => patch({ goal: key })}
                    className={cn(
                      'flex items-center gap-2 rounded-md border px-3 py-2.5 text-start text-sm leading-6 transition-colors',
                      draft.goal === key
                        ? 'border-primary bg-primary/5 font-bold text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-foreground/30',
                    )}
                  >
                    <span
                      className={cn(
                        'grid size-4 shrink-0 place-items-center rounded-full border',
                        draft.goal === key ? 'border-primary' : 'border-muted-foreground/40',
                      )}
                    >
                      {draft.goal === key && <span className="size-2 rounded-full bg-primary" />}
                    </span>
                    {label}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <Button className="rounded-md" onClick={next} disabled={submit.isPending}>
              {submit.isPending && <Loader2 size={16} className="animate-spin" />}
              {submit.isPending ? 'در حال ثبت…' : 'ثبت درخواست'}
            </Button>
            <Button variant="outline" className="rounded-md" onClick={() => goTo(0)} disabled={submit.isPending}>
              مرحله قبل
            </Button>
          </div>
        </PanelCard>
      )}
    </div>
  );
}
