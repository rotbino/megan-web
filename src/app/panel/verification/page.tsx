'use client';

/**
 * احراز هویت — ویزارد دو مرحله‌ای عین باسکول (خواسته مالک ۵-۱۱ و ۶-۱۱):
 * گام ۱: تصویر روی کارت ملی + پشت کارت ملی (فقط نمونهٔ صحیح کنار فرم؛
 *        نمونه‌های غلط و راهنمای کامل در /help/verify-account)
 * گام ۲: سلفی همراه با کارت ملی و گواهی دست‌نوشته
 *   — زیر سلفی: تصویر جواز کسب یا آگهی ثبت شرکت (اختیاری — اعتبار بیشتر)
 *
 * مدارک در یک درخواست multipart ارسال می‌شوند (اتمیک) — پیش‌نمایش objectURL،
 * آپلود فقط لحظه «ارسال نهایی» (دکترین فایل: نه حدسی وسط فرم).
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  BadgeCheck,
  BookOpen,
  Check,
  Copy,
  FileImage,
  Loader2,
  PenLine,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/panel/panel-parts';
import { useMyVerification, usePanelProfile, useSubmitVerification } from '@/lib/mock/hooks';
import type { VerificationDocKey } from '@/lib/mock/api';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

/** قواعد تصویر احراز: jpeg/jpg، ۴KB تا ۵MB (کفِ پایین‌تر با بهینه‌سازی کلاینت هماهنگ) */
const MAX_BYTES = 5 * 1024 * 1024;
const MIN_BYTES = 4 * 1024;

function validateImage(file: File): string | null {
  if (!/^image\/(jpeg|jpg)$/i.test(file.type)) return 'فرمت تصویر باید jpeg یا jpg باشد.';
  if (file.size > MAX_BYTES) return 'حجم تصویر نباید از ۵ مگابایت بیشتر باشد.';
  if (file.size < MIN_BYTES) return 'حجم تصویر بسیار کم است — تصویر واضح‌تری انتخاب کنید.';
  return null;
}

/** برچسب فارسی اسلات‌های مدرک — مشترک با نمای وضعیت */
const DOC_SLOTS: Array<{ key: VerificationDocKey; label: string }> = [
  { key: 'nationalCardFront', label: 'روی کارت ملی' },
  { key: 'nationalCardBack', label: 'پشت کارت ملی' },
  { key: 'selfieWithCard', label: 'سلفی با گواهی' },
  { key: 'registrationNotice', label: 'جواز کسب / آگهی ثبت' },
];

/** جعبه بارگذاری با پیش‌نمایش واقعی (objectURL) — عین فرم باسکول */
function UploadBox({
  label,
  hint,
  file,
  previewUrl,
  onPick,
  onClear,
}: {
  label: string;
  hint: string;
  file: File | null;
  previewUrl: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => !previewUrl && ref.current?.click()}
      onKeyDown={(e) => e.key === 'Enter' && !previewUrl && ref.current?.click()}
      className={cn(
        'relative grid w-full place-items-center overflow-hidden rounded-lg border-2 border-dashed p-3 text-center transition-colors',
        previewUrl
          ? 'cursor-default border-emerald-300 bg-emerald-50/50'
          : 'cursor-pointer border-border bg-secondary/40 hover:border-primary/50',
      )}
    >
      {previewUrl ? (
        <>
          {/* مدرک حساس — در پروکسی/CDN کش نشود */}
          <img src={previewUrl} alt={label} className="h-36 w-full rounded-md object-cover" />
          <button
            type="button"
            aria-label={`حذف ${label}`}
            className="absolute left-2 top-2 grid size-7 place-items-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            <XCircle size={16} />
          </button>
          <span className="mt-2 text-[11px] text-emerald-700">{file?.name}</span>
        </>
      ) : (
        <>
          <span className="grid size-11 place-items-center rounded-full bg-card text-primary shadow-sm">
            <FileImage size={20} />
          </span>
          <span className="mt-2 text-sm font-bold">{label}</span>
          <span className="mt-1 text-[11px] leading-5 text-muted-foreground">{hint}</span>
        </>
      )}
      <input
        ref={ref}
        type="file"
        accept="image/jpeg,image/jpg"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (f) onPick(f);
        }}
      />
    </div>
  );
}

