'use client';

/**
 * ویرایش پروفایل — عین صفحه buyer/profile باسکول + اطلاعات پایه (خواسته مالک):
 * ۱) اطلاعات پایه: نام/نام‌خانوادگی، استان/شهر (مکان پیش‌فرض فرم‌های ثبت آگهی)
 * ۲) آواتار پروفایل (آپلود واقعی — کامپوننت مشترک با ویو؛ دور ۱۶)
 * ۳) سنجه میزان تکمیل (دونی مشترک — وزن‌های ۱۰۰) + اطلاعات شما (موبایل/آدرس)
 * ۴) اطلاعات کسب و کار (نام + صنف + شماره ثبت) + درباره کسب‌وکار + تصاویر مربطه + گواهی‌ها
 *
 * خواسته مالک ۳-۱۱:
 *  - هر کارت دکمهٔ ذخیرهٔ مستقل خودش را دارد (نه یک دکمهٔ سراسری) و دکمهٔ
 *    «ثبت تغییرات» اولِ فرم حذف شد؛ آیکون بازگشت به سربرگ اضافه شد.
 *  - بخش «نقش شما در ایمچ» حذف شد — نقش از خود پنل (سوییچر آیمچ من) عوض می‌شود.
 *  - فیلد «صنف» (سوپرمارکت، قنادی، …) در اطلاعات کسب و کار — پایهٔ بازاریابی
 *    و تبلیغات آینده؛ «شماره ثبت شرکت» هم ساده شد به «شماره ثبت».
 *  - باکس «درباره کسب و کارتان» دو برابر بلندتر شد.
 */

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import {
  ArrowRight,
  Building2,
  Camera,
  FileCheck2,
  ImageIcon,
  Info,
  Pencil,
  Save,
  ShieldCheck,
  Trash2,
  UserRound,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { uploadImage, deleteImage } from '@/lib/api/client';
import { usePanelProfile, useUpdatePanelProfile, useProvinces, useCities } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PanelCard } from '@/components/panel/panel-parts';
import { AvatarUpload } from '@/components/panel/avatar-upload';
import { CompletionMeter } from '@/components/panel/completion-meter';
import { VerifyCard } from '@/components/panel/verify-card';
import { PasswordChangeCard } from '@/components/panel/password-change-card';
import { computeProfileCompletion } from '@/lib/profile-completion';
import { toFa } from '@/lib/format';

interface FormState {
  firstName: string;
  lastName: string;
  provinceId: string;
  cityId: string;
  address: string;
  isCompany: boolean;
  companyName: string;
  companyRegisterNumber: string;
  /** صنف کسب‌وکار (خواسته مالک ۳-۱۱) — سوپرمارکت/قنادی/… */
  businessCategory: string;
  about: string;
  gallery: ProfileImage[]; // تصاویر مربطه — سروری + آپلودی تازه
  certificates: ProfileImage[]; // گواهی‌ها — سروری + آپلودی تازه
}

/** تصویر پروفایل — سروری (id دارد) یا تازه (file دارد که موقع ثبت آپلود می‌شود) */
interface ProfileImage {
  id?: string;
  url: string;
  file?: File;
}

const ABOUT_HINTS = [
  '۱- در چه زمینه ای فعالیت می کنید؟',
  '۲- بازار فعالیت شما داخلی است یا خارجی؟',
  '۳- چند سال سابقه فعالیت دارید؟',
];

/** پیشنهادهای رایج صنف (خواسته مالک ۳-۱۱) — datalist؛ ورودی آزاد هم مجاز است */
const BUSINESS_CATEGORY_SUGGESTIONS = [
  'سوپرمارکت',
  'قنادی',
  'خشک‌فروشی',
  'آجیل و خشکبار',
  'میوه‌فروشی',
  'پروتئینی (گوشت و مرغ)',
  'نانوایی',
  'رستوران',
  'کافی‌شاپ',
  'عمده‌فروشی',
  'توزیع‌کننده',
  'تولیدکننده',
];

