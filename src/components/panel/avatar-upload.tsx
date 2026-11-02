'use client';

/**
 * آواتار قابل تعویض — کامپوننت مشترک ویو و ویرایش پروفایل (خواسته مالک
 * ۲-۱۱ دور ۱۶: «کاری کن کاربر توی همون ویوی پروفایل بتونه تصویر پروفایلش
 * رو ست کنه یا عوض کنه؛ در صفحه ویرایش هم همینطور»):
 * کلیک روی آواتار = انتخاب فایل → آپلود واقعی (uploads/uploadImage با
 * key=avatar و replace) → updateProfile(avatar_url) → refreshUser (هدر همان
 * لحظه به‌روز شود). اورلی دوربین + اسپینر آپلود.
 */

import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { uploadImage } from '@/lib/api/client';
import { useUpdatePanelProfile } from '@/lib/mock/hooks';
import { useAuth } from '@/lib/mock/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export function AvatarUpload({
  userId,
  name,
  avatarUrl,
  className,
  initialClass = 'text-xl',
  title = 'تغییر تصویر پروفایل',
}: {
  userId: string;
  /** نام برای حرف اولِ حالت بدون‌عکس */
  name: string;
  avatarUrl: string | null;
  /** اندازهٔ دایره — مثلا size-16 / size-14 */
  className?: string;
  /** کلاس فونت حرف اول */
  initialClass?: string;
  title?: string;
}) {
  const save = useUpdatePanelProfile();
  const { refreshUser } = useAuth();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const pick = async (file: File) => {
    if (!/^image\/(jpeg|jpg|png|webp)$/.test(file.type)) {
      toast({ description: 'تصویر از نوع jpeg، jpg، png یا webp باشد.' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ description: 'حجم تصویر باید کمتر از ۵ مگابایت باشد.' });
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadImage(file, { model: 'User', modelId: userId, key: 'avatar', replace: true });
      await save.mutateAsync({ avatar_url: uploaded.url });
      await refreshUser(); // آواتار هدر همان لحظه به‌روز شود
      toast({ description: 'تصویر پروفایل به‌روزرسانی شد.' });
    } catch (err) {
      toast({ description: err instanceof Error ? err.message : 'آپلود تصویر ناموفق بود.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        aria-label={title}
        title={title}
        className={cn('group relative grid shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full', className)}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="تصویر پروفایل" className="size-full rounded-full object-cover" />
        ) : (
          <span className={cn('grid size-full place-items-center rounded-full bg-primary/10 font-extrabold text-primary', initialClass)}>
            {(name || 'ک').charAt(0)}
          </span>
        )}
        {/* اورلی دوربین — همیشه کمی پیدا تا «قابل کلیک» بودن معلوم باشد */}
        <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white opacity-0 transition-opacity group-hover:opacity-100">
          {uploading ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
        </span>
        {uploading && (
          <span className="absolute inset-0 grid place-items-center rounded-full bg-black/45 text-white">
            <Loader2 size={20} className="animate-spin" />
          </span>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pick(file);
          e.target.value = '';
        }}
      />
    </>
  );
}
