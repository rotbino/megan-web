'use client';

/**
 * ویرایش پروفایل — عین صفحه buyer/profile باسکول + اطلاعات پایه (خواسته مالک):
 * ۱) اطلاعات پایه: نقش (رادیو فروشنده/خریدار — سیستم با آن تطبیق می‌یابد)،
 *    نام/نام‌خانوادگی، استان/شهر (مکان پیش‌فرض فرم‌های ثبت آگهی)
 * ۲) آواتار پروفایل (آپلود واقعی — هدر و پنل از آن استفاده می‌کنند)
 * ۳) سنجه میزان تکمیل + اطلاعات شما (موبایل/آدرس) + سوییچ نمایش شماره
 * ۴) اطلاعات حقوقی + درباره کسب‌وکار + تصاویر مربوطه + گواهی‌ها
 */

import { useRef, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Building2,
  Camera,
  FileCheck2,
  ImageIcon,
  Info,
  Loader2,
  Pencil,
  Phone,
  Save,
  ShoppingCart,
  Store,
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
import { uploadImage } from '@/lib/api/client';
import { usePanelProfile, useUpdatePanelProfile, useProvinces, useCities } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PanelCard } from '@/components/panel/panel-parts';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

interface FormState {
  firstName: string;
  lastName: string;
  provinceId: string;
  cityId: string;
  address: string;
  publicPhoneVisible: boolean;
  isCompany: boolean;
  companyName: string;
  companyRegisterNumber: string;
  about: string;
  gallery: string[]; // data-url تصاویر مربوطه
  certificates: string[]; // data-url گواهی‌ها
}

const ABOUT_HINTS = [
  '۱- در چه زمینه ای فعالیت می کنید؟',
  '۲- بازار فعالیت شما داخلی است یا خارجی؟',
  '۳- چند سال سابقه فعالیت دارید؟',
];

