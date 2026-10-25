'use client';

/**
 * احراز هویت — گام «پروفایل حرفه‌ای مطمئن» باسکول:
 * بارگذاری تصویر کارت ملی و سلفی + وضعیت بررسی. (نمونه ماک)
 */

import { useRef, useState } from 'react';
import { BadgeCheck, FileImage, ShieldCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { PanelCard } from '@/components/panel/panel-parts';
import { cn } from '@/lib/utils';

function UploadBox({
  label,
  hint,
  file,
  onPick,
}: {
  label: string;
  hint: string;
  file: string | null;
  onPick: (name: string) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <button
      type="button"
      onClick={() => ref.current?.click()}
      className={cn(
        'grid w-full place-items-center rounded-lg border-2 border-dashed p-6 text-center transition-colors',
        file ? 'border-emerald-300 bg-emerald-50/50' : 'border-border bg-secondary/40 hover:border-primary/50',
      )}
    >
      <span className={cn('grid size-11 place-items-center rounded-full bg-white shadow-sm', file ? 'text-emerald-600' : 'text-primary')}>
        <FileImage size={20} />
      </span>
      <span className="mt-2 text-sm font-bold">{label}</span>
      <span className="mt-1 text-[11px] leading-5 text-muted-foreground">{file ? `(${file})` : hint}</span>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0]?.name ?? '')}
      />
    </button>
  );
}

export default function VerificationPage() {
  const { toast } = useToast();
  const [card, setCard] = useState<string | null>(null);
  const [selfie, setSelfie] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

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

      <PanelCard className="space-y-4">
        {sent ? (
          <div className="rounded-md bg-amber-50 p-4 text-center">
            <BadgeCheck size={26} className="mx-auto text-amber-500" />
            <p className="mt-2 text-sm font-extrabold text-amber-700">مدارک شما در حال بررسی است</p>
            <p className="mt-1 text-xs leading-6 text-amber-700/80">نتیجه احراز هویت حداکثر تا ۲۴ ساعت آینده اعلام می‌شود.</p>
          </div>
        ) : (
          <>
            <UploadBox
              label="تصویر کارت ملی"
              hint="کارت ملی روی زمینه روشن و بدون انعکاس — فرمت jpeg یا jpg"
              file={card}
              onPick={(n) => n && setCard(n)}
            />
            <UploadBox
              label="سلفی همراه کارت ملی"
              hint="سلفی واضح در کنار کارت ملی"
              file={selfie}
              onPick={(n) => n && setSelfie(n)}
            />
            <Button
              className="w-full rounded-md"
              disabled={!card || !selfie}
              onClick={() => {
                setSent(true);
                toast({ description: 'مدارک احراز هویت ارسال شد.' });
              }}
            >
              ارسال مدارک
            </Button>
          </>
        )}
      </PanelCard>
    </div>
  );
}
