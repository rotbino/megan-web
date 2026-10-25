'use client';

/**
 * ویرایش پروفایل — عین MHTML باسکول:
 * «درباره شما» (حداقل ۳ تا ۵ خط) + ستون سنجه تکمیل (۳۳٪ → با پر کردن فرم بالا می‌رود) +
 * اطلاعات شما (موبایل/آدرس + سوییچ نمایش شماره) + اطلاعات حقوقی (نام و شماره ثبت شرکت) +
 * «درباره کسب و کارتان بنویسید» (۳ سوال راهنما) + تصاویر مربوطه (محصولات/شرکت/کارکنان) +
 * گواهی های مربوطه (ثبت شرکت/استاندارد محصول) — با دراپ‌زون و پیش‌نمایش.
 */

import { useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Building2,
  Camera,
  ImagePlus,
  Info,
  ShieldCheck,
  X,
} from 'lucide-react';
import { usePanelProfile } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PanelCard } from '@/components/panel/panel-parts';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

const BUSINESS_HINT_QUESTIONS = [
  '1- در چه زمینه ای فعالیت می کنید؟',
  '2- بازار فعالیت شما داخلی است یا خارجی؟',
  '3- چند سال سابقه فعالیت دارید؟',
];

type Photo = { id: number; url: string };

