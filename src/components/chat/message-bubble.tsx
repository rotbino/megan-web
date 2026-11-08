'use client';

/**
 * حباب پیام چت — مشترک بین صفحهٔ «پیام‌ها» و ویجت چت آگهی.
 *
 * قواعد (خواسته مالک ۷-۱۱):
 *  • پیام‌های کاربر سمت راست، پیام‌های مخاطب سمت چپ (RTL: start=راست).
 *  • پیام خودیِ هنوز دیده‌نشده (readAt=null) دکمهٔ ویرایش/حذف دارد؛
 *    بعد از مشاهدهٔ طرف مقابل پیام «مدرک» است و قفل می‌شود.
 *  • فایل‌ها (تصویر/ویدئو/سند تا ۵MB) درون‌خطی رندر می‌شوند.
 */

import { useState } from 'react';
import {
  CheckCheck,
  Download,
  FileText,
  FileSpreadsheet,
  File as FileIcon,
  Pencil,
  Presentation,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import type { ChatMessage } from '@/lib/mock/api';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

/** حجم خوانا — کیلوبایت/مگابایت فارسی */
function humanSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${toFa((bytes / (1024 * 1024)).toFixed(1))} مگابایت`;
  if (bytes >= 1024) return `${toFa(Math.max(1, Math.round(bytes / 1024)))} کیلوبایت`;
  return `${toFa(bytes)} بایت`;
}

function docIcon(name: string) {
  const ext = name.includes('.') ? name.split('.').pop()!.toLowerCase() : '';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'spreadsheet';
  if (['ppt', 'pptx'].includes(ext)) return 'presentation';
  if (['pdf', 'doc', 'docx', 'txt'].includes(ext)) return 'text';
  return 'file';
}

export function MessageBubble({
  message,
  mine,
  onEdit,
  onDelete,
}: {
  message: ChatMessage;
  mine: boolean;
  onEdit?: (m: ChatMessage) => void;
  onDelete?: (m: ChatMessage) => void;
}) {
  const [lightbox, setLightbox] = useState(false);
  // چت مدرک است — بعد از مشاهدهٔ طرف مقابل، ویرایش/حذف ممکن نیست
  const mutable = mine && message.readAt === null && (onEdit || onDelete);
  const hasCaption = message.kind !== 'text' && message.text.trim().length > 0;
  const iconKind = message.file ? docIcon(message.file.name) : 'file';

  return (
    <div className={cn('flex w-full items-center gap-1', mine ? 'justify-start' : 'justify-end')}>
      {/* RTL: flex-start = راست → پیام کاربر سمت راست، مخاطب سمت چپ */}
      <div
        dir="auto"
        className={cn(
          'w-fit max-w-[85%] shadow-sm ',
          'rounded-2xl px-3 py-2 text-[13px] leading-6',
          'sm:max-w-[70%] sm:px-3.5 sm:py-2.5',
          'animate-in fade-in slide-in-from-bottom-1 duration-200',
          mine
            ? 'rounded-ss-md border border-primary/25 bg-primary/15'
            : 'rounded-se-md border border-border/70 bg-card',
          message.kind !== 'text' && 'px-2 py-2 sm:px-2',
        )}
      >
        {/* تصویر */}
        {message.kind === 'image' && message.file && (
          <button
            type="button"
            onClick={() => setLightbox(true)}
            aria-label={`نمایش ${message.file.name}`}
            className="block overflow-hidden rounded-xl"
          >
            { }
            <img
              src={message.file.url}
              alt={message.file.name}
              loading="lazy"
              className="max-h-64 w-auto max-w-full rounded-xl object-cover sm:max-h-72"
            />
          </button>
        )}

        {/* ویدئو */}
        {message.kind === 'video' && message.file && (
          <video
            src={message.file.url}
            controls
            preload="metadata"
            className="max-h-64 w-full max-w-[280px] rounded-xl sm:max-h-72 sm:max-w-[340px]"
          />
        )}

        {/* سند */}
        {message.kind === 'file' && message.file && (
          <a
            href={message.file.url}
            download={message.file.name}
            target="_blank"
            rel="noreferrer"
            className={cn(
              'flex w-56 items-center gap-2.5 rounded-xl p-2.5 transition-colors sm:w-64',
              'hover:bg-foreground/5',
            )}
          >
            <span
              className={cn(
                'grid size-10 shrink-0 place-items-center rounded-lg',
                mine ? 'bg-primary/20 text-primary' : 'bg-secondary text-foreground/70',
              )}
            >
              {iconKind === 'spreadsheet' ? <FileSpreadsheet size={18} /> : iconKind === 'presentation' ? <Presentation size={18} /> : iconKind === 'text' ? <FileText size={18} /> : <FileIcon size={18} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-bold" dir="auto">
                {message.file.name}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                {humanSize(message.file.size)} · دریافت
                <Download size={10} />
              </span>
            </span>
          </a>
        )}

        {/* متن یا کپشن */}
        {(message.kind === 'text' || hasCaption) && (
          <p
            className={cn(
              'whitespace-pre-wrap break-words',
              message.kind !== 'text' && 'px-1 pb-0.5 pt-2',
            )}
          >
            {message.text}
          </p>
        )}

        {/* متادیتا — زمان + ویرایش + تیک */}
        <p
          className={cn(
            'mt-1 flex items-center gap-1.5 text-[9px] leading-none text-muted-foreground',
            message.kind !== 'text' && 'px-1',
          )}
        >
          <span>{toFa(new Date(message.createdAt).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }))}</span>
          {message.editedAt && <span className="font-medium">(ویرایش شد)</span>}
          {mine && (
            <span className={cn('font-bold', message.readAt ? 'text-primary' : undefined)}>
              {message.readAt ? <CheckCheck size={12} /> : '✓'}
            </span>
          )}
        </p>
      </div>

      {/* منوی ویرایش/حذف — فقط پیام خودی دیده‌نشده */}
      {mutable && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="عملیات پیام"
              className="grid size-7 shrink-0 place-items-center rounded-full text-muted-foreground/60 transition-colors hover:bg-secondary hover:text-foreground"
            >
              <span className="text-base leading-none">⋯</span>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={mine ? 'end' : 'start'} className="min-w-36">
            {onEdit && (
              <DropdownMenuItem onClick={() => onEdit(message)} className="gap-2 text-xs">
                <Pencil size={13} /> ویرایش
              </DropdownMenuItem>
            )}
            {onDelete && (
              <DropdownMenuItem
                onClick={() => onDelete(message)}
                className="gap-2 text-xs text-red-600 focus:text-red-600"
              >
                <Trash2 size={13} /> حذف
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* لایت‌باکس تصویر */}
      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-fit rounded-xl p-2 sm:max-w-3xl">
          <DialogTitle className="sr-only">{message.file?.name}</DialogTitle>
          {message.file && (
            <>
              { }
              <img
                src={message.file.url}
                alt={message.file.name}
                className="max-h-[75vh] w-auto rounded-lg object-contain"
              />
              <a
                href={message.file.url}
                download={message.file.name}
                className="mt-2 flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-bold text-primary hover:underline"
              >
                <Download size={13} /> دانلود تصویر ({humanSize(message.file.size)})
              </a>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
