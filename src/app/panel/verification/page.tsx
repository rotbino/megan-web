'use client';

/**
 * احراز هویت — گام «پروفایل حرفه‌ای مطمئن» باسکول (B6، API واقعی):
 * بارگذاری کارت ملی + سلفی → «در حال بررسی» → تأیید/رد ادمین.
 * مدارک در یک درخواست ارسال می‌شوند (اتمیک) — پیش‌نمایش objectURL،
 * آپلود فقط لحظه «ارسال مدارک» (دکترین فایل: نه حدسی وسط فرم).
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { BadgeCheck, FileImage, Loader2, ShieldCheck, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/panel/panel-parts';
import { useMyVerification, useSubmitVerification } from '@/lib/mock/hooks';
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
          <span className="grid size-11 place-items-center rounded-full bg-white text-primary shadow-sm">
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

export default function VerificationPage() {
  const { toast } = useToast();
  const { data, isLoading } = useMyVerification();
  const submit = useSubmitVerification();

  const [card, setCard] = useState<File | null>(null);
  const [selfie, setSelfie] = useState<File | null>(null);
  const [cardUrl, setCardUrl] = useState<string | null>(null);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // پیش‌نمایش موقت — cleanup بعد از unmount/تعویض
  useEffect(
    () => () => {
      if (cardUrl) URL.revokeObjectURL(cardUrl);
      if (selfieUrl) URL.revokeObjectURL(selfieUrl);
    },
    [cardUrl, selfieUrl],
  );

  const pick = (which: 'card' | 'selfie', file: File) => {
    const problem = validateImage(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    if (which === 'card') {
      setCard((prev) => {
        if (cardUrl) URL.revokeObjectURL(cardUrl);
        return file;
      });
      setCardUrl(url);
    } else {
      setSelfie((prev) => {
        if (selfieUrl) URL.revokeObjectURL(selfieUrl);
        return file;
      });
      setSelfieUrl(url);
    }
  };

  const clear = (which: 'card' | 'selfie') => {
    if (which === 'card') {
      if (cardUrl) URL.revokeObjectURL(cardUrl);
      setCard(null);
      setCardUrl(null);
    } else {
      if (selfieUrl) URL.revokeObjectURL(selfieUrl);
      setSelfie(null);
      setSelfieUrl(null);
    }
  };

  const send = async () => {
    if (!card || !selfie || submit.isPending) return;
    setError(null);
    try {
      await submit.mutateAsync({ nationalCard: card, selfie });
      // پیش‌نمایش‌های محلی دیگر لازم نیستند
      if (cardUrl) URL.revokeObjectURL(cardUrl);
      if (selfieUrl) URL.revokeObjectURL(selfieUrl);
      setCard(null);
      setSelfie(null);
      setCardUrl(null);
      setSelfieUrl(null);
      toast({ description: 'مدارک شما با موفقیت ارسال شد و در حال بررسی است.' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ارسال مدارک ناموفق بود.');
    }
  };

  const cardDoc = data?.docs?.nationalCard ?? null;
  const selfieDoc = data?.docs?.selfie ?? null;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <PanelCard>
        <span className="grid size-12 place-items-center rounded-md border border-sky-200 bg-sky-50 text-sky-600">
          <ShieldCheck size={22} />
        </span>
        <h1 className="mt-3 text-base font-extrabold sm:text-lg">احراز هویت</h1>
        <p className="mt-2 text-xs leading-6 text-muted-foreground">
          هویت حساب کاربری خود را احراز کنید. با تایید هویت خود، برای خریداران، فروشنده مطمئن‌تری باشید و امکانات بیشتری
          در ایمچ فعال می‌شود.
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
            <p className="mt-1 text-xs leading-6 text-amber-700/80">نتیجه احراز هویت حداکثر تا ۲۴ ساعت آینده اعلام می‌شود.</p>
          </div>
          {(cardDoc || selfieDoc) && (
            <div className="grid grid-cols-2 gap-3">
              {cardDoc && (
                <figure className="overflow-hidden rounded-lg border">
                  <div className="relative h-32 w-full bg-secondary">
                    <Image src={cardDoc.thumbUrl ?? cardDoc.url} alt="کارت ملی ارسالی" fill sizes="220px" className="object-cover" unoptimized />
                  </div>
                  <figcaption className="bg-secondary/60 px-2 py-1 text-center text-[11px] text-muted-foreground">کارت ملی ارسالی</figcaption>
                </figure>
              )}
              {selfieDoc && (
                <figure className="overflow-hidden rounded-lg border">
                  <div className="relative h-32 w-full bg-secondary">
                    <Image src={selfieDoc.thumbUrl ?? selfieDoc.url} alt="سلفی ارسالی" fill sizes="220px" className="object-cover" unoptimized />
                  </div>
                  <figcaption className="bg-secondary/60 px-2 py-1 text-center text-[11px] text-muted-foreground">سلفی ارسالی</figcaption>
                </figure>
              )}
            </div>
          )}
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
          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
          <UploadBox
            label="تصویر کارت ملی"
            hint="کارت ملی روی زمینه روشن و بدون انعکاس — فرمت jpeg یا jpg"
            file={card}
            previewUrl={cardUrl}
            onPick={(f) => pick('card', f)}
            onClear={() => clear('card')}
          />
          <UploadBox
            label="سلفی همراه کارت ملی"
            hint="سلفی واضح در کنار کارت ملی"
            file={selfie}
            previewUrl={selfieUrl}
            onPick={(f) => pick('selfie', f)}
            onClear={() => clear('selfie')}
          />
          <Button className="w-full rounded-md" disabled={!card || !selfie || submit.isPending} onClick={send}>
            {submit.isPending && <Loader2 size={16} className="ml-2 animate-spin" />}
            ارسال مدارک
          </Button>
        </PanelCard>
      )}
    </div>
  );
}
