'use client';

/**
 * ویرایش آگهی — فرم بازِ تک‌صفحه‌ای (خواسته مالک ۴-۱۱؛ جایگزین ویزارد):
 *  • همهٔ بخش‌های ویزارد زیر هم آمده‌اند و کاربر هر بخش را که خواست جداگانه
 *    ویرایش می‌کند — دسکتاپ دو ستونه (ویرایش راحت‌تر)، موبایل تک‌ستونه.
 *  • دسته‌بندی فشرده: فقط مسیر فعلی + مداد ویرایش که کسکید انتخاب را باز
 *    می‌کند و با انتخاب برگ تازه جمع می‌شود (خواسته مالک ۱۱-۱۱).
 *  • بدون تایید مجدد: آگهی تاییدشده تاییدشده می‌ماند و تغییرات بلافاصله
 *    زنده است؛ فقط آگهی ردشده برای بازبینی اصلاحات «در انتظار» می‌شود.
 *  • خطای اعتبارسنجی هر بخش زیر همان بخش می‌نشیند و به محض اصلاح ورودی
 *    همان لحظه پاک می‌شود (قانون §۹ RULES — derived state).
 *  • برند: پاک‌سازی واژهٔ «برند» موقع blur و ذخیره (خواسته مالک ۳-۱۱).
 */

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowRight,
  ChevronLeft,
  ImageIcon,
  ImagePlus,
  Loader2,
  PartyPopper,
  Pencil,
  Save,
  Tag,
  Trash2,
  Warehouse,
} from 'lucide-react';
import { useCategoryTree, useCities, useMyProductDetail, useProvinces, useUpdateMyProduct } from '@/lib/mock/hooks';
import { retryProductPhotos } from '@/lib/mock/api';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CategoryCascade } from '@/components/panel/product-form/category-cascade';
import { PanelCard } from '@/components/panel/panel-parts';
import { UnitInput } from '@/components/shared/unit-input';
import { optimizeProductImage } from '@/lib/image-optimize';
import { toFa } from '@/lib/format';
import { cn, stripBrandWord } from '@/lib/utils';
import type { Category, ProductFeature, ProductStatus } from '@/lib/types';

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
  /** برند اختیاری — از ویژگی «برند» پیش‌پر می‌شود، به انتهای عنوان می‌چسبد */
  brand: string;
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

  const [draft, setDraft] = useState<EditDraft | null>(null);
  const [existingPhotos, setExistingPhotos] = useState<ExistingPhoto[]>([]);
  const [removedPhotoIds, setRemovedPhotoIds] = useState<string[]>([]);
  const [newPhotos, setNewPhotos] = useState<NewPhoto[]>([]);
  /** وضعیت پس از ذخیره — بدون تایید مجدد: تاییدشده همان‌جا زنده می‌ماند */
  const [doneStatus, setDoneStatus] = useState<ProductStatus | null>(null);
  // عکس‌های ناموفق آپلود در ویرایش — هشدار + تلاش دوباره
  const [failedPhotos, setFailedPhotos] = useState<File[]>([]);
  const [retryingPhotos, setRetryingPhotos] = useState(false);
  /** خطاهای لحظه‌ای (مثل رد تصویر) — ولیدیشنِ بخش‌ها derived است */
  const [error, setError] = useState('');
  /** تلاش برای ذخیره — تا آن موقع خطای بخش‌ها نشان داده نمی‌شود و بعد
   *  از آن، هر خطا به محض اصلاح همان ورودی پاک می‌شود (derived) */
  const [attempted, setAttempted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /** دسته‌بندی فشرده (خواسته مالک ۱۱-۱۱): به‌طور پیش‌فرض فقط مسیر فعلی +
   *  مداد ویرایش دیده می‌شود؛ مداد کسکید انتخاب را باز می‌کند و «انصراف»
   *  به دستهٔ لحظهٔ باز شدن برمی‌گرداند */
  const [catEditing, setCatEditing] = useState(false);
  const [catBackup, setCatBackup] = useState<{ path: Category[]; leaf: Category | null }>({
    path: [],
    leaf: null,
  });

  const provinceIdNum = draft ? num(draft.provinceId) : 0;
  const { data: cities } = useCities(provinceIdNum || undefined);

  // ─── پیش‌پر کردن فرم از دیتای واقعی آگهی (الگوی controlled-late) ───
  if (detail && tree && !draft) {
    const p = detail.product;
    const { path, leaf } = buildPath(tree, p.subCategoryId);
    const brandFeature = (p.features ?? []).find((f) => f.key === 'برند' && f.value?.trim());
    const brand = brandFeature?.value.trim() ?? '';
    const leafName = leaf?.categoryName ?? '';
    let remainder = p.productName.startsWith(leafName)
      ? p.productName.slice(leafName.length).trim()
      : p.productName;
    if (brand && remainder.toLowerCase().endsWith(brand.toLowerCase())) {
      remainder = remainder.slice(0, remainder.length - brand.length).trim();
    }
    setDraft({
      path,
      leaf,
      productType: remainder,
      brand,
      provinceId: String(p.provinceId),
      cityId: String(p.cityId),
      stock: p.stock ? p.stock.toLocaleString('en-US') : '',
      minSaleAmount: p.minSaleAmount ? p.minSaleAmount.toLocaleString('en-US') : '',
      minSalePrice: p.minSalePrice ? p.minSalePrice.toLocaleString('en-US') : '',
      description: p.description ?? '',
      features: (p.features ?? []).filter((f) => f.key !== 'برند').map((f) => ({ ...f })),
    });
    setExistingPhotos(detail.photoFiles.map((f) => ({ id: f.id, url: f.thumbUrl ?? f.url })));
  }

  const patch = (p: Partial<EditDraft>) => setDraft((d) => (d ? { ...d, ...p } : d));

  const totalPhotos = existingPhotos.length + newPhotos.length;

  // ─── اعتبارسنجی هر بخش — derived: با اصلاح ورودی همان لحظه پاک می‌شود ───
  const sectionErrors = (d: EditDraft | null): Record<string, string | null> => {
    if (!d) return {};
    const leaf = d.leaf;
    return {
      category: !leaf ? 'دسته بندی محصول را انتخاب کنید.' : null,
      info: !d.productType.trim()
        ? `نوع ${leaf?.categoryName ?? 'کالا'} خود را وارد کنید.`
        : !d.provinceId
          ? 'استان مبدا را انتخاب کنید.'
          : !d.cityId
            ? 'شهر مبدا را انتخاب کنید.'
            : null,
      pricing:
        num(d.stock) < 1
          ? 'میزان موجودی محصول را وارد کنید.'
          : num(d.minSaleAmount) < 1
            ? 'حداقل سفارش را وارد کنید.'
            : num(d.minSaleAmount) > num(d.stock)
              ? 'حداقل سفارش نمی‌تواند از موجودی بیشتر باشد.'
              : num(d.minSalePrice) < 1000
                ? 'قیمت صحیح را وارد کنید.'
                : null,
      photos: totalPhotos === 0 ? 'حداقل یک تصویر برای محصول نگه دارید.' : null,
      description:
        d.description.trim().length < 30 ? 'توضیحات محصول را کامل‌تر بنویسید (حداقل ۳۰ حرف).' : null,
    };
  };

  const save = async () => {
    if (!draft?.leaf) return;
    setAttempted(true);
    const errs = sectionErrors(draft);
    if (Object.values(errs).some(Boolean)) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    // برند به آخر عنوان می‌چسبد + به‌صورت ویژگی «برند» ذخیره می‌شود؛
    // واژهٔ «برند» ورودی همین‌جا هم پاک می‌شود (خواسته مالک ۳-۱۱)
    const brand = stripBrandWord(draft.brand);
    const fullName = [draft.leaf.categoryName, draft.productType.trim(), brand].filter(Boolean).join(' ');
    try {
      const result = await submit.mutateAsync({
        id: productId,
        productName: fullName,
        subCategoryId: draft.leaf.id,
        provinceId: num(draft.provinceId),
        cityId: num(draft.cityId),
        stock: num(draft.stock),
        minSaleAmount: num(draft.minSaleAmount),
        minSalePrice: num(draft.minSalePrice),
        description: draft.description,
        features: [
          ...draft.features.filter((f) => f.key && f.value.trim()),
          ...(brand ? [{ key: 'برند', value: brand }] : []),
        ],
        newPhotos: newPhotos.map((p) => p.file),
        removedPhotoIds,
      });
      setFailedPhotos(result.failedPhotos);
      setDoneStatus(result.status ?? 'pending');
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
          <p className="mt-2 text-sm text-muted-foreground">این آگهی متعلق به شما نیست یا حذف شده است.</p>
          <Button asChild className="mt-4 rounded-md">
            <Link href="/panel/products">بازگشت به محصولات من</Link>
          </Button>
        </PanelCard>
      </div>
    );
  }

  // ─── صفحه موفقیت — بدون تایید مجدد (خواسته مالک ۴-۱۱) ───
  if (doneStatus) {
    const live = doneStatus === 'confirmed';
    return (
      <div className="mx-auto max-w-xl">
        <PanelCard className="text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-full bg-emerald-50 text-emerald-600">
            <PartyPopper size={28} />
          </span>
          <h1 className="mt-4 text-base font-extrabold">تغییرات آگهی ذخیره شد</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            {live ? (
              <>
                آگهی «{draft?.leaf?.categoryName} {draft?.productType}» ویرایش شد و تغییرات{' '}
                <b className="text-emerald-600">بلافاصله</b> روی آگهی شما اعمال شد — نیازی به تایید مجدد نیست.
              </>
            ) : (
              <>آگهی «{draft?.leaf?.categoryName} {draft?.productType}» ویرایش شد و در انتظار تایید کارشناسان ایمچ است.</>
            )}
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
            <Button className="rounded-md" onClick={() => router.push(`/panel/products?tab=${live ? 'confirmed' : 'pending'}`)}>
              مشاهده محصول در لیست محصولات
            </Button>
            {/* ادامهٔ ویرایش — فرم باز است، برگشت سریع */}
            <Button variant="outline" className="rounded-md" onClick={() => setDoneStatus(null)}>
              ادامه ویرایش
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
  // خطاهای بخش‌ها — فقط بعد از تلاش ذخیره؛ derived و خوداصلاح (قانون §۹)
  const errs = attempted ? sectionErrors(draft) : {};
  const SectionError = ({ id }: { id: string }) =>
    errs[id] ? (
      <p className="rounded-md bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{errs[id]}</p>
    ) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-4 pb-24 lg:pb-20">
      {/* سربرگ — بازگشت + عنوان */}
      <div className="flex items-center gap-3">
        <Button
          asChild
          variant="outline"
          size="icon"
          className="size-10 shrink-0 rounded-full"
          aria-label="بازگشت به محصولات من"
          title="بازگشت"
        >
          <Link href="/panel/products">
            <ArrowRight size={17} />
          </Link>
        </Button>
        <div className="min-w-0">
          <h1 className="text-base font-extrabold sm:text-lg">ویرایش محصول</h1>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            هر بخش را که خواستید جداگانه ویرایش کنید و در پایان ذخیره کنید — بدون تایید مجدد.
          </p>
        </div>
      </div>

      {/* فرم باز — دسکتاپ دو ستونه، موبایل تک‌ستونه (خواسته مالک ۴-۱۱) */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        {/* ستون راست: دسته‌بندی + اطلاعات محصول */}
        <div className="space-y-4">
          <PanelCard className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-extrabold">
              <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
                <Tag size={14} />
              </span>
              دسته بندی
            </h2>

            {/* حالت فشرده — فقط دستهٔ فعلی + مداد ویرایش (خواسته مالک ۱۱-۱۱) */}
            {!catEditing ? (
              <button
                type="button"
                onClick={() => {
                  setCatBackup({ path: draft.path, leaf: draft.leaf });
                  setCatEditing(true);
                }}
                title="تغییر دسته بندی"
                aria-label="تغییر دسته بندی محصول"
                className="group flex w-full items-center gap-2 rounded-md border bg-secondary/40 px-3.5 py-3 text-start transition-colors hover:border-primary/40 hover:bg-secondary/70"
              >
                {draft.path.length > 0 ? (
                  <span className="flex min-w-0 flex-wrap items-center gap-1 text-[13px] font-bold text-primary">
                    {draft.path.map((c, i) => (
                      <span key={c.id} className="flex items-center gap-1">
                        {i > 0 && <ChevronLeft size={12} className="text-muted-foreground/60" aria-hidden />}
                        {c.categoryName}
                      </span>
                    ))}
                  </span>
                ) : (
                  <span className="text-[13px] font-bold text-muted-foreground">انتخاب دسته بندی محصول</span>
                )}
                <Pencil
                  size={15}
                  className="ms-auto shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                  aria-hidden
                />
              </button>
            ) : (
              /* حالت ویرایش — کسکید کامل + انصراف به دستهٔ قبلی */
              <div className="space-y-2">
                <CategoryCascade
                  value={{ path: draft.path, leaf: draft.leaf }}
                  onChange={(v) => {
                    patch({ path: v.path, leaf: v.leaf });
                    // برگ تازه انتخاب شد → جمع کن و مسیر جدید را فشرده نشان بده
                    if (v.leaf) setCatEditing(false);
                  }}
                />
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      patch({ path: catBackup.path, leaf: catBackup.leaf });
                      setCatEditing(false);
                    }}
                    className="text-xs font-bold text-muted-foreground transition-colors hover:text-foreground"
                  >
                    انصراف و بازگشت
                  </button>
                </div>
              </div>
            )}
            <SectionError id="category" />
          </PanelCard>

          <PanelCard className="space-y-4">
            <h2 className="flex items-center gap-2 text-sm font-extrabold">
              <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
                <Tag size={14} />
              </span>
              اطلاعات محصول
            </h2>
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

            {/* برند اختیاری — پاک‌سازی واژهٔ «برند» موقع blur (خواسته مالک ۳-۱۱) */}
            <div className="space-y-2">
              <Label htmlFor="product-brand">اگر محصول شما برند دارد وارد کنید</Label>
              <Input
                id="product-brand"
                value={draft.brand}
                onChange={(e) => patch({ brand: e.target.value })}
                onBlur={() => {
                  const cleaned = stripBrandWord(draft.brand);
                  if (cleaned !== draft.brand) patch({ brand: cleaned });
                }}
                maxLength={40}
              />
              <p className="text-[11px] text-muted-foreground">
                اختیاری است — برند به انتهای عنوان آگهی اضافه می‌شود و خریداران با جستجوی نام برند محصول شما را پیدا می‌کنند.
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
            <SectionError id="info" />
          </PanelCard>
        </div>

        {/* ستون چپ: موجودی و قیمت + تصاویر */}
        <div className="space-y-4">
          <PanelCard className="space-y-5">
            <h2 className="flex items-center gap-2 text-sm font-extrabold">
              <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
                <Warehouse size={14} />
              </span>
              موجودی و قیمت
            </h2>
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
            <SectionError id="pricing" />
          </PanelCard>

          <PanelCard className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-extrabold">
              <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
                <ImageIcon size={14} />
              </span>
              تصاویر محصول
            </h2>
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
              className="grid cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border bg-secondary/40 p-5 text-center transition-colors hover:border-primary/50 hover:bg-secondary/70"
            >
              <span className="grid size-10 place-items-center rounded-full bg-card text-primary shadow-sm">
                <ImagePlus size={18} />
              </span>
              <p className="mt-2 text-xs font-bold">انتخاب تصویر</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
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
              <div className="flex flex-wrap gap-3">
                {existingPhotos.map((ph) => (
                  <div key={ph.id} className="relative size-20 overflow-hidden rounded-md border bg-secondary">
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
                  <div key={ph.id} className="relative size-20 overflow-hidden rounded-md border-2 border-primary/40 bg-secondary">
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
            <p className="text-[11px] text-muted-foreground">
              تصاویر حذف‌شده بعد از ذخیره نهایی پاک می‌شوند؛ تصاویر جدید مثل ثبت اولیه بهینه می‌شوند (عرض ≤۱۲۰۰، حجم ≤۵۰۰KB).
            </p>
            <SectionError id="photos" />
          </PanelCard>
        </div>
      </div>

      {/* توضیحات — تمام‌عرض */}
      <PanelCard className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-extrabold">
          <span className="grid size-7 place-items-center rounded-md bg-primary/10 text-primary">
            <Tag size={14} />
          </span>
          توضیحات محصول
        </h2>
        <Textarea
          dir="rtl"
          rows={14}
          value={draft.description}
          onChange={(e) => {
            if (e.target.value.length <= DESCRIPTION_MAX) patch({ description: e.target.value });
          }}
          className="min-h-56 resize-none text-sm leading-8 md:min-h-64"
          placeholder="کیفیت ویژگیها، بسته بندی، قیمت در حجم های مختلف، شرایط ارسال، محدوده ارسال، تخفیفات همکاری و هر چیزی که خریداران محصولات شما باید بدانند"
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
        <SectionError id="description" />
      </PanelCard>

      {/* نوار ذخیره — چسبان پایین؛ فرم باز، همهٔ بخش‌ها یک‌جا ذخیره می‌شوند */}
      <div className="sticky bottom-16 z-10 rounded-lg border bg-card/95 p-3 shadow-[0_-2px_10px_rgba(0,0,0,0.06)] backdrop-blur lg:bottom-4">
        {error ? (
          <p className="mb-2 rounded-md bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</p>
        ) : null}
        <div className="flex items-center justify-between gap-2">
          <p className="hidden text-[11px] leading-5 text-muted-foreground sm:block">
            تغییرات بدون تایید مجدد اعمال می‌شود — آگهی تاییدشده همان‌جا زنده می‌ماند.
          </p>
          <Button
            type="button"
            className="h-12 min-w-40 rounded-md px-6 text-sm font-extrabold"
            onClick={() => void save()}
            disabled={submit.isPending}
          >
            {submit.isPending ? (
              <>
                <Loader2 size={16} className="animate-spin" /> در حال ذخیره…
              </>
            ) : (
              <>
                <Save size={16} /> ذخیره تغییرات
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
