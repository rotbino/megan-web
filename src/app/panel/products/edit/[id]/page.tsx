'use client';

/**
 * ویرایش آگهی — همان ویزارد ۶ مرحله‌ای، با پیش‌پر شدن از getMyProductDetail:
 * دسته/نوع کالا/استان‌شهر/موجودی‌وقیمت/تصاویر موجود (قابل حذف) + تصاویر جدید/
 * توضیحات/ویژگی‌ها. بعد از ذخیره، آگهی مثل باسکول دوباره «در انتظار تایید»
 * می‌شود تا کارشناس بازبینی کند.
 */

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight,
  ImageIcon,
  ImagePlus,
  Loader2,
  PartyPopper,
  Plus,
  Trash2,
} from 'lucide-react';
import { useCategoryTree, useCities, useMyProductDetail, useProvinces, useUpdateMyProduct } from '@/lib/mock/hooks';
import { retryProductPhotos } from '@/lib/mock/api';
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
import { optimizeProductImage } from '@/lib/image-optimize';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Category, ProductFeature } from '@/lib/types';

const num = (v: string) => Number(v.replace(/[^\d]/g, '')) || 0;

const DESCRIPTION_MAX = 3000;

interface ExistingPhoto {
  id: string;
  url: string;
}
interface NewPhoto {
  id: number;
  url: string;
  file: File;
}

interface EditDraft {
  path: Category[];
  leaf: Category | null;
  productType: string;
  provinceId: string;
  cityId: string;
  stock: string;
  minSaleAmount: string;
  minSalePrice: string;
  description: string;
  features: ProductFeature[];
}

/** مسیر دسته را از درخت با پیمایش والد‌ها می‌سازد */
function buildPath(tree: Category[], leafId: number): { path: Category[]; leaf: Category | null } {
  const byId = new Map<number, { node: Category; parent: number | null }>();
  const walk = (nodes: Category[], parent: number | null): void => {
    for (const n of nodes) {
      byId.set(n.id, { node: n, parent });
      if (n.children?.length) walk(n.children, n.id);
    }
  };
  walk(tree, null);
  const entry = byId.get(leafId);
  if (!entry) return { path: [], leaf: null };
  const path: Category[] = [];
  let cur: { node: Category; parent: number | null } | undefined = entry;
  while (cur) {
    path.unshift(cur.node);
    cur = cur.parent != null ? byId.get(cur.parent) : undefined;
  }
  return { path, leaf: entry.node };
}