/** ورودی فرمت‌شدهٔ ذخیرهٔ هر کارت — کلید همان کارت است که دکمه‌اش را busy نگه می‌دارد */
type SaveCard = 'base' | 'contact' | 'business' | 'about' | 'gallery' | 'certificates';

/** خطا + دکمهٔ ذخیرهٔ استاندارد پایین هر کارت — هم‌قد اینپوت‌ها (قانون ایمچ) */
function CardFooter({
  card,
  label,
  onClick,
  savingCard,
  errorMsg,
}: {
  card: SaveCard;
  label: string;
  onClick: () => void;
  savingCard: SaveCard | null;
  errorMsg?: string;
}) {
  return (
    <>
      {errorMsg && <p className="text-xs text-destructive">{errorMsg}</p>}
      <div className="flex justify-end">
        <Button className="h-12 rounded-md px-6 md:h-13" onClick={onClick} disabled={savingCard !== null}>
          <Save size={15} />
          {savingCard === card ? 'در حال ذخیره…' : label}
        </Button>
      </div>
    </>
  );
}

export default function EditProfilePage() {
  const { data: profile } = usePanelProfile();
  const save = useUpdatePanelProfile();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const [form, setForm] = useState<FormState | null>(null);
  const [savingCard, setSavingCard] = useState<SaveCard | null>(null);
  /** خطای مختص همان کارت — زیر دکمه‌اش نمایش داده می‌شود */
  const [cardError, setCardError] = useState<{ card: SaveCard; msg: string } | null>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);

  const { data: provinces } = useProvinces();
  const { data: cities } = useCities(form?.provinceId ? Number(form.provinceId) : undefined);

  if (!profile) {
    return <div className="grid h-64 place-items-center text-sm text-muted-foreground">در حال بارگذاری…</div>;
  }

  const { userInfo: u } = profile;

  // فرم یک‌بار از دیتای سرور پر می‌شود (الگوی controlled-late)
  if (!form) {
    const pf = profile.profile;
    setForm({
      firstName: u.firstName,
      lastName: u.lastName,
      provinceId: u.provinceId != null ? String(u.provinceId) : '',
      cityId: u.cityId != null ? String(u.cityId) : '',
      address: (pf.address ?? '').replace(' - ', '، '),
      isCompany: pf.isCompany,
      companyName: pf.companyName ?? '',
      companyRegisterNumber: pf.companyRegisterNumber ?? '',
      businessCategory: pf.businessCategory ?? '',
      about: pf.description ?? '',
      // گالری/گواهی‌ها از سرور — تصاویر ذخیره‌شده قبلی دیده و قابل حذف‌اند
      gallery: profile.gallery.map((f) => ({ id: f.id, url: f.thumbUrl ?? f.url })),
      certificates: profile.certificates.map((f) => ({ id: f.id, url: f.thumbUrl ?? f.url })),
    });
    return <div className="grid h-64 place-items-center text-sm text-muted-foreground">در حال بارگذاری…</div>;
  }

  const patch = (p: Partial<FormState>) => setForm((f) => (f ? { ...f, ...p } : f));

  // ─── میزان تکمیل پروفایل — سنجهٔ مشترک با ویو (وزن‌ها = ۱۰۰؛ دور ۱۶)؛
  // از فرم زنده محاسبه می‌شود تا کاربر اثر هر فیلد را همان لحظه ببیند ───
  const { pct, quality, sections } = computeProfileCompletion({
    firstName: form.firstName,
    lastName: form.lastName,
    provinceId: form.provinceId || null,
    cityId: form.cityId || null,
    address: form.address,
    companyName: form.companyName,
    about: form.about,
    avatarUrl: u.avatarUrl,
    galleryCount: form.gallery.length,
    certificatesCount: form.certificates.length,
    isVerified: u.isVerified,
  });

  /** ذخیرهٔ مستقل یک کارت (خواسته مالک ۳-۱۱) — فقط فیلدهای همان کارت می‌روند */
  const persist = async (
    card: SaveCard,
    fields: Parameters<typeof save.mutateAsync>[0],
    okMsg = 'تغییرات با موفقیت ذخیره شد.',
  ) => {
    setCardError(null);
    setSavingCard(card);
    try {
      await save.mutateAsync(fields);
      await refreshUser(); // نام هدر تازه شود
      await queryClient.invalidateQueries({ queryKey: ['panel-profile'] });
      toast({ description: okMsg });
    } catch (err) {
      setCardError({
        card,
        msg: err instanceof Error ? err.message : 'خطا در ذخیره — دوباره تلاش کنید.',
      });
    } finally {
      setSavingCard(null);
    }
  };

  const saveBase = () => {
    if (form.firstName.trim().length < 2 || form.lastName.trim().length < 2) {
      setCardError({ card: 'base', msg: 'نام و نام خانوادگی را کامل وارد کنید.' });
      return;
    }
    void persist(
      'base',
      {
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        province_id: form.provinceId ? Number(form.provinceId) : null,
        city_id: form.cityId ? Number(form.cityId) : null,
      },
      'اطلاعات پایه ذخیره شد.',
    );
  };

  /** خطای مختص کارت — فقط زیر همان کارت دیده می‌شود */
  const errOf = (card: SaveCard) => (cardError?.card === card ? cardError.msg : undefined);

  const addImages = (files: FileList | null, key: 'gallery' | 'certificates') => {
    if (!files) return;
    const max = key === 'gallery' ? 8 : 4;
    const slots = max - form[key].length;
    Array.from(files)
      .slice(0, Math.max(0, slots))
      .forEach((file) => {
        if (!/image\/(jpeg|jpg|png|webp)/.test(file.type)) {
          toast({ description: 'تصویر از نوع jpeg، jpg، png یا webp باشد.' });
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast({ description: 'حجم تصویر باید کمتر از ۵ مگابایت باشد.' });
          return;
        }
        const reader = new FileReader();
        reader.onload = () =>
          patch({ [key]: [...form[key], { url: String(reader.result), file }] } as Partial<FormState>);
        reader.readAsDataURL(file);
      });
    if (Array.from(files).length > Math.max(0, slots)) {
      toast({ description: `حداکثر ${toFa(max)} تصویر — بقیه نادیده گرفته شد.` });
    }
  };

  /** حذف تصویر — سروری: حذف فوری از بک‌اند؛ تازه: فقط از فرم */
  const removeImage = async (key: 'gallery' | 'certificates', index: number) => {
    const img = form[key][index];
    patch({ [key]: form[key].filter((_, j) => j !== index) } as Partial<FormState>);
    if (img.id) {
      try {
        await deleteImage(img.id);
        await queryClient.invalidateQueries({ queryKey: ['panel-profile'] });
      } catch (err) {
        toast({ description: err instanceof Error ? err.message : 'حذف تصویر ناموفق بود.' });
      }
    }
  };

  /** ثبت تصاویر تازهٔ یک کارت — آپلود واقعی، بعد نشانه‌گذاری به‌عنوان ذخیره‌شده */
  const saveImages = async (key: 'gallery' | 'certificates') => {
    const pending = form[key].filter((i) => i.file);
    if (pending.length === 0) {
      toast({ description: 'تصویر تازه‌ای برای ثبت وجود ندارد — ابتدا تصویر انتخاب کنید.' });
      return;
    }
    setCardError(null);
    setSavingCard(key);
    try {
      for (const img of pending) {
        if (!img.file) continue;
        await uploadImage(img.file, {
          model: 'User',
          modelId: u.id,
          key: key === 'gallery' ? 'gallery' : 'certificate',
          replace: false, // چند‌تایی — اسلات‌ها انباشته می‌شوند
        });
      }
      await queryClient.invalidateQueries({ queryKey: ['panel-profile'] });
      // تصاویر آپلودشده تازه → فرم با نسخهٔ سروری (id دار) دوباره پر شود
      setForm((f) =>
        f
          ? {
              ...f,
              [key]: f[key].map((i) => (i.file ? { ...i, file: undefined } : i)),
            }
          : f,
      );
      toast({ description: key === 'gallery' ? 'تصاویر مربطه ثبت شد.' : 'گواهی‌ها ثبت شدند.' });
    } catch (err) {
      setCardError({
        card: key,
        msg: err instanceof Error ? err.message : 'خطا در ثبت تصاویر — دوباره تلاش کنید.',
      });
    } finally {
      setSavingCard(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PanelCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            {/* بازگشت (خواسته مالک ۳-۱۱) — دایره‌ای، فلش راست‌گرد (قانون ایمچ) */}
            <Button
              asChild
              variant="outline"
              size="icon"
              className="size-11 shrink-0 rounded-full"
              aria-label="بازگشت به آیمچ من"
              title="بازگشت"
            >
              <Link href="/panel">
                <ArrowRight size={17} />
              </Link>
            </Button>
            {/* آواتار — کلیک = آپلود تصویر جدید (کامپوننت مشترک با ویو — دور ۱۶) */}
            <AvatarUpload
              userId={u.id}
              name={form.firstName}
              avatarUrl={u.avatarUrl}
              className="size-16"
              initialClass="text-xl"
            />
            <div>
              <h1 className="text-base font-extrabold sm:text-lg">ویرایش پروفایل</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {u.firstName} {u.lastName} — <span dir="ltr" className="font-mono">{toFa(u.phone)}</span>
              </p>
            </div>
          </div>
        </div>

        {/* میزان تکمیل پروفایل — دونی فشرده؛ ریز درصدها با کلیک (دور ۱۶) */}
        <CompletionMeter className="mt-4" pct={pct} quality={quality} sections={sections} />
      </PanelCard>

      {/* احراز هویت — باکس مشترک با ویو؛ فقط برای احرازنشده (دور ۱۶) */}
      {!u.isVerified && <VerifyCard />}

      {/* اطلاعات پایه — نام + مکان پیش‌فرض؛ ذخیرهٔ مستقل خودش (خواسته مالک ۳-۱۱) */}
      <PanelCard className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-extrabold">
          <UserRound size={17} className="text-primary" /> اطلاعات پایه
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first-name">نام <span className="text-red-500">*</span></Label>
            <Input
              id="first-name"
              value={form.firstName}
              onChange={(e) => patch({ firstName: e.target.value })}
              placeholder="مثلا: علی"
              maxLength={60}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last-name">نام خانوادگی <span className="text-red-500">*</span></Label>
            <Input
              id="last-name"
              value={form.lastName}
              onChange={(e) => patch({ lastName: e.target.value })}
              placeholder="مثلا: رضایی"
              maxLength={60}
            />
          </div>
        </div>

        {/* مکان پیش‌فرض — فرم‌های ثبت آگهی/درخواست با آن پیش‌پر می‌شوند */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="province">استان <span className="text-red-500">*</span></Label>
            <Select
              value={form.provinceId}
              onValueChange={(v) => patch({ provinceId: v, cityId: '' })}
            >
              <SelectTrigger id="province" className="w-full">
                <SelectValue placeholder="انتخاب استان" />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {(provinces ?? []).map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">شهر <span className="text-red-500">*</span></Label>
            <Select value={form.cityId} onValueChange={(v) => patch({ cityId: v })} disabled={!form.provinceId}>
              <SelectTrigger id="city" className="w-full">
                <SelectValue placeholder={form.provinceId ? 'انتخاب شهر' : 'ابتدا استان را انتخاب کنید'} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {(cities ?? []).map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <p className="text-[11px] leading-5 text-muted-foreground">
          استان و شهر شما در فرم ثبت محصول/درخواست خرید به‌صورت پیش‌فرض انتخاب می‌شود؛ در هر ثبت قابل تغییر است.
        </p>
        <CardFooter
          card="base"
          label="ذخیره اطلاعات پایه"
          onClick={saveBase}
          savingCard={savingCard}
          errorMsg={errOf('base')}
        />
      </PanelCard>

      {/* اطلاعات شما */}
      <PanelCard className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-extrabold">
          <Info size={17} className="text-primary" /> اطلاعات شما
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="phone">شماره موبایل <span className="text-red-500">*</span></Label>
            <Input id="phone" dir="ltr" value={toFa(u.phone)} readOnly className="bg-secondary/60 text-center" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">آدرس</Label>
            <Input
              id="address"
              value={form.address}
              onChange={(e) => patch({ address: e.target.value })}
              placeholder="مثلا: تهران، تهران"
            />
          </div>
        </div>

        {/* امنیت شماره موبایل (خواستهٔ مالک ۱-۱۱): شمارهٔ شما هرگز در دیتای
            عمومی نیست؛ فقط با دکمهٔ «شماره تماس» و برای اعضای واردشده
            از سرویس اختصاصی ایمچ آشکار می‌شود. */}
        <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-[11px] leading-6 text-muted-foreground">
          <ShieldCheck size={15} className="mt-0.5 shrink-0 text-primary" />
          <p>
            شماره موبایل شما در هیچ صفحهٔ عمومی نمایش داده نمی‌شود؛ خریداران فقط با دکمهٔ
            «شماره تماس» و پس از ورود به ایمچ آن را می‌بینند (سهمیهٔ تماس روزانهٔ اعضا اعمال می‌شود).
          </p>
        </div>
        <CardFooter
          card="contact"
          label="ذخیره آدرس"
          onClick={() =>
            void persist('contact', { address: form.address.trim() || null }, 'آدرس ذخیره شد.')
          }
          savingCard={savingCard}
          errorMsg={errOf('contact')}
        />
      </PanelCard>

      {/* اطلاعات کسب و کار — صنف جدید (خواسته مالک ۳-۱۱) + «شماره ثبت» ساده‌شده؛
          همیشه نمایان است (خواسته مالک ۱-۱۱)؛ پر کردن «نام شرکت» آن را
          فعال می‌کند و در پروفایل/پروفایل عمومی + شماره ثبت نمایش داده می‌شود. */}
      <PanelCard className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-extrabold">
          <Building2 size={17} className="text-primary" /> اطلاعات کسب و کار
        </h2>
        <p className="text-xs leading-6 text-muted-foreground">
          با تکمیل اطلاعات کسب و کار، اعتبار حساب خود را بیشتر کنید — خالی بماند، در پروفایل شما نمایش داده نمی‌شود.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="company">نام شرکت</Label>
            <Input
              id="company"
              value={form.companyName}
              onChange={(e) => patch({ companyName: e.target.value, isCompany: e.target.value.trim().length > 0 })}
              placeholder="نام شرکت یا مجموعه"
              maxLength={120}
            />
          </div>
          <div className="space-y-2">
            {/* صنف (خواسته مالک ۳-۱۱) — پایهٔ بازاریابی/تبلیغات؛ ورودی آزاد + پیشنهادها */}
            <Label htmlFor="business-category">صنف</Label>
            <Input
              id="business-category"
              value={form.businessCategory}
              onChange={(e) => patch({ businessCategory: e.target.value })}
              placeholder="مثلا: سوپرمارکت، قنادی…"
              maxLength={60}
              list="business-category-suggestions"
            />
            <datalist id="business-category-suggestions">
              {BUSINESS_CATEGORY_SUGGESTIONS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <p className="text-[11px] text-muted-foreground">
              حوزهٔ فعالیتتان را بنویسید — برای معرفی بهتر شما به خریداران هم‌صنف کاربرد دارد.
            </p>
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            {/* «شماره ثبت شرکت» → «شماره ثبت» (خواسته مالک ۳-۱۱) — شخصی هم معنا دارد */}
            <Label htmlFor="company-reg">شماره ثبت</Label>
            <Input
              id="company-reg"
              inputMode="numeric"
              value={form.companyRegisterNumber}
              onChange={(e) => patch({ companyRegisterNumber: e.target.value.replace(/[^\d]/g, '').slice(0, 12) })}
              placeholder="مثلا: ۱۲۳۴۵۶"
              className="text-center"
            />
          </div>
        </div>
        <CardFooter
          card="business"
          label="ذخیره اطلاعات کسب و کار"
          onClick={() =>
            void persist(
              'business',
              {
                isCompany: Boolean(form.companyName.trim()),
                companyName: form.companyName.trim(),
                // شماره ثبت — ماندگار در پروفایل embedded (دور ۱۶)
                companyRegisterNumber: form.companyRegisterNumber.trim(),
                businessCategory: form.businessCategory.trim(),
              },
              'اطلاعات کسب و کار ذخیره شد.',
            )
          }
          savingCard={savingCard}
          errorMsg={errOf('business')}
        />
      </PanelCard>

      {/* درباره کسب و کار — ارتفاع دو برابر (خواسته مالک ۳-۱۱) */}
      <PanelCard className="space-y-3">
        <h2 className="text-sm font-extrabold">درباره کسب و کارتان بنویسید</h2>
        <div className="rounded-md bg-secondary/60 p-3">
          <p className="text-xs font-bold">در بخش «درباره کسب و کارتان بنویسید» به این سوالات پاسخ دهید:</p>
          <ul className="mt-2 space-y-1">
            {ABOUT_HINTS.map((h) => (
              <li key={h} className="text-[11px] leading-5 text-muted-foreground">{h}</li>
            ))}
          </ul>
        </div>
        <Textarea
          dir="rtl"
          rows={14}
          value={form.about}
          onChange={(e) => patch({ about: e.target.value })}
          className="min-h-32 resize-none text-sm leading-7"
          placeholder="اینجا بنویسید"
        />
        <div className="flex items-center justify-between text-[11px]">
          <span className={form.about.trim().length >= 100 ? 'text-emerald-600' : 'text-muted-foreground'}>
            {form.about.trim().length >= 100 ? 'کافی' : 'کمی طولانی‌تر بنویسید تا اعتماد طرف مقابل جلب شود'}
          </span>
        </div>
        <CardFooter
          card="about"
          label="ثبت تغییرات"
          onClick={() => void persist('about', { description: form.about.trim() || null }, 'متن «درباره کسب و کار» ذخیره شد.')}
          savingCard={savingCard}
          errorMsg={errOf('about')}
        />
      </PanelCard>

      {/* تصاویر مربطه */}
      <PanelCard>
        <h2 className="flex items-center gap-2 text-sm font-extrabold">
          <Camera size={17} className="text-primary" /> افزودن تصاویر مربطه
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">(محصولات | شرکت | کارکنان)</p>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="mt-3 grid w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border bg-secondary/40 p-6 text-center transition-colors hover:border-primary/50 hover:bg-secondary/70"
          aria-label="افزودن تصویر مربطه"
        >
          <ImageIcon size={22} className="text-muted-foreground" />
          <span className="mt-2 text-xs font-bold">انتخاب تصویر</span>
          <span className="mt-0.5 text-[11px] text-muted-foreground">یا کلیک کنید — jpeg/jpg/png/webp، حداکثر ۵ مگابایت</span>
        </button>
        <input
          ref={galleryRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            addImages(e.target.files, 'gallery');
            e.target.value = '';
          }}
        />
        <p className="mt-3 text-xs font-bold">تصاویر ثبت شده</p>
        {form.gallery.length === 0 ? (
          <p className="mt-2 rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            هنوز تصویری ثبت نشده است
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-3">
            {form.gallery.map((img, i) => (
              <div key={img.id ?? img.url} className="relative size-20 overflow-hidden rounded-md border bg-secondary">
                {/* تصویر ذخیره‌شده سروری یا پیش‌نمایش محلی آپلود تازه */}
                <img src={img.url} alt="تصویر مربطه" className="size-full object-cover" />
                {img.file && (
                  <span className="absolute bottom-1 start-1 rounded-full bg-primary px-1.5 text-[9px] font-bold text-primary-foreground">جدید</span>
                )}
                <button
                  type="button"
                  aria-label="حذف تصویر"
                  onClick={() => void removeImage('gallery', i)}
                  className="absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-red-500"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 space-y-2">
          <CardFooter
            card="gallery"
            label="ثبت تصاویر"
            onClick={() => void saveImages('gallery')}
            savingCard={savingCard}
            errorMsg={errOf('gallery')}
          />
        </div>
      </PanelCard>

      {/* گواهی های مربطه */}
      <PanelCard>
        <h2 className="flex items-center gap-2 text-sm font-extrabold">
          <FileCheck2 size={17} className="text-primary" /> افزودن گواهی های مربطه
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">(گواهی های ثبت شرکت | استاندارد محصول)</p>
        <button
          type="button"
          onClick={() => certRef.current?.click()}
          className="mt-3 grid w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border bg-secondary/40 p-6 text-center transition-colors hover:border-primary/50 hover:bg-secondary/70"
          aria-label="افزودن گواهی"
        >
          <FileCheck2 size={22} className="text-muted-foreground" />
          <span className="mt-2 text-xs font-bold">انتخاب تصویر</span>
          <span className="mt-0.5 text-[11px] text-muted-foreground">یا کلیک کنید — jpeg/jpg/png/webp، حداکثر ۵ مگابایت</span>
        </button>
        <input
          ref={certRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            addImages(e.target.files, 'certificates');
            e.target.value = '';
          }}
        />
        <p className="mt-3 text-xs font-bold">تصاویر ثبت شده</p>
        {form.certificates.length === 0 ? (
          <p className="mt-2 rounded-md border border-dashed p-4 text-center text-xs text-muted-foreground">
            هنوز تصویری ثبت نشده است
          </p>
        ) : (
          <div className="mt-2 flex flex-wrap gap-3">
            {form.certificates.map((img, i) => (
              <div key={img.id ?? img.url} className="relative size-20 overflow-hidden rounded-md border bg-secondary">
                {/* گواهی ذخیره‌شده سروری یا پیش‌نمایش محلی آپلود تازه */}
                <img src={img.url} alt="گواهی" className="size-full object-cover" />
                {img.file && (
                  <span className="absolute bottom-1 start-1 rounded-full bg-primary px-1.5 text-[9px] font-bold text-primary-foreground">جدید</span>
                )}
                <button
                  type="button"
                  aria-label="حذف گواهی"
                  onClick={() => void removeImage('certificates', i)}
                  className="absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-red-500"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 space-y-2">
          <CardFooter
            card="certificates"
            label="ثبت گواهی‌ها"
            onClick={() => void saveImages('certificates')}
            savingCard={savingCard}
            errorMsg={errOf('certificates')}
          />
        </div>
      </PanelCard>

      {/* تغییر رمز عبور — فقط کاربرِ رمزدار (خواسته مالک ۲-۱۱) */}
      <PasswordChangeCard />

      {/* میانبر پروفایل عمومی */}
      <PanelCard className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">پروفایل عمومی شما برای طرف مقابل چطور دیده می‌شود؟</p>
        <Button asChild size="sm" variant="outline" className="rounded-md text-xs">
          <Link href="/panel/profile">
            <Pencil size={14} /> مشاهده پروفایل من
          </Link>
        </Button>
      </PanelCard>
    </div>
  );
}