export default function EditProfilePage() {
  const { data: profile } = usePanelProfile();
  const save = useUpdatePanelProfile();
  const { toast } = useToast();
  const { user, setRole, refreshUser } = useAuth();
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const galleryRef = useRef<HTMLInputElement>(null);
  const certRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

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
      publicPhoneVisible: Boolean(pf.publicPhone),
      isCompany: pf.isCompany,
      companyName: pf.companyName ?? '',
      companyRegisterNumber: '',
      about: pf.description ?? '',
      gallery: [],
      certificates: [],
    });
    return <div className="grid h-64 place-items-center text-sm text-muted-foreground">در حال بارگذاری…</div>;
  }

  const patch = (p: Partial<FormState>) => setForm((f) => (f ? { ...f, ...p } : f));

  // ─── میزان تکمیل پروفایل — وزن‌گذاری عین باسکول (٪ بخش‌ها) ───
  const sections = [
    { label: 'اطلاعات پایه', pct: 15, done: Boolean(form.firstName.trim() && form.lastName.trim() && form.provinceId && form.cityId) },
    { label: 'اطلاعات شما', pct: 8, done: Boolean(form.address.trim()) },
    { label: 'اطلاعات حقوقی', pct: 8, done: form.isCompany && Boolean(form.companyName.trim()) },
    { label: 'درباره کسب و کار', pct: 11, done: form.about.trim().length >= 100 },
    { label: 'تصاویر مربوطه', pct: 8, done: form.gallery.length > 0 },
    { label: 'گواهی‌ها', pct: 8, done: form.certificates.length > 0 },
    { label: 'احراز هویت', pct: 34, done: u.isVerified },
  ];
  const completion = Math.min(100, sections.reduce((a, s) => a + (s.done ? s.pct : 0), 0));
  const completionLabel = completion >= 85 ? 'عالی' : completion >= 55 ? 'متوسط' : 'ضعیف';

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
        reader.onload = () => patch({ [key]: [...form[key], String(reader.result)] } as Partial<FormState>);
        reader.readAsDataURL(file);
      });
  };

  /** آپلود آواتار واقعی — uploads/uploadImage (User/avatar) + updateProfile */
  const uploadAvatar = async (file: File) => {
    if (!/^image\/(jpeg|jpg|png|webp)$/.test(file.type)) {
      toast({ description: 'تصویر از نوع jpeg، jpg، png یا webp باشد.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ description: 'حجم تصویر باید کمتر از ۵ مگابایت باشد.' });
      return;
    }
    setUploadingAvatar(true);
    try {
      const uploaded = await uploadImage(file, {
        model: 'User',
        modelId: u.id,
        key: 'avatar',
        replace: true,
      });
      await save.mutateAsync({ avatar_url: uploaded.url });
      await refreshUser(); // آواتار هدر همان لحظه به‌روز شود
      toast({ description: 'تصویر پروفایل به‌روزرسانی شد.' });
    } catch (err) {
      toast({ description: err instanceof Error ? err.message : 'آپلود تصویر ناموفق بود.' });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const saveAll = async () => {
    setError('');
    if (form.firstName.trim().length < 2 || form.lastName.trim().length < 2) {
      setError('نام و نام خانوادگی را کامل وارد کنید.');
      return;
    }
    try {
      await save.mutateAsync({
        first_name: form.firstName.trim(),
        last_name: form.lastName.trim(),
        province_id: form.provinceId ? Number(form.provinceId) : null,
        city_id: form.cityId ? Number(form.cityId) : null,
        address: form.address.trim() || null,
        publicPhone: form.publicPhoneVisible ? u.phone : null,
        description: form.about.trim() || null,
        isCompany: form.isCompany,
        companyName: form.isCompany ? form.companyName.trim() : '',
      });
      await refreshUser(); // نام/نقش هدر تازه شود
      toast({ description: 'تغییرات پروفایل شما با موفقیت ذخیره شد.' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در ذخیره — دوباره تلاش کنید.');
    }
  };

  const role = user?.role ?? (u.isSeller ? 'seller' : 'buyer');
  const avatarNode = u.avatarUrl ? (
    // آواتار واقعی — آپلودی همین فرم
    <img src={u.avatarUrl} alt="تصویر پروفایل" className="size-full rounded-full object-cover" />
  ) : (
    <span className="grid size-full place-items-center rounded-full bg-primary/10 text-xl font-extrabold text-primary">
      {(form.firstName || 'ک').charAt(0)}
    </span>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PanelCard>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            {/* آواتار — کلیک = آپلود تصویر جدید */}
            <button
              type="button"
              onClick={() => avatarRef.current?.click()}
              aria-label="تغییر تصویر پروفایل"
              title="تغییر تصویر پروفایل"
              className="group relative grid size-16 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full"
            >
              {avatarNode}
              <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
                {uploadingAvatar ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
              </span>
            </button>
            <input
              ref={avatarRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void uploadAvatar(file);
                e.target.value = '';
              }}
            />
            <div>
              <h1 className="text-base font-extrabold sm:text-lg">ویرایش پروفایل</h1>
              <p className="mt-1 text-xs text-muted-foreground">
                {u.firstName} {u.lastName} — <span dir="ltr" className="font-mono">{toFa(u.phone)}</span>
              </p>
            </div>
          </div>
          <Button className="rounded-md" onClick={() => void saveAll()} disabled={save.isPending}>
            <Save size={15} /> {save.isPending ? 'در حال ذخیره…' : 'ثبت تغییرات'}
          </Button>
        </div>

        {/* میزان تکمیل پروفایل */}
        <div className="mt-4 rounded-md bg-secondary/70 p-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold">میزان تکمیل پروفایل</span>
            <span className="font-extrabold">
              {toFa(completion)}٪ —{' '}
              <span className={cn(
                completionLabel === 'عالی' ? 'text-emerald-600' : completionLabel === 'متوسط' ? 'text-amber-600' : 'text-red-500',
              )}>
                {completionLabel}
              </span>
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                completionLabel === 'عالی' ? 'bg-emerald-500' : completionLabel === 'متوسط' ? 'bg-amber-500' : 'bg-red-400',
              )}
              style={{ width: `${Math.max(8, completion)}%` }}
            />
          </div>
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {sections.map((s) => (
              <span
                key={s.label}
                className={cn(
                  'rounded-full px-2 py-0.5 text-[10px] font-bold',
                  s.done ? 'bg-emerald-50 text-emerald-600' : 'bg-white text-muted-foreground',
                )}
              >
                {s.label} {toFa(s.pct)}٪
              </span>
            ))}
          </div>
        </div>

        {/* احراز هویت */}
        {!u.isVerified && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-sky-200 bg-sky-50 p-3">
            <p className="text-xs leading-5 text-sky-800">
              اطلاعات هویتی شما احراز نشده است. با احراز هویت، برای طرف مقابل مطمئن‌تر باشید.
            </p>
            <Button asChild size="sm" className="rounded-md">
              <Link href="/panel/verification">
                <BadgeCheck size={15} /> احراز هویت کنید
              </Link>
            </Button>
          </div>
        )}
      </PanelCard>

      {/* اطلاعات پایه — نقش + نام + مکان پیش‌فرض */}
      <PanelCard className="space-y-4">
        <h2 className="flex items-center gap-2 text-sm font-extrabold">
          <UserRound size={17} className="text-primary" /> اطلاعات پایه
        </h2>

        {/* نقش فعال — رادیو؛ سیستم (هدر/نوار پایین/منوها) با آن تطبیق می‌یابد */}
        <div>
          <p className="mb-2 text-xs font-bold">نقش شما در ایمچ</p>
          <div className="grid grid-cols-2 gap-3" role="radiogroup" aria-label="نقش شما در ایمچ">
            <button
              type="button"
              role="radio"
              aria-checked={role === 'seller'}
              onClick={() => setRole('seller')}
              className={cn(
                'flex items-start gap-2.5 rounded-lg border p-3 text-start transition-colors',
                role === 'seller'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40',
              )}
            >
              <Store size={19} className={cn('mt-0.5 shrink-0', role === 'seller' ? 'text-primary' : 'text-muted-foreground')} />
              <span>
                <span className="block text-sm font-bold">فروشنده</span>
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                  ثبت محصول، فروش به خریداران و مشاهده درخواست‌های خرید
                </span>
              </span>
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={role === 'buyer'}
              onClick={() => setRole('buyer')}
              className={cn(
                'flex items-start gap-2.5 rounded-lg border p-3 text-start transition-colors',
                role === 'buyer'
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40',
              )}
            >
              <ShoppingCart size={19} className={cn('mt-0.5 shrink-0', role === 'buyer' ? 'text-primary' : 'text-muted-foreground')} />
              <span>
                <span className="block text-sm font-bold">خریدار</span>
                <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                  ثبت درخواست خرید و مشاهده فروشندگان پیشنهادی
                </span>
              </span>
            </button>
          </div>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            با تغییر نقش، منوها و لینک‌های ایمچ خودکار با نقش شما تطبیق می‌یابند.
          </p>
        </div>

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
        {error && <p className="text-xs text-destructive">{error}</p>}
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

        {/* نمایش شماره به فروشندگان */}
        <div className="flex items-center justify-between rounded-md border p-3">
          <div className="flex items-center gap-2 text-xs">
            <Phone size={15} className="text-muted-foreground" />
            <span className="font-bold">نمایش شماره به فروشندگان</span>
            <span className="text-muted-foreground">
              {form.publicPhoneVisible ? 'فعال است' : 'غیرفعال'}
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={form.publicPhoneVisible}
            aria-label="نمایش شماره به فروشندگان"
            onClick={() => patch({ publicPhoneVisible: !form.publicPhoneVisible })}
            className={cn(
              'relative h-6 w-11 rounded-full transition-colors',
              form.publicPhoneVisible ? 'bg-emerald-500' : 'bg-border',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 size-5 rounded-full bg-white shadow transition-all',
                form.publicPhoneVisible ? 'left-0.5' : 'left-[calc(100%-1.375rem)]',
              )}
            />
          </button>
        </div>
      </PanelCard>

      {/* اطلاعات حقوقی */}
      <PanelCard className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <Building2 size={17} className="text-primary" /> افزودن اطلاعات حقوقی
          </h2>
          <Button
            size="sm"
            variant={form.isCompany ? 'outline' : 'default'}
            className="rounded-md text-xs"
            onClick={() => patch({ isCompany: !form.isCompany })}
          >
            {form.isCompany ? 'حذف اطلاعات حقوقی' : 'افزودن اطلاعات حقوقی'}
          </Button>
        </div>
        <p className="text-xs leading-6 text-muted-foreground">
          با تکمیل اطلاعات حقوقی، اعتبار حساب خود را بیشتر کنید.
        </p>
        {form.isCompany && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="company">نام شرکت <span className="text-red-500">*</span></Label>
              <Input
                id="company"
                value={form.companyName}
                onChange={(e) => patch({ companyName: e.target.value })}
                placeholder="نام شرکت یا مجموعه"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company-reg">شماره ثبت شرکت <span className="text-red-500">*</span></Label>
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
        )}
      </PanelCard>

      {/* درباره کسب و کار */}
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
          rows={7}
          value={form.about}
          onChange={(e) => patch({ about: e.target.value })}
          className="resize-none text-sm leading-7"
          placeholder="اینجا بنویسید"
        />
        <div className="flex items-center justify-between text-[11px]">
          <span className={cn(form.about.trim().length >= 100 ? 'text-emerald-600' : 'text-muted-foreground')}>
            {form.about.trim().length >= 100 ? 'کافی' : 'کمی طولانی‌تر بنویسید تا اعتماد طرف مقابل جلب شود'}
          </span>
          <Button size="sm" className="rounded-md" onClick={() => void saveAll()} disabled={save.isPending}>
            ثبت تغییرات
          </Button>
        </div>
      </PanelCard>

      {/* تصاویر مربوطه */}
      <PanelCard>
        <h2 className="flex items-center gap-2 text-sm font-extrabold">
          <Camera size={17} className="text-primary" /> افزودن تصاویر مربوطه
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">(محصولات | شرکت | کارکنان)</p>
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          className="mt-3 grid w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border bg-secondary/40 p-6 text-center transition-colors hover:border-primary/50 hover:bg-secondary/70"
          aria-label="افزودن تصویر مربوطه"
        >
          <ImageIcon size={22} className="text-muted-foreground" />
          <span className="mt-2 text-xs font-bold">تصویر را اینجا رها کنید</span>
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
            {form.gallery.map((url, i) => (
              <div key={i} className="relative size-20 overflow-hidden rounded-md border bg-secondary">
                {/* پیش‌نمایش محلی تصویر آپلودی */}
                <img src={url} alt="تصویر مربوطه" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label="حذف تصویر"
                  onClick={() => patch({ gallery: form.gallery.filter((_, j) => j !== i) })}
                  className="absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-red-500"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </PanelCard>

      {/* گواهی های مربوطه */}
      <PanelCard>
        <h2 className="flex items-center gap-2 text-sm font-extrabold">
          <FileCheck2 size={17} className="text-primary" /> افزودن گواهی های مربوطه
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">(گواهی های ثبت شرکت | استاندارد محصول)</p>
        <button
          type="button"
          onClick={() => certRef.current?.click()}
          className="mt-3 grid w-full cursor-pointer place-items-center rounded-lg border-2 border-dashed border-border bg-secondary/40 p-6 text-center transition-colors hover:border-primary/50 hover:bg-secondary/70"
          aria-label="افزودن گواهی"
        >
          <FileCheck2 size={22} className="text-muted-foreground" />
          <span className="mt-2 text-xs font-bold">تصویر را اینجا رها کنید</span>
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
            {form.certificates.map((url, i) => (
              <div key={i} className="relative size-20 overflow-hidden rounded-md border bg-secondary">
                {/* پیش‌نمایش محلی گواهی آپلودی */}
                <img src={url} alt="گواهی" className="size-full object-cover" />
                <button
                  type="button"
                  aria-label="حذف گواهی"
                  onClick={() => patch({ certificates: form.certificates.filter((_, j) => j !== i) })}
                  className="absolute left-1 top-1 grid size-6 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-red-500"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
        <Button className="mt-4 w-full rounded-md" onClick={() => void saveAll()} disabled={save.isPending}>
          <Save size={15} /> {save.isPending ? 'در حال ثبت تصاویر…' : 'ثبت تصاویر'}
        </Button>
      </PanelCard>

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
