'use client';

/**
 * کامپوزر چت — مشترک بین صفحهٔ «پیام‌ها» و ویجت چت.
 * ارسال متن، ارسال فایل (تصویر/ویدئو/سند تا ۵MB) و حالت ویرایش پیام
 * دیده‌نشده (چت مدرک است — قواعد خواسته مالک ۷-۱۱).
 *
 * پیوست (خواسته مالک ۹-۱۱ — الگوی استاندارد پیام‌رسان‌ها):
 *  · آیکون گیره «داخل» اینپوت، انتهای آن (absolute) — مثل تلگرام/واتساپ،
 *    نه دکمه‌ای جدا کنار یا زیر اینپوت؛
 *  · انتخاب فایل → مودال پیش‌نمایش: عکس/ویدئو بزرگ، زیرش فیلد «توضیح» و
 *    دکمهٔ ارسال — ارسال از همان مودال (کپشن + فایل با هم).
 */

import { useRef, useState, type FormEvent } from 'react';
import { FileText, Loader2, Paperclip, SendHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { ChatFileMeta, ChatMessage } from '@/lib/mock/api';

/** سقف حجم پیوست چت — ۵MB (سمت سرور هم همین سقف چک می‌شود) */
export const CHAT_MAX_FILE_BYTES = 5 * 1024 * 1024;

/** لیست سفید پیش‌فیلتر فرانت — قرینهٔ قواعد سرور؛ سرور منبع نهایی حکم است */
const ALLOWED_EXT = new Set([
  'jpg', 'jpeg', 'png', 'gif', 'webp', // تصویر
  'mp4', 'webm', 'mov', // ویدئو
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv', // سند
]);

export function fileRejectReason(file: File): string | null {
  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : '';
  if (!ALLOWED_EXT.has(ext)) {
    return 'این نوع فایل مجاز نیست. تصویر، ویدئو (mp4/webm/mov) یا سند (pdf، آفیس، متن) بفرستید.';
  }
  if (file.size > CHAT_MAX_FILE_BYTES) {
    return 'حجم فایل نباید بیشتر از ۵ مگابایت باشد.';
  }
  return null;
}

/** حجم خوانا — کیلوبایت/مگابایت با ارقام فارسی */
function sizeFa(bytes: number): string {
  const fa = (n: string | number) => String(n).replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[+d]);
  if (bytes >= 1024 * 1024) return `${fa((bytes / 1024 / 1024).toFixed(1))} مگابایت`;
  return `${fa(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`;
}

