'use client';

/**
 * کامپوزر چت — مشترک بین صفحهٔ «پیام‌ها» و ویجت چت.
 * ارسال متن، ارسال فایل (تصویر/ویدئو/سند تا ۵MB) با پیش‌نمایش پیش از ارسال،
 * و حالت ویرایش پیام دیده‌نشده (چت مدرک است — قواعد خواسته مالک ۷-۱۱).
 */

import { useRef, useState, type FormEvent } from 'react';
import { FileText, ImagePlus, Loader2, Paperclip, SendHorizontal, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { ChatFileMeta, ChatMessage } from '@/lib/mock/api';
import { cn } from '@/lib/utils';

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
    onPickFile(f);
  };

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

      {/* پیش‌نمایش پیوست پیش از ارسال */}
      {attachment && !editing && (
        <div className="mb-2 flex items-center gap-2.5 rounded-md border bg-secondary/40 p-2">
          {attachment.kind === 'image' ? (
             
            <img
              src={attachment.url}
              alt=""
              className="size-11 shrink-0 rounded-md object-cover"
            />
          ) : (
            <span className="grid size-11 shrink-0 place-items-center rounded-md bg-secondary text-muted-foreground">
              {attachment.kind === 'video' ? '🎬' : <FileText size={18} />}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold">{attachment.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {uploading ? 'در حال بارگذاری…' : 'آماده ارسال'}
            </span>
          </span>
          <button
            type="button"
            aria-label="حذف پیوست"
            onClick={onClearAttachment}
            className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-foreground/5"
          >
            <X size={13} />
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
        <button
          type="button"
          aria-label="پیوست فایل"
          title="ارسال تصویر، ویدئو یا فایل (حداکثر ۵ مگابایت)"
          disabled={busy || !!editing}
          onClick={() => fileRef.current?.click()}
          className="grid size-9 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
        >
          {uploading ? <Loader2 size={17} className="animate-spin" /> : <Paperclip size={17} />}
        </button>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="پیامی بنویسید"
          aria-label="متن پیام"
          className="rounded-md"
          maxLength={2000}
          disabled={disabled}
        />
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


    </div>
  );
}
