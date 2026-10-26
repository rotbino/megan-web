'use client';

/**
 * ثبت محصول — ویزارد شش مرحله‌ای عین باسکول:
 * ۱ انتخاب دسته بندی → ۲ اطلاعات محصول (نوع کالا + استان/شهر مبدا) →
 * ۳ موجودی و قیمت → ۴ بارگذاری تصویر → ۵ توضیحات محصول → ۶ جزئیات نهایی (ثبت نهایی).
 * قواعد دقیق باسکول: حداکثر ۴ تصویر jpeg/jpg زیر ۵ مگ، بالای ۲۰ کیلوبایت و ...
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ImageIcon,
  ImagePlus,
  PartyPopper,
  Plus,
  RotateCcw,
  Trash2,
  TrendingUp,
} from 'lucide-react';
import { useCities, useMyProducts, usePanelProfile, useProvinces, useSubmitProduct } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductStepper } from '@/components/panel/product-form/stepper';
import { CategoryCascade } from '@/components/panel/product-form/category-cascade';
import { PanelCard } from '@/components/panel/panel-parts';
import { UnitInput } from '@/components/shared/unit-input';
import { PRODUCT_FEATURE_KEYS } from '@/lib/mock/data';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Category, ProductFeature } from '@/lib/types';

// ─── ورودی عددی — از این پس همه‌جا UnitInput (وسط‌چین + بادکنک تبدیل واحد) ──

const num = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0;

interface Draft {
  path: Category[];
  leaf: Category | null;
  productType: string;
  provinceId: string;
  cityId: string;
  stock: string;
  minSaleAmount: string;
  minSalePrice: string;
  photos: { id: number; url: string; file: File }[];
  description: string;
  features: ProductFeature[];
}

const EMPTY_DRAFT: Draft = {
  path: [],
  leaf: null,
  productType: '',
  provinceId: '',
  cityId: '',
  stock: '',
  minSaleAmount: '',
  minSalePrice: '',
  photos: [],
  description: '',
  features: [],
};

const IMAGE_RULES = [
  'فقط تصاویر مرتبط با محصول را بارگذاری کنید.',
  'از درج شماره تماس یا لوگو بر روی تصاویر خودداری کنید.',
  'حداکثر مجاز به انتخاب ۴ تصویر هستید.',
  'حجم هر تصویر باید کمتر از 5 مگابایت باشد.',
  'تصویر از نوع jpeg یا jpg باشد.',
];

export default function RegisterProductPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { data: mine } = useMyProducts();
  const { data: provinces } = useProvinces();
  const { data: profile } = usePanelProfile();
  const submit = useSubmitProduct();

  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: cities } = useCities(num(draft.provinceId) || undefined);

  // ─── پیش‌پر کردن استان/شهر از پروفایل کاربر (خواسته مالک) ───
  // الگوی تنظیم state هنگام رندر (مثل فرم ویرایش پروفایل) — فقط وقتی
  // کاربر خودش چیزی انتخاب نکرده؛ هر وقت خواست عوض می‌کند.
  if (draft.provinceId === '' && draft.cityId === '' && profile?.userInfo.provinceId != null) {
    const pid = profile.userInfo.provinceId;
    const cid = profile.userInfo.cityId;
    setDraft((d) =>
      d.provinceId || d.cityId
        ? d
        : {
            ...d,
            provinceId: String(pid),
            ...(cid != null ? { cityId: String(cid) } : {}),
          },
    );
  }

  const patch = (p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p }));

  const goTo = (s: number) => {
    setStep(s);
    setMaxReached((m) => Math.max(m, s));
    setError('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ─── اعتبارسنجی هر مرحله ───
  const stepError = (s: number): string | null => {
    const leaf = draft.leaf;
    if (s === 0 && !leaf) return 'دسته بندی محصول را انتخاب کنید.';
    if (s === 1) {
      if (!draft.productType.trim()) return `نوع ${leaf?.categoryName ?? 'کالا'} خود را وارد کنید.`;
      if (!draft.provinceId) return 'استان مبدا را انتخاب کنید.';
      if (!draft.cityId) return 'شهر مبدا را انتخاب کنید.';
    }
    if (s === 2) {
      if (num(draft.stock) < 1) return 'میزان موجودی محصول را وارد کنید.';
      if (num(draft.minSaleAmount) < 1) return 'حداقل میزان فروش را وارد کنید.';
      if (num(draft.minSaleAmount) > num(draft.stock)) return 'حداقل میزان فروش نمی‌تواند از موجودی بیشتر باشد.';
      if (num(draft.minSalePrice) < 1000) return 'قیمت صحیح را وارد کنید.';
    }
    if (s === 3 && draft.photos.length === 0) return 'حداقل یک تصویر برای محصول بارگذاری کنید.';
    if (s === 4 && draft.description.trim().length < 30) return 'توضیحات محصول را کامل‌تر بنویسید (حداقل ۳۰ حرف).';
    return null;
  };

  const next = () => {
    const err = stepError(step);
    if (err) {
      setError(err);
      return;
    }
    if (step < 5) goTo(step + 1);
    else void finalize();
  };

  const finalize = async () => {
    const err = stepError(5);
    if (err) {
      setError(err);
      return;
    }
    try {
      await submit.mutateAsync({
        productName: `${draft.leaf!.categoryName} ${draft.productType.trim()}`,
        subCategoryId: draft.leaf!.id,
        provinceId: num(draft.provinceId),
        cityId: num(draft.cityId),
        stock: num(draft.stock),
        minSaleAmount: num(draft.minSaleAmount),
        minSalePrice: num(draft.minSalePrice),
        description: draft.description,
        features: draft.features.filter((f) => f.key && f.value.trim()),
        photos: draft.photos.map((p) => p.file),
      });
      setDone(true);
    } catch (err) {
      toast({ description: err instanceof Error && err.message ? err.message : 'خطا در ثبت محصول — دوباره تلاش کنید.' });
    }
  };

  // ─── تصاویر ───
  const addFiles = (files: FileList | null) => {
    if (!files) return;
    let rejected = '';
    const readers: Promise<{ id: number; url: string; file: File }>[] = [];
    const slots = 4 - draft.photos.length;
    Array.from(files)
      .slice(0, Math.max(0, slots))
      .forEach((file) => {
        if (!/image\/jpe?g/.test(file.type)) {
          rejected = 'تصویر از نوع jpeg یا jpg باشد.';
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          rejected = 'حجم تصویر بالاست، باید کمتر از 5 مگابایت باشد.';
          return;
        }
        if (file.size < 20 * 1024) {
          rejected = 'حجم تصویر پایین است، باید بیشتر از 20 کیلوبایت باشد.';
          return;
        }
        readers.push(
          new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = () =>
              resolve({ id: Date.now() + Math.random(), url: String(reader.result), file });
            reader.readAsDataURL(file);
          }),
        );
      });
    void Promise.all(readers).then((loaded) => {
      setDraft((d) => ({ ...d, photos: [...d.photos, ...loaded].slice(0, 4) }));
    });
    setError(rejected);
  };

  const featureOptions = (currentKey: string) =>
    PRODUCT_FEATURE_KEYS.filter((k) => k === currentKey || !draft.features.some((f) => f.key === k));

  const descLen = draft.description.trim().length;

  // ─── ظرفیت تکمیل — مودال «امکان ثبت محصول جدید را ندارید!» ───
  const capacityFull = Boolean(mine && mine.items.length >= mine.capacity);

  if (capacityFull && !done) {
    return (
      <div className="mx-auto max-w-xl">
        <PanelCard className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-red-50 text-red-500">
            <TrendingUp size={28} className="rotate-180" />
          </span>
          <h1 className="mt-4 text-base font-extrabold">امکان ثبت محصول جدید را ندارید!</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            برای ثبت محصولات بیشتر، ظرفیت ثبت محصول حساب خود را افزایش دهید.
          </p>
          <Button asChild className="mt-5 rounded-md">
            <Link href="/panel/pricing">افزایش ظرفیت</Link>
          </Button>
        </PanelCard>
      </div>
    );
  }

  // ─── صفحه موفقیت ───
  if (done) {
    return (
      <div className="mx-auto max-w-xl">
        <PanelCard className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <PartyPopper size={28} />
          </span>
          <h1 className="mt-4 text-base font-extrabold">محصول شما با موفقیت ثبت شد</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            آگهی «{draft.leaf?.categoryName} {draft.productType}» ثبت شد و پس از بررسی کارشناسان ایمچ، در «محصولات من»
            و نتایج بازار منتشر می‌شود.
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
              }}
            >
              <RotateCcw size={15} /> ثبت محصول دیگر
            </Button>
            <Button className="rounded-md" onClick={() => router.push('/panel/products')}>
              مشاهده محصولات من
            </Button>
          </div>
        </PanelCard>
      </div>
    );
  }

  const leaf = draft.leaf;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="hidden text-lg font-extrabold lg:block">ثبت محصول</h1>
      <ProductStepper current={step} maxReached={maxReached} onJump={goTo} />

      {/* ─── مرحله ۱: انتخاب دسته بندی ─── */}
      {step === 0 && (
        <PanelCard>
          <CategoryCascade value={{ path: draft.path, leaf: draft.leaf }} onChange={(v) => patch({ path: v.path, leaf: v.leaf })} />
        </PanelCard>
      )}

      {/* ─── مرحله ۲: اطلاعات محصول ─── */}
      {step === 1 && (
        <PanelCard className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="product-type">
              نوع <span className="text-primary">{leaf?.categoryName}</span> خود را وارد کنید <span className="text-red-500">*</span>
            </Label>
            <Input
              id="product-type"
              value={draft.productType}
              onChange={(e) => patch({ productType: e.target.value })}
              placeholder={leaf?.example ? `مثلا : ${leaf.example}` : 'مثلا : اکبری'}
            />
            <p className="text-[11px] text-muted-foreground">
              {leaf?.example ? `مثلا : ${leaf.example}` : 'نوع/واریته دقیق کالا را بنویسید تا خریداران مرتبط پیدا شوید.'}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>
                استان مبدا <span className="text-red-500">*</span>
              </Label>
              <Select value={draft.provinceId} onValueChange={(v) => patch({ provinceId: v, cityId: '' })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب استان" />
                </SelectTrigger>
                <SelectContent>
                  {(provinces ?? []).map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                شهر مبدا <span className="text-red-500">*</span>
              </Label>
              <Select value={draft.cityId} onValueChange={(v) => patch({ cityId: v })} disabled={!draft.provinceId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={draft.provinceId ? 'انتخاب شهر' : 'ابتدا استان را انتخاب کنید'} />
                </SelectTrigger>
                <SelectContent>
                  {(cities ?? []).map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </PanelCard>
      )}

      {/* ─── مرحله ۳: موجودی و قیمت ─── */}
      {step === 2 && (
        <PanelCard className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="stock">
              میزان موجودی محصول <span className="text-muted-foreground">({leaf?.unit ?? 'کیلوگرم'})</span>{' '}
              <span className="text-red-500">*</span>
            </Label>
            <UnitInput
              id="stock"
              kind="weight"
              value={draft.stock}
              onValueChange={(v) => patch({ stock: v })}
              placeholder="مثلا: 50,000"
              unit={leaf?.unit ?? 'کیلوگرم'}
            />
            <p className="text-[11px] text-muted-foreground">مقیاس عمده — مقیاس‌های خرده‌فروشی قابل قبول نیستند.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="min-amount">
              حداقل میزان فروش <span className="text-muted-foreground">({leaf?.unit ?? 'کیلوگرم'})</span>{' '}
              <span className="text-red-500">*</span>
            </Label>
            <UnitInput
              id="min-amount"
              kind="weight"
              value={draft.minSaleAmount}
              onValueChange={(v) => patch({ minSaleAmount: v })}
              placeholder="مثلا: 25,000"
              unit={leaf?.unit ?? 'کیلوگرم'}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="price">
              حداقل قیمت محصول <span className="text-muted-foreground">(تومان)</span> <span className="text-red-500">*</span>
            </Label>
            <UnitInput
              id="price"
              kind="price"
              value={draft.minSalePrice}
              onValueChange={(v) => patch({ minSalePrice: v })}
              placeholder="مثلا: 15,000"
              unit={`هر ${leaf?.unit ?? 'کیلوگرم'}`}
              invalid={Boolean(draft.minSalePrice) && num(draft.minSalePrice) < 1000}
            />
            {Boolean(draft.minSalePrice) && num(draft.minSalePrice) < 1000 && (
              <p className="text-[11px] text-red-500">قیمت صحیح را وارد کنید.</p>
            )}
          </div>
        </PanelCard>
      )}

      {/* ─── مرحله ۴: بارگذاری تصویر ─── */}
      {step === 3 && (
        <PanelCard>
          <div
            role="button"
            tabIndex={0}
            aria-label="افزودن تصویر"
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
            className="grid cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border bg-secondary/40 p-8 text-center transition-colors hover:border-primary/50 hover:bg-secondary/70"
          >
            <span className="grid size-12 place-items-center rounded-full bg-white text-primary shadow-sm">
              <ImagePlus size={22} />
            </span>
            <p className="mt-3 text-sm font-bold">تصویر را اینجا رها کنید</p>
            <p className="mt-1 text-xs text-muted-foreground">یا کلیک کنید</p>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/jpg"
            multiple
            className="hidden"
            onChange={(e) => {
              addFiles(e.target.files);
              e.target.value = '';
            }}
          />

          {draft.photos.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-3">
              {draft.photos.map((ph) => (
                <div key={ph.id} className="relative size-24 overflow-hidden rounded-md border bg-secondary">
                  {/* پیش‌نمایش محلی آپلود */}
                  <img src={ph.url} alt="تصویر محصول" className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label="حذف تصویر"
                    onClick={() => patch({ photos: draft.photos.filter((x) => x.id !== ph.id) })}
                    className="absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-red-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 rounded-md bg-secondary/60 p-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-bold">
              <ImageIcon size={14} className="text-muted-foreground" /> قواعد بارگذاری تصویر
            </p>
            <ul className="space-y-1">
              {IMAGE_RULES.map((r) => (
                <li key={r} className="flex items-start gap-1.5 text-[11px] leading-5 text-muted-foreground">
                  <span className="mt-1.5 size-1 shrink-0 rounded-full bg-muted-foreground/60" aria-hidden />
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </PanelCard>
      )}

      {/* ─── مرحله ۵: توضیحات محصول ─── */}
      {step === 4 && (
        <PanelCard className="space-y-3">
          <Label htmlFor="description">توضیحات محصول</Label>
          <Textarea
            id="description"
            dir="rtl"
            rows={9}
            value={draft.description}
            onChange={(e) => patch({ description: e.target.value })}
            className="resize-none text-sm leading-7"
            placeholder="کیفیت، بسته‌بندی، شرایط ارسال و هر نکته‌ای که خریدار عمده باید بداند…"
          />
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">{toFa(descLen)} حرف</span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 font-bold',
                descLen >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-secondary text-muted-foreground',
              )}
            >
              {descLen >= 100 ? 'کافی' : 'کوتاه'}
            </span>
          </div>
        </PanelCard>
      )}

      {/* ─── مرحله ۶: جزئیات نهایی (ویژگی‌های محصول) ─── */}
      {step === 5 && (
        <PanelCard className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            ویژگی‌های محصول خود را با انتخاب «جزئیات» و نوشتن توضیح آن ثبت کنید — مثل: بسته‌بندی / کیسه ۵۰ کیلویی.
          </p>

          {draft.features.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
              هنوز جزئیاتی اضافه نشده است.
            </div>
          )}

          {draft.features.map((f, i) => (
            <div key={i} className="grid gap-2 sm:grid-cols-[220px_1fr_auto]">
              <Select
                value={f.key}
                onValueChange={(v) => {
                  const features = [...draft.features];
                  features[i] = { ...features[i], key: v };
                  patch({ features });
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="یک مورد را انتخاب کنید" />
                </SelectTrigger>
                <SelectContent>
                  {featureOptions(f.key).map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={f.value}
                onChange={(e) => {
                  const features = [...draft.features];
                  features[i] = { ...features[i], value: e.target.value };
                  patch({ features });
                }}
                placeholder="توضیحات"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="حذف جزئیات"
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => patch({ features: draft.features.filter((_, j) => j !== i) })}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}

          {draft.features.length < 5 && (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-md border-dashed"
              onClick={() => patch({ features: [...draft.features, { key: '', value: '' }] })}
            >
              <Plus size={15} /> افزودن جزئیات بیشتر
            </Button>
          )}
        </PanelCard>
      )}

      {/* خطا + دکمه‌های ناوبری */}
      <div className="sticky bottom-16 z-10 rounded-lg border bg-card/95 p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] backdrop-blur lg:bottom-4">
        {error && <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-md"
            disabled={step === 0}
            onClick={() => goTo(Math.max(0, step - 1))}
          >
            <ArrowRight size={15} /> مرحله قبل
          </Button>
          {step < 5 ? (
            <Button type="button" className="rounded-md" onClick={next}>
              ادامه
            </Button>
          ) : (
            <Button type="button" className="rounded-md" onClick={() => void finalize()} disabled={submit.isPending}>
              {submit.isPending ? 'در حال ثبت…' : 'ثبت نهایی'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
