'use client';

/**
 * دفتر خرید من — دیزاین رکوردمحور و مینیمال (بازطراحی مالک ۳۱-۱۰):
 *  • هر کالا یک کارت تمیز: کاشی آیکون دسته + نام + مسیر + حداقل خرید
 *    (واحد از خود دسته، ثابت و غیرقابل تغییر + راهنمای تبدیل مثل ۱۰۰۰ کیلوگرم ≈ ۱ تن)
 *    + چیپ دوره خرید؛ دکمه ویرایش و دکمه سه‌نقطه با گزینه حذف.
 *  • افزودن کالا دقیقاً مثل انتخاب دسته در ثبت درخواست خرید — با این تفاوت که
 *    شاخه‌های آخر با چک‌باکس مربعی قابل تیک‌زدن‌اند (چندتایی)؛ بعد برای هر کالا فقط
 *    «حداقل خرید» و «دوره خرید» (روزانه، هفتگی، ماهیانه، سالیانه، موردی) مشخص می‌شود و ثبت نهایی.
 *  • ذخیره سمت سرور جایگزینی کامل دفتر است — افزودن/ویرایش/حذف هر بار کل فهرست را می‌فرستد.
 */

import { useMemo, useState } from 'react';
import { NotebookPen, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PanelEmptyState } from '@/components/panel/panel-parts';
import { useToast } from '@/hooks/use-toast';
import { useMyBuyerBook, useSaveMyBuyerBook } from '@/lib/mock/hooks';
import { toFa } from '@/lib/format';
import type { BuyerBookItem, PurchasePeriod } from '@/lib/types';
import { AddItemFlow, type NewBookItemInput } from '@/components/panel/buyer-book/add-item-flow';
import { BookRecordCard } from '@/components/panel/buyer-book/book-record-card';
import { EditItemDialog } from '@/components/panel/buyer-book/edit-item-dialog';

export default function BuyerBookPage() {
  const { toast } = useToast();
  const { data: book, isLoading } = useMyBuyerBook();
  const save = useSaveMyBuyerBook();

  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<BuyerBookItem | null>(null);

  const items = useMemo(() => book?.items ?? [], [book]);
  const limit = book?.max ?? 15;
  const existingIds = useMemo(() => new Set(items.map((i) => i.categoryId)), [items]);
  const remaining = Math.max(0, limit - items.length);

  /** افزودن کالاهای جدید — کل دفتر + موارد جدید جایگزین می‌شود */
  const handleAdd = async (inputs: NewBookItemInput[]) => {
    await save.mutateAsync([
      ...items.map((i) => ({ categoryId: i.categoryId, minAmount: i.minAmount, period: i.period })),
      ...inputs,
    ]);
    toast({ description: `${toFa(inputs.length)} کالا به دفتر خرید اضافه شد.` });
  };

  /** ویرایش یک کالا — همان فهرست با یک ردیف وصله‌شده */
  const handleSave = async (patch: { minAmount: number; period: PurchasePeriod }) => {
    if (!editing) return;
    await save.mutateAsync(
      items.map((i) =>
        i.categoryId === editing.categoryId
          ? { categoryId: i.categoryId, minAmount: patch.minAmount, period: patch.period }
          : { categoryId: i.categoryId, minAmount: i.minAmount, period: i.period },
      ),
    );
    setEditing(null);
    toast({ description: 'تغییرات ذخیره شد.' });
  };

  /** حذف یک کالا — فهرست بدون همان ردیف */
  const handleDelete = async (item: BuyerBookItem) => {
    await save.mutateAsync(
      items
        .filter((i) => i.categoryId !== item.categoryId)
        .map((i) => ({ categoryId: i.categoryId, minAmount: i.minAmount, period: i.period })),
    );
    toast({ description: `«${item.name}» از دفتر خرید حذف شد.` });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* سرصفحه */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-base font-extrabold sm:text-lg">دفتر خرید من</h1>
          <p className="mt-1 max-w-lg text-xs leading-6 text-muted-foreground">
            کالاهایی که به‌طور مستمر می‌خرید را ثبت کنید تا فروشندگان مناسب، پیشنهاد تامینشان را برایتان
            بفرستند و بتوانید با تامین‌کنندگان بیشتری ارتباط بگیرید.
          </p>
        </div>
        <Button className="rounded-md" onClick={() => setAddOpen(true)} disabled={remaining === 0}>
          <Plus size={16} />
          افزودن کالا
        </Button>
      </div>

      {/* شمارنده */}
      {!isLoading && items.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {toFa(items.length)} کالا در دفتر خرید
          {remaining > 0 && <> — تا {toFa(remaining)} کالا دیگر می‌توانید اضافه کنید</>}
        </p>
      )}

      {/* رکوردها */}
      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <PanelEmptyState
          icon={NotebookPen}
          title="دفتر خرید شما خالی است."
          hint="با ثبت کالاهایی که مرتب می‌خرید، فروشندگان مناسب پیشنهاد تامینشان را برای شما می‌فرستند."
          actionLabel="افزودن اولین کالا"
          onAction={() => setAddOpen(true)}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {items.map((item) => (
            <BookRecordCard
              key={item.categoryId}
              item={item}
              onEdit={() => setEditing(item)}
              onDelete={() => handleDelete(item)}
              deleting={save.isPending}
            />
          ))}
        </div>
      )}

      {/* افزودن کالا — درخت دسته با تیک برگ‌ها */}
      <AddItemFlow
        open={addOpen}
        onClose={() => setAddOpen(false)}
        existingIds={existingIds}
        existingCount={items.length}
        limit={limit}
        onSubmit={handleAdd}
      />

      {/* ویرایش کالا — فقط حداقل خرید و دوره */}
      <EditItemDialog
        item={editing}
        onClose={() => setEditing(null)}
        onSave={handleSave}
        saving={save.isPending}
      />
    </div>
  );
}
