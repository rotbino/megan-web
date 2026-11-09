'use client';

/**
 * دکمه + دیالوگ «تنظیمات کاتالوگ» (خواسته مالک ۱۰-۱۱ + بازنگری) — سربرگ
 * «محصولات من». کاتالوگ فروشنده همان صفحهٔ پروفایل عمومی اوست: به محض
 * ثبت اولین محصول، خودبه‌خود ساخته می‌شود؛ نه «ساخت» دارد نه آیدی پیج.
 * این دیالوگ فقط لینک کاتالوگ را نشان می‌دهد (کپی برای فرستادن به
 * مشتری‌ها + مشاهده) و آمار ذخیره‌کنندگان را می‌گوید.
 */

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, Bookmark, Copy, ExternalLink, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/lib/mock/auth';
import { useCatalogSavers } from '@/lib/mock/hooks';
import { useToast } from '@/hooks/use-toast';
import { SITE_URL } from '@/lib/site';
import { toFa } from '@/lib/format';
import { cn } from '@/lib/utils';

export function CatalogSettingsButton({ className }: { className?: string }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const userName = user?.userName ?? '';
  const catalogUrl = userName ? `${SITE_URL}/profile/${userName}` : '';
  // آمار ذخیره‌کنندگان فقط وقتی دیالوگ باز است گرفته می‌شود؛ بک‌اند بدون
  // اندپوینت → «—» (صفحه نشکند)
  const { data: savers, isLoading: saversLoading } = useCatalogSavers(userName, open && !!userName);

  const copyLink = async () => {
    if (!catalogUrl) return;
    try {
      await navigator.clipboard.writeText(catalogUrl);
      toast({ description: 'لینک کاتالوگ کپی شد.' });
    } catch {
      toast({ description: 'کپی ممکن نشد؛ لینک را دستی انتخاب کنید.', variant: 'destructive' });
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className={cn('h-9 rounded-md text-xs', className)}
        onClick={() => setOpen(true)}
      >
        <BookOpen size={15} />
        تنظیمات کاتالوگ
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="sm:max-w-lg">
          <DialogHeader className="text-start">
            <DialogTitle className="flex items-center gap-2 text-base">
              <BookOpen size={18} className="text-primary" />
              تنظیمات کاتالوگ
            </DialogTitle>
            <DialogDescription className="text-start leading-5">
              کاتالوگ شما همان صفحهٔ پروفایل عمومی‌تان است؛ هر محصولی که ثبت می‌کنید
              همان لحظه در آن نمایش داده می‌شود — نه ساختن لازم دارد نه تنظیم جداگانه.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {/* لینک کاتالوگ — برای فرستادن به مشتری‌های خودتان */}
            <div className="space-y-3 rounded-md border border-primary/25 bg-primary/5 p-4">
              <p className="flex items-center gap-2 text-sm font-extrabold text-primary">
                <Bookmark size={16} />
                لینک کاتالوگ شما
              </p>
              <p className="text-[11.5px] leading-5 text-muted-foreground">
                لینک زیر را برای مشتری‌هایتان بفرستید؛ هر تغییری در محصولات یا پروفایل
                بدهید، کاتالوگ با همین لینک خودش به‌روز می‌شود.
              </p>
              <div className="flex items-center gap-1.5 rounded-md border bg-card px-3 py-2.5">
                <span dir="ltr" className="min-w-0 flex-1 truncate font-mono text-xs">
                  {catalogUrl || '…'}
                </span>
                <button
                  type="button"
                  onClick={copyLink}
                  aria-label="کپی لینک کاتالوگ"
                  title="کپی لینک"
                  className="grid size-7 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                >
                  <Copy size={14} />
                </button>
              </div>
              <Button asChild size="sm" className="h-9 w-full rounded-md text-xs">
                <Link href={userName ? `/profile/${userName}` : '/panel/products'} target="_blank">
                  <ExternalLink size={14} />
                  مشاهده کاتالوگ
                </Link>
              </Button>
            </div>

            {/* ذخیره‌کنندگان — آمار سریع + لینک به لیست روی صفحهٔ کاتالوگ */}
            <div className="flex items-center justify-between gap-3 rounded-md border bg-card p-4">
              <p className="flex items-center gap-2 text-xs font-bold">
                <Users size={15} className="text-primary" />
                ذخیره کنندگان کاتالوگ شما
                <span className="font-num text-[13px] font-extrabold text-primary">
                  {saversLoading || !userName ? '…' : toFa(savers?.count ?? 0)}
                </span>
                نفر
              </p>
              <Button asChild size="sm" variant="ghost" className="h-8 rounded-md text-[11px]">
                <Link href={userName ? `/profile/${userName}#about` : '/panel/products'} target="_blank">
                  مشاهده لیست
                </Link>
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