function ImageDropzone({
  photos,
  onAdd,
  onRemove,
}: {
  photos: Photo[];
  onAdd: (files: FileList | null) => void;
  onRemove: (id: number) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-border bg-secondary/30 px-4 py-8 text-center transition-colors hover:border-primary/50 hover:bg-secondary/50"
      >
        <ImagePlus size={26} className="text-muted-foreground" />
        <span className="text-xs text-muted-foreground">تصویر را اینجا رها کنید</span>
        <span className="rounded-md border bg-card px-3 py-1.5 text-xs font-bold">افزودن تصویر</span>
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        multiple
        className="hidden"
        onChange={(e) => {
          onAdd(e.target.files);
          e.target.value = '';
        }}
      />
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((p) => (
            <span key={p.id} className="relative block size-20 overflow-hidden rounded-md border">
              <img src={p.url} alt="تصویر ثبت‌شده" className="size-full object-cover" />
              <button
                type="button"
                aria-label="حذف تصویر"
                onClick={() => onRemove(p.id)}
                className="absolute end-1 top-1 grid size-5 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      {photos.length === 0 && <p className="text-xs text-muted-foreground">هنوز تصویری ثبت نشده است</p>}
    </div>
  );
}

export default function EditProfilePage() {
  const { data: profile } = usePanelProfile();
  const { user } = useAuth();
  const { toast } = useToast();

  const [about, setAbout] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [showPhone, setShowPhone] = useState(true);
  const [companyName, setCompanyName] = useState('');
  const [companyRegisterNo, setCompanyRegisterNo] = useState('');
  const [businessDesc, setBusinessDesc] = useState('');
  const [gallery, setGallery] = useState<Photo[]>([]);
  const [certs, setCerts] = useState<Photo[]>([]);

  const pf = profile?.profile;
  const u = profile?.userInfo;

  const aboutText = about ?? pf?.description ?? '';
  const isBuyer = user?.role === 'buyer';

  /** سنجه تکمیل — با پر کردن بخش‌ها بالا می‌رود (پایه باسکول: ۳۳٪) */
  const completion = useMemo(() => {
    const checks = [
      aboutText.trim().length >= 100,
      Boolean(address.trim() || pf?.address),
      Boolean(companyName.trim() || pf?.isCompany),
      businessDesc.trim().length >= 60,
      gallery.length > 0,
      certs.length > 0,
      Boolean(u?.isVerified),
    ];
    return Math.round((checks.filter(Boolean).length / checks.length) * 100);
  }, [aboutText, address, companyName, businessDesc, gallery.length, certs.length, pf, u]);

  const addPhotos = (
    setter: React.Dispatch<React.SetStateAction<Photo[]>>,
    files: FileList | null,
  ) => {
    if (!files) return;
    const readers = Array.from(files)
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, 6)
      .map(
        (f) =>
          new Promise<Photo>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => resolve({ id: Date.now() + Math.random(), url: String(reader.result) });
            reader.readAsDataURL(f);
          }),
      );
    void Promise.all(readers).then((loaded) => {
      setter((prev) => [...prev, ...loaded].slice(0, 8));
      toast({ description: 'تصویر با موفقیت افزوده شد.' });
    });
  };

  const sectionBadge = (filled: boolean) => (
    <span
      className={cn(
        'rounded-full px-2 py-0.5 text-[10px] font-bold',
        filled ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500',
      )}
    >
      {filled ? '%' + toFa(100) : 'تکمیل کنید'}
    </span>
  );

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h1 className="text-lg font-extrabold">ویرایش پروفایل</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          تکمیل پروفایل، اعتماد {isBuyer ? 'فروشندگان' : 'خریداران'} را در معاملات جلب می‌کند.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        {/* ستون اصلی — فرم */}
        <div className="min-w-0 space-y-4">
          {/* درباره شما */}
          <PanelCard>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">درباره شما</p>
              {sectionBadge(aboutText.trim().length >= 100)}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">درباره ی خودتان حداقل ۳ تا ۵ خط بنویسید.</p>
            <Textarea
              dir="rtl"
              rows={6}
              value={aboutText}
              onChange={(e) => setAbout(e.target.value)}
              className="mt-3 resize-none text-sm leading-7"
              placeholder={
                isBuyer
                  ? 'به عنوان مثال: خریدار عمده میوه خشک در تهران؛ سالانه چند تن قیسی و کشمش خریداری می‌کنم…'
                  : 'به عنوان مثال: سامی جابر هستم از شهر تهران، عرضه‌کننده عمده پسته و خشکبار…'
              }
            />
            <div className="mt-3 flex items-center justify-between">
              <span
                className={cn(
                  'text-[11px]',
                  aboutText.trim().length >= 100 ? 'text-emerald-600' : 'text-muted-foreground',
                )}
              >
                {aboutText.trim().length >= 100 ? 'کافی' : 'کمی طولانی‌تر بنویسید تا اعتماد طرف مقابل جلب شود'}
              </span>
              <Button
                size="sm"
                className="rounded-md"
                onClick={() => toast({ description: 'متن «درباره شما» ذخیره شد.' })}
              >
                ذخیره
              </Button>
            </div>
          </PanelCard>

          {/* اطلاعات شما */}
          <PanelCard>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">اطلاعات شما</p>
              {sectionBadge(Boolean(address.trim() || pf?.address))}
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>نام و نام خانوادگی</Label>
                <Input value={u ? `${u.firstName} ${u.lastName}` : ''} readOnly className="rounded-md bg-secondary/50" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-phone">
                  شماره موبایل <span className="text-red-500">*</span>
                </Label>
                <Input id="pf-phone" dir="ltr" value={pf?.publicPhone ?? '09962253970'} readOnly className="rounded-md bg-secondary/50" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pf-address">آدرس</Label>
                <Input
                  id="pf-address"
                  value={address || pf?.address || ''}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="تهران - تهران"
                  className="rounded-md"
                />
              </div>
            </div>
            {/* نمایش شماره به ... */}
            <div className="mt-4 flex items-center justify-between rounded-md border bg-secondary/30 px-3 py-2.5">
              <div>
                <p className="text-xs font-bold">نمایش شماره به {isBuyer ? 'فروشندگان' : 'خریداران'}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {showPhone ? 'فعال است' : 'غیرفعال است'}
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={showPhone}
                onClick={() => setShowPhone((v) => !v)}
                className={cn(
                  'relative h-6 w-11 shrink-0 rounded-full transition-colors',
                  showPhone ? 'bg-primary' : 'bg-muted-foreground/30',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all',
                    showPhone ? 'start-0.5' : 'start-[22px]',
                  )}
                />
              </button>
            </div>
          </PanelCard>

          {/* اطلاعات حقوقی */}
          <PanelCard>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">افزودن اطلاعات حقوقی</p>
              {sectionBadge(Boolean(companyName.trim()))}
            </div>
            <p className="mt-1 flex items-center gap-1.5 text-xs leading-5 text-muted-foreground">
              <Building2 size={14} className="shrink-0" />
              با تکمیل اطلاعات حقوقی، اعتبار حساب خود را بیشتر کنید.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="pf-company">
                  نام شرکت <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pf-company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="نام شرکت یا مجموعه"
                  className="rounded-md"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pf-regno">
                  شماره ثبت شرکت <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="pf-regno"
                  dir="ltr"
                  inputMode="numeric"
                  value={companyRegisterNo}
                  onChange={(e) => setCompanyRegisterNo(e.target.value.replace(/[^\d]/g, ''))}
                  placeholder="12345678"
                  className="rounded-md text-center font-bold tabular-nums"
                />
              </div>
            </div>
          </PanelCard>

          {/* درباره کسب و کارتان */}
          <PanelCard>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">درباره کسب و کارتان بنویسید</p>
              {sectionBadge(businessDesc.trim().length >= 60)}
            </div>
            <div className="mt-2 rounded-md border border-sky-100 bg-sky-50/60 p-3">
              <p className="flex items-center gap-1.5 text-xs font-bold text-sky-700">
                <Info size={14} className="shrink-0" />
                در بخش (درباره کسب و کارتان بنویسید) به این سوالات پاسخ دهید.
              </p>
              <ul className="mt-1.5 space-y-0.5 text-xs leading-6 text-sky-700/90">
                {BUSINESS_HINT_QUESTIONS.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>
            </div>
            <Textarea
              dir="rtl"
              rows={6}
              value={businessDesc}
              onChange={(e) => setBusinessDesc(e.target.value)}
              className="mt-3 resize-none text-sm leading-7"
              placeholder={
                isBuyer
                  ? 'به سوالات بالا پاسخ دهید تا فروشندگان شما را بهتر بشناسند…'
                  : 'به سوالات بالا پاسخ دهید تا خریداران شما را بهتر بشناسند…'
              }
            />
            <Button
              size="sm"
              className="mt-3 rounded-md"
              onClick={() => toast({ description: 'تغییرات کسب و کار ذخیره شد.' })}
            >
              ثبت تغییرات
            </Button>
          </PanelCard>

          {/* تصاویر مربوطه */}
          <PanelCard>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">
                افزودن تصاویر مربوطه <span className="text-xs font-normal text-muted-foreground">(محصولات | شرکت | کارکنان)</span>
              </p>
              {sectionBadge(gallery.length > 0)}
            </div>
            <div className="mt-3">
              <ImageDropzone
                photos={gallery}
                onAdd={(files) => addPhotos(setGallery, files)}
                onRemove={(id) => setGallery((prev) => prev.filter((p) => p.id !== id))}
              />
            </div>
          </PanelCard>

          {/* گواهی های مربوطه */}
          <PanelCard>
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold">
                افزودن گواهی های مربوطه{' '}
                <span className="text-xs font-normal text-muted-foreground">(گواهی های ثبت شرکت | استاندارد محصول)</span>
              </p>
              {sectionBadge(certs.length > 0)}
            </div>
            <div className="mt-3">
              <ImageDropzone
                photos={certs}
                onAdd={(files) => addPhotos(setCerts, files)}
                onRemove={(id) => setCerts((prev) => prev.filter((p) => p.id !== id))}
              />
            </div>
            <Button
              size="sm"
              className="mt-3 rounded-md"
              onClick={() => toast({ description: 'تصاویر ثبت شد.' })}
            >
              <Camera size={14} /> ثبت تصاویر
            </Button>
          </PanelCard>
        </div>

        {/* ستون کنار — سنجه و ارتقا (فقط دسکتاپ) */}
        <aside className="hidden space-y-4 lg:block">
          <PanelCard>
            <p className="text-xs font-bold">میزان تکمیل پروفایل</p>
            <p className="mt-1 text-2xl font-extrabold text-primary">{toFa(completion)}٪</p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  'h-full rounded-full transition-all',
                  completion >= 85 ? 'bg-emerald-500' : completion >= 55 ? 'bg-amber-500' : 'bg-red-400',
                )}
                style={{ width: `${Math.max(6, completion)}%` }}
              />
            </div>
            <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
              پروفایل کامل = اعتماد بیشتر در معاملات. هر بخش را که کامل کنید، این عدد بالا می‌رود.
            </p>
          </PanelCard>

          <PanelCard>
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <ShieldCheck size={16} className="shrink-0 text-sky-600" />
              اطلاعات هویتی شما احراز نشده است.
            </p>
            <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
              با تایید هویت خود، برای {isBuyer ? 'فروشندگان، خریدار' : 'خریداران، فروشنده'} مطمئن‌تری باشید.
            </p>
            <Button asChild size="sm" className="mt-3 w-full rounded-md">
              <Link href="/panel/verification">احراز هویت کنید</Link>
            </Button>
          </PanelCard>

          <PanelCard>
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <BadgeCheck size={16} className="shrink-0 text-primary" />
              نمونه پروفایل تکمیل شده
            </p>
            <p className="mt-1.5 text-xs leading-6 text-muted-foreground">
              ببینید یک پروفایل حرفه‌ای چگونه اعتماد می‌سازد.
            </p>
            <Button asChild size="sm" variant="outline" className="mt-3 w-full rounded-md">
              <Link href="/profile/wbrstu2g1">مشاهده نمونه</Link>
            </Button>
          </PanelCard>
        </aside>
      </div>
    </div>
  );
}
