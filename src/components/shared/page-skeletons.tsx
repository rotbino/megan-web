/**
 * اسکلت صفحات لیست — «لودینگ داخل صفحه» به‌جای انجماد روی کلیک (خواستهٔ مالک ۱۷-۱۱):
 * ناوبری با Next/App Router وقتی loading.tsx نداره، منتظر رندر کامل سمت سرور
 * می‌مونه و کاربر حس گیر کردن دارد؛ این اسکلت با ابعاد و چیدمانِ همان صفحهٔ
 * واقعی (سایدبار ۲۶۰px + گرید ۳/۴ ستونه + کارت افقی موبایل) جای خالی را
 * از همان لحظهٔ کلیک پر می‌کند — حس lazy-loading.
 */

/** یک بلوک خاکستری تپنده */
function Bone({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-md bg-muted ${className}`} aria-hidden />;
}

/** اسکلت کارت محصول — دسکتاپ: عکس ۴:۳ + متن‌ها؛ موبایل: کارت افقی */
function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-md border bg-card">
      <div className="flex flex-1 md:block">
        <Bone className="h-28 w-28 shrink-0 md:aspect-[4/3] md:h-auto md:w-full" />
        <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 md:p-3.5">
          <Bone className="h-4 w-4/5" />
          <Bone className="h-3 w-2/5" />
          <div className="flex flex-col gap-1">
            <Bone className="h-3 w-3/5" />
            <Bone className="h-3 w-2/5" />
          </div>
          <Bone className="mt-auto h-8 w-full" />
        </div>
      </div>
      <div className="flex items-center justify-between border-t border-border/70 px-3 py-2 md:hidden">
        <Bone className="h-3 w-16" />
        <Bone className="h-3 w-12" />
      </div>
    </div>
  );
}

/** اسکلت کامل صفحهٔ لیست محصولات — /product-list و تمام زیرمسیرهایش */
export function ProductListSkeleton({ cards = 12 }: { cards?: number }) {
  return (
    <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-4 lg:grid-cols-[260px_1fr] lg:px-6 lg:py-6">
      {/* سایدبار فیلترها — فقط دسکتاپ */}
      <aside className="hidden self-start rounded-md border bg-card lg:block" aria-hidden>
        <div className="space-y-3 border-b p-4">
          <Bone className="h-4 w-24" />
          <Bone className="h-8 w-full" />
        </div>
        <div className="space-y-3 p-4">
          <Bone className="h-4 w-20" />
          <Bone className="h-3.5 w-full" />
          <Bone className="h-3.5 w-4/5" />
          <Bone className="h-3.5 w-3/5" />
        </div>
        <div className="space-y-3 p-4">
          <Bone className="h-4 w-16" />
          <Bone className="h-3.5 w-full" />
          <Bone className="h-3.5 w-2/3" />
        </div>
      </aside>

      {/* نوار مرتب‌سازی + گرید کارت‌ها */}
      <div className="min-w-0">
        <div className="mb-4 flex items-center justify-between rounded-md border bg-card px-4 py-2.5">
          <Bone className="h-4 w-40" />
          <div className="hidden items-center gap-2 md:flex">
            <Bone className="h-7 w-20" />
            <Bone className="h-7 w-20" />
          </div>
        </div>
        {/* موبایل: کارت افقی تک‌ستونه؛ دسکتاپ: ۳/۴ ستونه — عین گرید واقعی */}
        <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3 md:gap-4 xl:grid-cols-4">
          {Array.from({ length: cards }, (_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** اسکلت صفحهٔ جزئیات آگهی — گالری + ستون اطلاعات */
export function ProductViewSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6 lg:py-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,4fr)]">
        <div className="space-y-3">
          <Bone className="aspect-[4/3] w-full" />
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Bone key={i} className="aspect-square w-full" />
            ))}
          </div>
        </div>
        <div className="space-y-4 rounded-md border bg-card p-4">
          <Bone className="h-6 w-4/5" />
          <Bone className="h-4 w-2/5" />
          <div className="space-y-2.5">
            <Bone className="h-3.5 w-full" />
            <Bone className="h-3.5 w-full" />
            <Bone className="h-3.5 w-3/5" />
          </div>
          <Bone className="h-11 w-full" />
          <Bone className="h-11 w-full" />
        </div>
      </div>
    </div>
  );
}

/** اسکلت لیست درخواست‌های خرید — کارت‌های ردیفی */
export function BuyRequestsSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="mx-auto max-w-7xl px-4 py-4 lg:px-6 lg:py-6">
      <div className="mb-4 flex items-center justify-between">
        <Bone className="h-7 w-56" />
        <Bone className="h-8 w-32" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="rounded-md border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2.5">
                <Bone className="h-4.5 w-2/5" />
                <Bone className="h-3.5 w-3/5" />
                <div className="flex gap-2">
                  <Bone className="h-6 w-16" />
                  <Bone className="h-6 w-20" />
                </div>
              </div>
              <Bone className="h-9 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