export default function EditProductPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = Number(params?.id);
  const { toast } = useToast();
  const { data: detail, isLoading: loadingDetail, error: detailError } = useMyProductDetail(
    Number.isFinite(productId) && productId > 0 ? productId : null,
  );
  const { data: tree } = useCategoryTree();
  const { data: provinces } = useProvinces();
  const submit = useUpdateMyProduct();

  const [step, setStep] = useState(0);
  const [maxReached, setMaxReached] = useState(0);
  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  const [done, setDone] = useState(false);
  // عکس‌های ناموفق آپلود در ویرایش — هشدار + تلاش دوباره (مثل ثبت جدید)
  const [failedPhotos, setFailedPhotos] = useState<File[]>([]);
  const [retryingPhotos, setRetryingPhotos] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const provinceIdNum = draft ? num(draft.provinceId) : 0;
  const { data: cities } = useCities(provinceIdNum || undefined);

  // ─── پیش‌پر کردن فرم از دیتای واقعی آگهی ───
  // الگوی «تنظیم state هنگام رندر» — دیتای سرور آمده و فرم هنوز خالی است؛
  // بدون effect (مثل الگوی پیش‌پر کردن استان/شهر از پروفایل در فرم ثبت)
  if (detail && tree && !draft) {
    const p = detail.product;
    const { path, leaf } = buildPath(tree, p.subCategoryId);
    // نام محصول = «{دسته} {نوع}» — نوع را جدا می‌کنیم
    const leafName = leaf?.categoryName ?? '';
    const productType = p.productName.startsWith(leafName)
      ? p.productName.slice(leafName.length).trim()
      : p.productName;
    setDraft({
      path,
      leaf,
      productType,
      provinceId: String(p.provinceId),
      cityId: String(p.cityId),
      stock: p.stock ? p.stock.toLocaleString('en-US') : '',
      minSaleAmount: p.minSaleAmount ? p.minSaleAmount.toLocaleString('en-US') : '',
      minSalePrice: p.minSalePrice ? p.minSalePrice.toLocaleString('en-US') : '',
      description: p.description ?? '',
      features: (p.features ?? []).map((f) => ({ ...f })),
    });
    setExistingPhotos(detail.photoFiles.map((f) => ({ id: f.id, url: f.thumbUrl ?? f.url })));
    // ویرایش = همه مراحل معتبرند؛ از پیش‌پر شده‌اند — پرش آزاد بین مراحل
    setMaxReached(5);
  }

  const patch = (p: Partial<EditDraft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const goTo = (s: number) => {
    setStep(s);
    setMaxReached((m) => Math.max(m, s));
    setError('');
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const totalPhotos = existingPhotos.length + newPhotos.length;

  // ─── اعتبارسنجی هر مرحله ───
  const stepError = (s: number): string | null => {
    if (!draft) return 'در حال بارگذاری…';
    const leaf = draft.leaf;
    if (s === 0 && !leaf) return 'دسته بندی محصول را انتخاب کنید.';
    if (s === 1) {
      if (!draft.productType.trim()) return `نوع ${leaf?.categoryName ?? 'کالا'} خود را وارد کنید.`;
      if (!draft.provinceId) return 'استان مبدا را انتخاب کنید.';
      if (!draft.cityId) return 'شهر مبدا را انتخاب کنید.';
    }
    if (s === 2) {
      if (num(draft.stock) < 1) return 'میزان موجودی محصول را وارد کنید.';
      if (num(draft.minSaleAmount) < 1) return 'حداقل سفارش را وارد کنید.';
      if (num(draft.minSaleAmount) > num(draft.stock)) return 'حداقل سفارش نمی‌تواند از موجودی بیشتر باشد.';
      if (num(draft.minSalePrice) < 1000) return 'قیمت صحیح را وارد کنید.';
    }
    if (s === 3 && totalPhotos === 0) return 'حداقل یک تصویر برای محصول نگه دارید.';
    if (s === 4 && draft.description.trim().length < 30) return 'توضیحات محصول را کامل‌تر بنویسید (حداقل ۳۰ حرف).';
    return null;
  };

  const finalize = async () => {
    if (!draft?.leaf) return;
    const err = stepError(5);
    if (err) {
      setError(err);
      return;
    }
    try {
      const result = await submit.mutateAsync({
        id: productId,
        productName: `${draft.leaf.categoryName} ${draft.productType.trim()}`,
        subCategoryId: draft.leaf.id,
        provinceId: num(draft.provinceId),
        cityId: num(draft.cityId),
        stock: num(draft.stock),
        minSaleAmount: num(draft.minSaleAmount),
        minSalePrice: num(draft.minSalePrice),
        description: draft.description,
        features: draft.features.filter((f) => f.key && f.value.trim()),
        newPhotos: newPhotos.map((p) => p.file),
        removedPhotoIds,
      });
      setFailedPhotos(result.failedPhotos);
      setDone(true);
    } catch (err) {
      toast({ description: err instanceof Error && err.message ? err.message : 'خطا در ذخیره ویرایش — دوباره تلاش کنید.' });
    }
  };

  // ─── تلاش دوباره عکس‌های ناموفق ویرایش ───
  const retryPhotos = async () => {
    if (failedPhotos.length === 0) return;
    setRetryingPhotos(true);
    try {
      const { failed } = await retryProductPhotos(productId, failedPhotos);
      setFailedPhotos(failed);
      if (failed.length === 0) {
        toast({ description: 'تصاویر محصول با موفقیت ذخیره شدند.' });
      } else {
        toast({ description: 'باز هم ذخیره نشد — دوباره تلاش کنید یا بعداً دوباره ویرایش کنید.' });
      }
    } finally {
      setRetryingPhotos(false);
    }
  };

  // ─── تصاویر جدید (بهینه‌سازی کلاینت مثل ثبت جدید) ───
  const addFiles = (files: FileList | null) => {
    if (!files || !draft) return;
    let rejected = '';
    const slots = 4 - totalPhotos;
    Array.from(files)
      .slice(0, Math.max(0, slots))
      .forEach((file) => {
        if (!/image\/jpe?g/.test(file.type)) {
          rejected = 'تصویر از نوع jpeg یا jpg باشد.';
          return;
        }
        if (file.size > 15 * 1024 * 1024) {
          rejected = 'حجم تصویر بسیار بالا است (بیش از ۱۵ مگابایت).';
          return;
        }
      });
    if (rejected) {
      setError(rejected);
      return;
    }
    void (async () => {
      const loaded: NewPhoto[] = [];
      for (const file of Array.from(files).slice(0, Math.max(0, slots))) {
        try {
          const optimized = await optimizeProductImage(file);
          const url = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.readAsDataURL(optimized);
          });
          loaded.push({ id: Date.now() + Math.random(), url, file: optimized });
        } catch {
          rejected = 'خواندن یکی از تصاویر ممکن نشد.';
        }
      }
      if (loaded.length > 0) setNewPhotos((prev) => [...prev, ...loaded].slice(0, 4));
      if (rejected) setError(rejected);
    })();
  };

  const featureOptions = (currentKey: string) =>
    PRODUCT_FEATURE_KEYS.filter((k) => !draft || k === currentKey || !draft.features.some((f) => f.key === k));

  // ─── حالت‌های بارگذاری/خطا ───
  if (loadingDetail) {
    return (
      <div className="grid h-64 place-items-center text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }
  if (detailError || (!detail && !loadingDetail)) {
    return (
      <div className="mx-auto max-w-xl">
        <PanelCard className="text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-red-50 text-red-500">
            <ImageIcon size={24} />
          </span>
          <h1 className="mt-3 text-base font-extrabold">آگهی یافت نشد</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            این آگهی متعلق به شما نیست یا حذف شده است.
          </p>
          <Button asChild className="mt-4 rounded-md">
            <Link href="/panel/products">بازگشت به محصولات من</Link>
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
          <h1 className="mt-4 text-base font-extrabold">تغییرات آگهی ذخیره شد</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            آگهی «{draft?.leaf?.categoryName} {draft?.productType}» ویرایش شد و دوباره در انتظار تایید کارشناسان ایمچ است.
          </p>

          {/* هشدار عکس‌های ذخیره‌نشده — دیگر بی‌صدا گم نمی‌شوند */}
          {failedPhotos.length > 0 && (
            <div className="mt-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-right">
              <p className="text-sm font-bold text-amber-800">
                ذخیره {failedPhotos.length.toLocaleString('fa-IR')} تصویر ناموفق بود
              </p>
              <p className="mt-1 text-xs leading-5 text-amber-700">
                ویرایش ذخیره شد اما تصاویر جدید ذخیره نشدند — دوباره تلاش کنید.
              </p>
              <Button
                size="sm"
                className="mt-2 rounded-md"
                disabled={retryingPhotos}
                onClick={() => void retryPhotos()}
              >
                {retryingPhotos ? 'در حال تلاش…' : 'تلاش دوباره ذخیره تصاویر'}
              </Button>
            </div>
          )}

          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button className="rounded-md" onClick={() => router.push('/panel/products?tab=pending')}>
              مشاهده محصول در لیست محصولات
            </Button>
          </div>
        </PanelCard>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="grid h-64 place-items-center text-sm text-muted-foreground">
        <Loader2 className="size-6 animate-spin" />
      </div>
    );
  }

  const leaf = draft.leaf;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="hidden text-lg font-extrabold lg:block">ویرایش محصول</h1>
      <ProductStepper current={step} maxReached={maxReached} onJump={goTo} />

      {/* ─── مرحله ۱: دسته بندی ─── */}
      {step === 0 && (
        <PanelCard>
          <CategoryCascade
            value={{ path: draft.path, leaf: draft.leaf }}
            onChange={(v) => patch({ path: v.path, leaf: v.leaf })}
          />
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
        <PanelCard className="space-y-6">
          <div className="space-y-2.5">
            <Label htmlFor="stock">
              میزان موجودی محصول <span className="text-muted-foreground">({leaf?.unit ?? 'کیلوگرم'})</span>{' '}
              <span className="text-red-500">*</span>
            </Label>
            <UnitInput
              id="stock"
              kind="weight"
              value={draft.stock}
              onValueChange={(v) => patch({ stock: v })}
              unit={leaf?.unit ?? 'کیلوگرم'}
            />
            <p className="text-[11px] text-muted-foreground">مقیاس عمده — مقیاس‌های خرده‌فروشی قابل قبول نیستند.</p>
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="min-amount">
              حداقل سفارش <span className="text-muted-foreground">({leaf?.unit ?? 'کیلوگرم'})</span>{' '}
              <span className="text-red-500">*</span>
            </Label>
            <UnitInput
              id="min-amount"
              kind="weight"
              value={draft.minSaleAmount}
              onValueChange={(v) => patch({ minSaleAmount: v })}
              unit={leaf?.unit ?? 'کیلوگرم'}
            />
          </div>
          <div className="space-y-2.5">
            <Label htmlFor="price">
              حداقل قیمت محصول <span className="text-muted-foreground">(تومان)</span> <span className="text-red-500">*</span>
            </Label>
            <UnitInput
              id="price"
              kind="price"
              value={draft.minSalePrice}
              onValueChange={(v) => patch({ minSalePrice: v })}
              unit={`هر ${leaf?.unit ?? 'کیلوگرم'}`}
              invalid={Boolean(draft.minSalePrice) && num(draft.minSalePrice) < 1000}
            />
            {Boolean(draft.minSalePrice) && num(draft.minSalePrice) < 1000 && (
              <p className="text-[11px] text-red-500">قیمت صحیح را وارد کنید.</p>
            )}
          </div>
        </PanelCard>
      )}

      {/* ─── مرحله ۴: تصاویر ─── */}
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
            className="grid cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border bg-secondary/40 p-6 text-center transition-colors hover:border-primary/50 hover:bg-secondary/70"
          >
            <span className="grid size-11 place-items-center rounded-full bg-white text-primary shadow-sm">
              <ImagePlus size={20} />
            </span>
            <p className="mt-2.5 text-sm font-bold">انتخاب تصویر</p>
            <p className="mt-1 text-xs text-muted-foreground">
              حداکثر ۴ تصویر — {toFa(totalPhotos)} تصویر فعلی
            </p>
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

          {(existingPhotos.length > 0 || newPhotos.length > 0) && (
            <div className="mt-4 flex flex-wrap gap-3">
              {existingPhotos.map((ph) => (
                <div key={ph.id} className="relative size-24 overflow-hidden rounded-md border bg-secondary">
                  <img src={ph.url} alt="تصویر فعلی محصول" className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label="حذف تصویر"
                    onClick={() => {
                      setExistingPhotos((prev) => prev.filter((x) => x.id !== ph.id));
                      setRemovedPhotoIds((prev) => [...prev, ph.id]);
                    }}
                    className="absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-red-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
              {newPhotos.map((ph) => (
                <div key={ph.id} className="relative size-24 overflow-hidden rounded-md border-2 border-primary/40 bg-secondary">
                  <img src={ph.url} alt="تصویر جدید محصول" className="size-full object-cover" />
                  <button
                    type="button"
                    aria-label="حذف تصویر جدید"
                    onClick={() => setNewPhotos((prev) => prev.filter((x) => x.id !== ph.id))}
                    className="absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-red-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[11px] text-muted-foreground">
            تصاویر حذف‌شده بعد از ذخیره نهایی پاک می‌شوند؛ تصاویر جدید مثل ثبت اولیه بهینه می‌شوند (عرض ≤۱۲۰۰، حجم ≤۵۰۰KB).
          </p>
        </PanelCard>
      )}

      {/* ─── مرحله ۵: توضیحات ─── */}
      {step === 4 && (
        <PanelCard className="space-y-3">
          <Label htmlFor="description">توضیحات محصول</Label>
          <Textarea
            id="description"
            dir="rtl"
            rows={18}
            value={draft.description}
            onChange={(e) => {
              if (e.target.value.length <= DESCRIPTION_MAX) patch({ description: e.target.value });
            }}
            className="min-h-72 resize-none text-sm leading-8 md:min-h-80"
            placeholder="کیفیت، بسته‌بندی، شرایط ارسال و هر نکته‌ای که خریدار عمده باید بداند…"
            maxLength={DESCRIPTION_MAX}
          />
          <div className="flex items-center justify-between text-[11px]">
            <span className="font-num text-muted-foreground">
              {toFa(draft.description.trim().length)} / {toFa(DESCRIPTION_MAX)} نویسه
            </span>
            <span
              className={cn(
                'rounded-full px-2.5 py-0.5 font-bold',
                draft.description.trim().length >= 100 ? 'bg-emerald-50 text-emerald-600' : 'bg-secondary text-muted-foreground',
              )}
            >
              {draft.description.trim().length >= 100 ? 'کافی' : 'کوتاه'}
            </span>
          </div>
        </PanelCard>
      )}

      {/* ─── مرحله ۶: ویژگی‌ها ─── */}
      {step === 5 && (
        <PanelCard className="space-y-4">
          <p className="text-sm leading-6 text-muted-foreground">
            ویژگی‌های محصول خود را با انتخاب «ویژگی» و نوشتن توضیح آن ثبت کنید — مثل: بسته‌بندی / کیسه ۵۰ کیلویی.
            (اختیاری است — تا {toFa(PRODUCT_FEATURE_KEYS.length)} ویژگی.)
          </p>

          {draft.features.length === 0 && (
            <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
              هنوز ویژگی‌ای اضافه نشده است (اختیاری).
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
                aria-label="حذف ویژگی"
                className="text-red-500 hover:bg-red-50 hover:text-red-600"
                onClick={() => patch({ features: draft.features.filter((_, j) => j !== i) })}
              >
                <Trash2 size={16} />
              </Button>
            </div>
          ))}

          {draft.features.length < PRODUCT_FEATURE_KEYS.length && (
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-md border-dashed"
              onClick={() => patch({ features: [...draft.features, { key: '', value: '' }] })}
            >
              <Plus size={15} /> افزودن ویژگی بیشتر
              <span className="text-[10px] font-normal text-muted-foreground">
                ({toFa(draft.features.length)} از {toFa(PRODUCT_FEATURE_KEYS.length)})
              </span>
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
            <Button
              type="button"
              className="rounded-md"
              onClick={() => {
                const err = stepError(step);
                if (err) setError(err);
                else goTo(step + 1);
              }}
            >
              ادامه
            </Button>
          ) : (
            <Button type="button" className="rounded-md" onClick={() => void finalize()} disabled={submit.isPending}>
              {submit.isPending ? 'در حال ذخیره…' : 'ذخیره تغییرات'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