/** نمونهٔ صحیح (کراپ‌شده از راهنمای باسکول) — فقط عکس درست کنار فرم؛
 * نمونه‌های غلط و راهنمای کامل در صفحهٔ راهنما */
function SampleImage({ src, caption }: { src: string; caption: string }) {
  return (
    <figure className="flex items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50/40 p-2.5">
      <img
        src={src}
        alt={caption}
        loading="lazy"
        className="h-24 w-auto shrink-0 rounded-md border border-emerald-200 bg-white object-contain"
      />
      <figcaption className="min-w-0 text-[11px] leading-5 text-muted-foreground">
        <span className="flex items-center gap-1 font-extrabold text-emerald-700">
          <Check size={13} /> نمونهٔ تصویر صحیح
        </span>
        {caption}
      </figcaption>
    </figure>
  );
}

/** متن گواهی دست‌نوشته — با نام خود کاربر + دکمه رونوشت (عین باسکول) */
function NoteTemplate({ fullName }: { fullName: string }) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const date = useMemo(() => new Date().toLocaleDateString('fa-IR'), []);
  const name = fullName.trim() || '................................';
  const text = `اینجانب ${name}، کارت ملی خود را جهت احراز هویت در ایمچ ارسال می‌نمایم.\nتاریخ: ${date}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ description: 'رونوشت ممکن نشد — متن را دستی بنویسید.' });
    }
  };

  return (
    <div className="space-y-2 rounded-lg border border-primary/25 bg-primary/5 p-3.5">
      <p className="flex items-center gap-1.5 text-xs font-extrabold text-primary">
        <PenLine size={14} /> متن گواهی دست‌نوشته
      </p>
      <p className="whitespace-pre-line rounded-md border border-dashed border-primary/35 bg-card px-3 py-2.5 text-center text-[13px] font-bold leading-7">
        {text}
      </p>
      <p className="text-[11px] leading-5 text-muted-foreground">
        این متن را با ماژیک، درشت و خوانا روی یک کاغذ سفید بنویسید، کارت ملی را به آن بچسبانید و همراه هر دو،
        از خودتان در نور کافی و بدون تاری سلفی واضح بگیرید (طبق نمونه زیر).
      </p>
      <Button type="button" variant="outline" size="sm" className="h-8 rounded-md text-[11px]" onClick={copy}>
        {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
        {copied ? 'رونوشت شد' : 'رونوشت متن'}
      </Button>
    </div>
  );
}

export default function VerificationPage() {
  const { toast } = useToast();
  const { data, isLoading } = useMyVerification();
  const submit = useSubmitVerification();
  const { data: profile } = usePanelProfile();

  const [step, setStep] = useState<1 | 2>(1);
  const [files, setFiles] = useState<Partial<Record<VerificationDocKey, File>>>({});
  const [urls, setUrls] = useState<Partial<Record<VerificationDocKey, string>>>({});
  const [error, setError] = useState<string | null>(null);

  // پیش‌نمایش موقت — cleanup بعد از unmount/تعویض
  useEffect(
    () => () => {
      for (const u of Object.values(urls)) if (u) URL.revokeObjectURL(u);
    },
    [urls],
  );

  const pick = (key: VerificationDocKey, file: File) => {
    const problem = validateImage(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setUrls((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key]!);
      return { ...prev, [key]: URL.createObjectURL(file) };
    });
    setFiles((prev) => ({ ...prev, [key]: file }));
  };

  const clear = (key: VerificationDocKey) => {
    setUrls((prev) => {
      if (prev[key]) URL.revokeObjectURL(prev[key]!);
      const next = { ...prev };
      delete next[key];
      return next;
    });
    setFiles((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const step1Ready = !!files.nationalCardFront && !!files.nationalCardBack;
  const step2Ready = !!files.selfieWithCard;

  const send = async () => {
    if (!step1Ready || !step2Ready || submit.isPending) return;
    setError(null);
    try {
      await submit.mutateAsync({
        nationalCardFront: files.nationalCardFront!,
        nationalCardBack: files.nationalCardBack!,
        selfieWithCard: files.selfieWithCard!,
        registrationNotice: files.registrationNotice ?? null,
      });
      // پیش‌نمایش‌های محلی دیگر لازم نیستند
      for (const u of Object.values(urls)) if (u) URL.revokeObjectURL(u);
      setFiles({});
      setUrls({});
      setStep(1);
      toast({ description: 'مدارک شما با موفقیت ارسال شد و در حال بررسی است.' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال مدارک ناموفق بود.');
    }
  };

  const fullName = profile
    ? `${profile.userInfo.firstName ?? ''} ${profile.userInfo.lastName ?? ''}`.trim()
    : '';

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PanelCard>
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-md border border-sky-200 bg-sky-50 text-sky-600">
            <ShieldCheck size={22} />
          </span>
          <Link
            href="/help/verify-account"
            className="flex shrink-0 items-center gap-1 text-[11px] font-bold text-primary hover:underline"
          >
            <BookOpen size={13} /> راهنمای کامل احراز هویت
          </Link>
        </div>
        <h1 className="mt-3 text-base font-extrabold sm:text-lg">احراز هویت</h1>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          هویت حساب کاربری خود را در دو مرحله ساده احراز کنید: تصویر کارت ملی و سپس سلفی با گواهی دست‌نوشته.
          با تایید هویت، برای خریداران و فروشندگان مطمئن‌تر باشید. مدارک شما حداکثر تا ۲ روز کاری بررسی می‌شود.
        </p>
      </PanelCard>

      {isLoading ? (
        <PanelCard className="grid place-items-center py-16">
          <Loader2 className="animate-spin text-muted-foreground" size={26} />
        </PanelCard>
      ) : data?.status === 'pending' ? (
        <PanelCard className="space-y-4">
          <div className="rounded-md bg-amber-50 p-4 text-center">
            <BadgeCheck size={26} className="mx-auto text-amber-500" />
            <p className="mt-2 text-sm font-extrabold text-amber-700">مدارک شما در حال بررسی است</p>
            <p className="mt-1 text-xs leading-6 text-amber-700/80">
              نتیجه احراز هویت حداکثر تا ۲ روز کاری اعلام می‌شود.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {DOC_SLOTS.filter((s) => data.docs[s.key]).map(({ key, label }) => {
              const doc = data.docs[key]!;
              return (
                <figure key={key} className="overflow-hidden rounded-lg border">
                  <div className="relative h-32 w-full bg-secondary">
                    <Image
                      src={doc.thumbUrl ?? doc.url}
                      alt={label}
                      fill
                      sizes="220px"
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <figcaption className="bg-secondary/60 px-2 py-1 text-center text-[11px] text-muted-foreground">
                    {label}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </PanelCard>
      ) : data?.status === 'approved' ? (
        <PanelCard>
          <div className="rounded-md bg-emerald-50 p-4 text-center">
            <BadgeCheck size={26} className="mx-auto text-emerald-600" />
            <p className="mt-2 text-sm font-extrabold text-emerald-700">هویت شما احراز شده است</p>
            <p className="mt-1 text-xs leading-6 text-emerald-700/80">
              نشان «احراز هویت» از این پس روی آگهی‌ها و پروفایل شما نمایش داده می‌شود.
            </p>
          </div>
        </PanelCard>
      ) : (
        <PanelCard className="space-y-4">
          {data?.status === 'rejected' && (
            <div className="rounded-md bg-red-50 p-4 text-center">
              <XCircle size={26} className="mx-auto text-red-500" />
              <p className="mt-2 text-sm font-extrabold text-red-700">مدارک شما تایید نشد</p>
              {data.rejectionReason && (
                <p className="mt-1 text-xs leading-6 text-red-700/80">دلیل: {data.rejectionReason}</p>
              )}
              <p className="mt-1 text-xs leading-6 text-red-700/80">مدارک جدید را بارگذاری کنید و دوباره ارسال کنید.</p>
            </div>
          )}

          {/* نشانگر گام‌ها */}
          <div className="flex items-center gap-2">
            {[
              { n: 1, label: 'تصویر کارت ملی' },
              { n: 2, label: 'سلفی با گواهی' },
            ].map(({ n, label }, i) => (
              <span key={n} className="flex flex-1 items-center gap-2">
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-extrabold',
                    step > n
                      ? 'bg-emerald-500 text-white'
                      : step === n
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-muted-foreground',
                  )}
                >
                  {step > n ? <Check size={13} /> : toFa(n)}
                </span>
                <span
                  className={cn(
                    'truncate text-[11.5px] font-bold',
                    step === n ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {label}
                </span>
                {i === 0 && <span className="mx-1 h-px flex-1 bg-border" aria-hidden />}
              </span>
            ))}
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}

          {step === 1 ? (
            <>
              <p className="text-xs font-extrabold">
                گام {toFa(1)} از {toFa(2)} — تصویر کارت ملی
              </p>
              <p className="text-[11.5px] leading-6 text-muted-foreground">
                تصویر <b>روی کارت</b> و <b>پشت کارت ملی</b> را طبق نمونه بارگذاری کنید: کارت کامل و بدون بریدگی، واضح
                و بدون انعکاس، بدون دست روی متن و بدون تاری.
              </p>
              <SampleImage
                src="/help-img/verify/sample-card.png"
                caption="کارت ملی کامل، واضح و مستقیم از روبرو — نمونه از راهنمای باسکول"
              />
              <p className="text-center text-[10.5px] text-muted-foreground">
                نمونه‌های غلط و راهنمای کامل در{' '}
                <Link href="/help/verify-account" className="font-bold text-primary hover:underline">
                  صفحهٔ راهنما
                </Link>{' '}
                است.
              </p>
              <UploadBox
                label="تصویر روی کارت ملی"
                hint="سمتِ عکس‌دار کارت — کامل، واضح و بدون انعکاس (فرمت jpeg یا jpg)"
                file={files.nationalCardFront ?? null}
                previewUrl={urls.nationalCardFront ?? null}
                onPick={(f) => pick('nationalCardFront', f)}
                onClear={() => clear('nationalCardFront')}
              />
              <UploadBox
                label="تصویر پشت کارت ملی"
                hint="سمت بدون عکس کارت — کامل و بدون بریدگی (فرمت jpeg یا jpg)"
                file={files.nationalCardBack ?? null}
                previewUrl={urls.nationalCardBack ?? null}
                onPick={(f) => pick('nationalCardBack', f)}
                onClear={() => clear('nationalCardBack')}
              />
              <Button
                className="w-full rounded-md"
                disabled={!step1Ready}
                onClick={() => setStep(2)}
              >
                ذخیره و ادامه
              </Button>
            </>
          ) : (
            <>
              <p className="text-xs font-extrabold">
                گام {toFa(2)} از {toFa(2)} — سلفی همراه با کارت ملی و گواهی دست‌نوشته
              </p>
              <NoteTemplate fullName={fullName} />
              <SampleImage
                src="/help-img/verify/sample-selfie.png"
                caption="سلفی از نزدیک و واضح همراه با کارت ملی چسبیده به گواهی — نمونه از راهنمای باسکول"
              />
              <UploadBox
                label="سلفی با کارت ملی و گواهی"
                hint="خودتان همراه کارت ملی و کاغذ گواهی — واضح و بدون تاری (فرمت jpeg یا jpg)"
                file={files.selfieWithCard ?? null}
                previewUrl={urls.selfieWithCard ?? null}
                onPick={(f) => pick('selfieWithCard', f)}
                onClear={() => clear('selfieWithCard')}
              />
              {/* مدرک کسب‌وکار — اختیاری (خواسته مالک ۶-۱۱): اعتبار بیشتر */}
              <UploadBox
                label="تصویر جواز کسب یا آگهی ثبت شرکت (اختیاری)"
                hint="کسب‌وکارها و شرکت‌ها برای اعتبار بیشتر در نزد خریداران می‌توانند تصویر جواز کسب یا آگهی ثبت شرکت (روزنامه رسمی) را نیز بارگذاری کنند"
                file={files.registrationNotice ?? null}
                previewUrl={urls.registrationNotice ?? null}
                onPick={(f) => pick('registrationNotice', f)}
                onClear={() => clear('registrationNotice')}
              />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-md" onClick={() => setStep(1)}>
                  مرحله قبل
                </Button>
                <Button className="flex-[2] rounded-md" disabled={!step2Ready || submit.isPending} onClick={send}>
                  {submit.isPending && <Loader2 size={16} className="ml-2 animate-spin" />}
                  ارسال نهایی
                </Button>
              </div>
            </>
          )}
        </PanelCard>
      )}
    </div>
  );
}
