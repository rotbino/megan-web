'use client';

/**
 * دیالوگ ارسال پیام مستقیم ادمین → کاربران («پشتیبانی ایمچ»).
 *
 * سه حالت هدف:
 *  • single — یک کاربر (دکمه «پیام» ردیف لیست یا تب جزئیات)
 *  • multi  — چند کاربر انتخابی (چک‌باکس‌های جدول لیست)
 *  • all    — همه کاربران با مخاطب اختیاری (همه/فعال/فروشنده/خریدار/احرازشده)
 *
 * کاربر پیام را در مکالمه سنجاق‌شده «پشتیبانی ایمچ» در پنل خود می‌بیند؛
 * خوانده‌شدن per-user در AdminMessage ثبت می‌شود.
 */

import { useState } from 'react';
import { Loader2, Megaphone, Send, Users } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import {
  adminSendAllUsersMessage,
  adminSendUsersMessage,
  adminSendUserMessage,
  type AdminBroadcastAudience,
  type AdminUserRow,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { toFa } from '@/lib/format';

export type MessageTarget =
  | { mode: 'single'; user: AdminUserRow }
  | { mode: 'multi'; userIds: string[] }
  | { mode: 'all' };

const AUDIENCES: Array<{ value: AdminBroadcastAudience; label: string }> = [
  { value: 'all', label: 'همه کاربران' },
  { value: 'active', label: 'فقط کاربران فعال' },
  { value: 'sellers', label: 'فروشندگان' },
  { value: 'buyers', label: 'خریداران' },
  { value: 'verified', label: 'کاربران احرازشده' },
];

export function SendMessageDialog({
  target,
  onClose,
  onSent,
}: {
  target: MessageTarget | null;
  onClose: () => void;
  /** بعد از ارسال موفق — مثلاً پاک‌کردن انتخاب‌های لیست */
  onSent?: () => void;
}) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [audience, setAudience] = useState<AdminBroadcastAudience>('all');
  // فرم تازه در هر باز شدن — با key ریمانت در فراخوان (parent)

  const send = useMutation({
    mutationFn: async () => {
      const t = text.trim();
      if (target?.mode === 'single') return adminSendUserMessage(target.user.id, t);
      if (target?.mode === 'multi') return adminSendUsersMessage(target.userIds, t);
      return adminSendAllUsersMessage(t, audience);
    },
    onSuccess: (r) => {
      const n = (r as { sent: number }).sent;
      toast({
        description:
          target?.mode === 'all'
            ? `پیام برای ${toFa(n)} کاربر (مخاطب: ${AUDIENCES.find((a) => a.value === audience)?.label}) ارسال شد.`
            : `پیام برای ${toFa(n)} کاربر ارسال شد.`,
      });
      onSent?.();
      onClose();
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  if (!target) return null;

  const nameOf = (u: AdminUserRow) =>
    [u.first_name, u.last_name].filter(Boolean).join(' ') || 'بی‌نام';

  const valid = text.trim().length >= 3 && !send.isPending;

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && !send.isPending && onClose()}>
      <DialogContent className="rounded-lg sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-start">
            <span className="grid size-8 place-items-center rounded-md bg-primary/10 text-primary">
              {target.mode === 'all' ? <Megaphone size={15} /> : <Send size={14} />}
            </span>
            ارسال پیام به کاربران
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* هدف ارسال */}
          <div className="rounded-[10px] border bg-secondary/40 px-3 py-2.5">
            <p className="text-[11px] font-bold text-muted-foreground">گیرنده:</p>
            {target.mode === 'single' && (
              <p className="mt-1 text-sm font-bold">
                {nameOf(target.user)}
                <span dir="ltr" className="ms-2 text-[11px] font-normal text-muted-foreground">
                  {target.user.phone}
                </span>
              </p>
            )}
            {target.mode === 'multi' && (
              <p className="mt-1 flex items-center gap-1.5 text-sm font-bold">
                <Users size={13} className="text-primary" />
                {toFa(target.userIds.length)} کاربر انتخابی
              </p>
            )}
            {target.mode === 'all' && (
              <div className="mt-1.5">
                <Select value={audience} onValueChange={(v) => setAudience(v as AdminBroadcastAudience)}>
                  <SelectTrigger className="h-9 rounded-md text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AUDIENCES.map((a) => (
                      <SelectItem key={a.value} value={a.value}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="admin-msg-text">
              متن پیام <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="admin-msg-text"
              dir="rtl"
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="resize-none text-sm leading-7"
              maxLength={2000}
              placeholder="مثلا: سلام، مورد آگهی «پسته اکبری» بررسی شد؛ لطفاً تصاویر موجودی را تازه کنید."
            />
            <p className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>کاربر پیام را در صفحه «پیام‌ها» خود (مکالمه پشتیبانی ایمچ) می‌بیند.</span>
              <span className="shrink-0">{toFa(text.length)}/۲۰۰۰</span>
            </p>
          </div>

          <Button
            className="w-full rounded-md"
            disabled={!valid}
            onClick={() => send.mutate()}
          >
            {send.isPending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            ارسال پیام
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
