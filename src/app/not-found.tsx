import Link from 'next/link';
import { Compass, Home } from 'lucide-react';
import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <span className="grid size-16 place-items-center rounded-2xl bg-primary/10 text-primary">
          <Compass size={30} />
        </span>
        <h1 className="text-2xl font-extrabold">صفحه مورد نظر پیدا نشد!</h1>
        <p className="max-w-sm text-sm leading-6 text-muted-foreground">
          ممکن است آگهی حذف یا نشانی تغییر کرده باشد. از بازار مِگان شروع کنید یا درخواست خرید ثبت کنید.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button asChild className="rounded-xl"><Link href="/"><Home size={16} /> صفحه اصلی</Link></Button>
          <Button asChild variant="outline" className="rounded-xl"><Link href="/product-list">مشاهده بازار عمده</Link></Button>
        </div>
      </main>
      <Footer />
    </>
  );
}