export function ChatComposer({
  disabled,
  sending,
  uploading,
  attachment,
  onPickFile,
  onClearAttachment,
  editing,
  onCancelEdit,
  onSend,
}: {
  disabled?: boolean;
  sending?: boolean;
  uploading?: boolean;
  attachment: ChatFileMeta | null;
  onPickFile: (file: File) => void;
  onClearAttachment: () => void;
  /** پیام در حال ویرایش — ارسال یعنی ذخیرهٔ ویرایش */
  editing?: ChatMessage | null;
  onCancelEdit?: () => void;
  onSend: (text: string) => void;
}) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  /** فایل انتخاب‌شده در انتظار ارسال — پیش‌نمایش محلی + کپشن از مودال */
  const [pending, setPending] = useState<{ file: File; url: string } | null>(null);
  const [caption, setCaption] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const busy = disabled || sending || uploading;

  const submit = (e?: FormEvent) => {
    e?.preventDefault();
    const t = text.trim();
    if (busy) return;
    if (!editing && !t && !attachment) return;
    onSend(t);
    setText('');
  };

  const handleFile = (f: File | undefined | null) => {
    if (!f) return;
    const reason = fileRejectReason(f);
    if (reason) {
      toast({ description: reason, variant: 'destructive' });
      return;
    }
    // آپلود در پس‌زمینه شروع می‌شود؛ مودال پیش‌نمایش + کپشن باز می‌شود
    onPickFile(f);
    setPending({ file: f, url: URL.createObjectURL(f) });
    setCaption('');
  };

  const closePending = () => {
    if (!pending) return;
    URL.revokeObjectURL(pending.url);
    setPending(null);
    setCaption('');
    onClearAttachment();
  };

  const sendPending = () => {
    if (!pending || uploading || !attachment) return;
    onSend(caption.trim());
    URL.revokeObjectURL(pending.url);
    setPending(null);
    setCaption('');
  };

  const pendingKind = pending
    ? pending.file.type.startsWith('image/')
      ? 'image'
      : pending.file.type.startsWith('video/')
        ? 'video'
        : 'file'
    : null;
  const uploadFailed = !!pending && !uploading && !attachment;

  return (
    <div className="shrink-0 border-t pt-3">
      {/* نوار حالت ویرایش */}
      {editing && (
        <div className="mb-2 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
          <FileText size={13} className="shrink-0" />
          <span className="min-w-0 flex-1 truncate">
            ویرایش پیام: «{editing.text.slice(0, 40) || (editing.file ? editing.file.name : '')}»
          </span>
          <button
            type="button"
            aria-label="لغو ویرایش"
            onClick={() => {
              setText('');
              onCancelEdit?.();
            }}
            className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-amber-100"
          >
            <X size={12} />
          </button>
        </div>
      )}

      <form onSubmit={submit} className="flex items-center gap-2">
        <input
          ref={fileRef}
          type="file"
          hidden
          accept=".jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv"
          onChange={(e) => {
            handleFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
        {/* متن + گیرهٔ فایل داخل اینپوت (انتهای آن) — عادت مرسوم پیام‌رسان‌ها
            (خواسته مالک ۹-۱۱)؛ pe-11 جای آیکون را خالی نگه می‌دارد */}
        <div className="relative min-w-0 flex-1">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="پیامی بنویسید"
            aria-label="متن پیام"
            className="rounded-md pe-11"
            maxLength={2000}
            disabled={disabled}
          />
          <button
            type="button"
            aria-label="پیوست فایل"
            title="ارسال تصویر، ویدئو یا فایل (حداکثر ۵ مگابایت)"
            disabled={busy || !!editing}
            onClick={() => fileRef.current?.click()}
            className="absolute end-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
          >
            {uploading ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
          </button>
        </div>
        <Button
          type="submit"
          size="icon"
          aria-label={editing ? 'ذخیرهٔ ویرایش' : 'ارسال پیام'}
          className="shrink-0 rounded-md"
          disabled={busy || (!editing && !text.trim() && !attachment)}
        >
          {sending || uploading ? (
            <Loader2 size={16} className="animate-spin" />
          ) : editing ? (
            <FileText size={15} />
          ) : (
            <SendHorizontal size={16} className="-scale-x-100" />
          )}
        </Button>
      </form>

      {/* ─── مودال پیش‌نمایش پیوست — عکس/فایل + توضیح + ارسال (الگوی تلگرام/واتساپ،
              خواسته مالک ۹-۱۱: «استاندارد باشد تا طبق عادت کاربران باشد») ─── */}
      <Dialog open={!!pending} onOpenChange={(o) => !o && closePending()}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base">ارسال {pendingKind === 'file' ? 'فایل' : pendingKind === 'video' ? 'ویدیو' : 'عکس'}</DialogTitle>
          </DialogHeader>

          {/* پیش‌نمایش — عکس/ویدئو بزرگ، سند با آیکون و نام؛ گارد pending:
              رادیکس هنگام انیمیشن بسته‌شدن هم محتوا را رندر می‌کند و
              pending همین لحظه null شده است */}
          {pending ? (
            <div className="grid place-items-center overflow-hidden rounded-md bg-secondary/40 p-2">
              {pendingKind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob محلی، نه asset
                <img
                  src={pending.url}
                  alt={pending.file.name}
                  className="max-h-[45vh] w-auto max-w-full rounded-sm object-contain"
                />
              ) : pendingKind === 'video' ? (
                <video
                  src={pending.url}
                  controls
                  playsInline
                  className="max-h-[45vh] w-full rounded-sm"
                />
              ) : (
                <div className="flex w-full flex-col items-center gap-2 py-6 text-muted-foreground">
                  <FileText size={44} strokeWidth={1.2} />
                  <p className="max-w-full truncate px-2 text-sm font-bold text-foreground">
                    {pending.file.name}
                  </p>
                  <p className="font-num text-xs">{sizeFa(pending.file.size)}</p>
                </div>
              )}
            </div>
          ) : null}

          {/* وضعیت بارگذاری */}
          <p className="text-center text-[11px] text-muted-foreground" role="status">
            {uploadFailed ? (
              <span className="font-medium text-red-600">بارگذاری ناموفق بود — دوباره تلاش کنید.</span>
            ) : uploading ? (
              'در حال بارگذاری…'
            ) : (
              'بارگذاری شد'
            )}
          </p>

          {/* توضیح (کپشن) پیوست */}
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="توضیح بنویسید (اختیاری)"
            aria-label="توضیح پیوست"
            maxLength={2000}
            disabled={uploadFailed}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendPending();
              }
            }}
          />

          <DialogFooter className="flex-row gap-2 sm:justify-start">
            <Button
              type="button"
              onClick={sendPending}
              disabled={uploading || uploadFailed}
              className="rounded-md"
            >
              {uploading ? <Loader2 size={15} className="animate-spin" /> : <SendHorizontal size={15} className="-scale-x-100" />}
              ارسال
            </Button>
            <Button type="button" variant="outline" onClick={closePending} className="rounded-md">
              انصراف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
