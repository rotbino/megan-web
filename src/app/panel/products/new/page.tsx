'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCities, useProvinces } from '@/lib/mock/hooks';
import { categories } from '@/lib/mock/data';
import { toast } from 'sonner';

/**
 * فرم ثبت محصول — فیلدها عیناً منطبق بر مدل داده (Product):
 * نام، دسته سه‌سطحی، استان/شهر، موجودی(stock)، حداقل فروش(min_sale_amount)،
 * کف قیمت(min_sale_price) و توضیحات. با ثبت، به داشبورد برمی‌گردد.
 */
export default function NewProductPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  // دسته‌بندی آبشاری
  const [rootId, setRootId] = useState<number>();
  const [l2Id, setL2Id] = useState<number>();
  const [l3Id, setL3Id] = useState<number>();

  const roots = useMemo(() => categories.filter((c) => c.parentId === null), []);
  const l2List = useMemo(() => categories.filter((c) => c.parentId === rootId), [rootId]);
  const l3List = useMemo(() => categories.filter((c) => c.parentId === l2Id), [l2Id]);
  const selectedL3 = l3List.find((c) => c.id === l3Id);

  const [provinceId, setProvinceId] = useState<number>();
  const [cityId, setCityId] = useState<number>();
  const { data: provinces = [] } = useProvinces();
  const { data: cities = [] } = useCities(provinceId);

  const [form, setForm] = useState({ name: '', description: '', stock: '', minSaleAmount: '', minSalePrice: '' });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value.replace(/[^\d]/, '').length === 0 && k !== 'name' && k !== 'description' ? '' : e.target.value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!l3Id || !provinceId || !cityId || !form.name || !form.stock || !form.minSaleAmount) {
      toast.error('لطفاً همه فیلدهای الزامی را تکمیل کنید.');
      return;
    }
    setSaving(true);
    // ماک — در فاز اتصال: POST /api/v1/products
    setTimeout(() => {
      setSaving(false);
      setDone(true);
      toast.success('محصول با موفقیت ثبت شد و در انتظار تأیید است.');
      setTimeout(() => router.push('/panel'), 1600);
    }, 900);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border bg-card p-14 text-center">
        <span className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary"><CheckCircle2 size={32} /></span>
        <h1 className="text-lg font-extrabold">محصول شما ثبت شد!</h1>
        <p className="text-sm text-muted-foreground">آگهی پس از تأیید کارشناسان (حداکثر ۲ ساعت) در بازار نمایش داده می‌شود.</p>
        <p className="text-xs text-muted-foreground">در حال انتقال به داشبورد…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h1 className="text-xl font-extrabold">ثبت محصول جدید</h1>
        <p className="mt-1 text-sm text-muted-foreground">اطلاعات محصول را وارد کنید؛ فیلدهای * الزامی هستند.</p>
      </div>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-extrabold">۱. دسته‌بندی</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label>دسته اصلی <span className="text-destructive">*</span></Label>
            <Select dir="rtl" value={rootId ? String(rootId) : undefined} onValueChange={(v) => { setRootId(Number(v)); setL2Id(undefined); setL3Id(undefined); }}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="انتخاب کنید" /></SelectTrigger>
              <SelectContent>{roots.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.categoryName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>زیرشاخه <span className="text-destructive">*</span></Label>
            <Select dir="rtl" value={l2Id ? String(l2Id) : undefined} onValueChange={(v) => { setL2Id(Number(v)); setL3Id(undefined); }} disabled={!rootId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={rootId ? 'انتخاب کنید' : 'ابتدا دسته اصلی'} /></SelectTrigger>
              <SelectContent>{l2List.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.categoryName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>محصول <span className="text-destructive">*</span></Label>
            <Select dir="rtl" value={l3Id ? String(l3Id) : undefined} onValueChange={(v) => setL3Id(Number(v))} disabled={!l2Id}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={l2Id ? 'انتخاب کنید' : 'ابتدا زیرشاخه'} /></SelectTrigger>
              <SelectContent>{l3List.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.categoryName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        {selectedL3 && (
          <p className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">
            واحد فروش این دسته: {selectedL3.unit} — حداقل سفارش معمول: {new Intl.NumberFormat('fa-IR').format(selectedL3.min)} {selectedL3.unit}
            {selectedL3.example && <> — نمونه: {selectedL3.example}</>}
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-extrabold">۲. اطلاعات محصول</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="name">نام محصول <span className="text-destructive">*</span></Label>
            <Input id="name" value={form.name} onChange={set('name')} placeholder="مثال: پسته اکبری 20_22" className="rounded-xl" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="stock">میزان موجودی ({selectedL3?.unit ?? 'کیلوگرم'}) <span className="text-destructive">*</span></Label>
            <Input id="stock" inputMode="numeric" value={form.stock} onChange={set('stock')} placeholder="مثال: 1000" className="rounded-xl" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="min-amount">حداقل میزان فروش در هر معامله <span className="text-destructive">*</span></Label>
            <Input id="min-amount" inputMode="numeric" value={form.minSaleAmount} onChange={set('minSaleAmount')} placeholder="مثال: 500" className="rounded-xl" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="min-price">کف قیمت هر {selectedL3?.unit ?? 'واحد'} (تومان)</Label>
            <Input id="min-price" inputMode="numeric" value={form.minSalePrice} onChange={set('minSalePrice')} placeholder="مثال: 3700000" className="rounded-xl" />
            <p className="text-[11px] text-muted-foreground">خالی بگذارید تا فقط از طریق تماس/چت قیمت داده شود (الگوی باسکول).</p>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="desc">توضیحات محصول</Label>
          <Textarea id="desc" value={form.description} onChange={set('description')} rows={4} placeholder="کیفیت، بسته‌بندی، شرایط ارسال و…" className="rounded-xl" />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border bg-card p-5">
        <h2 className="text-sm font-extrabold">۳. موقعیت</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>استان <span className="text-destructive">*</span></Label>
            <Select dir="rtl" value={provinceId ? String(provinceId) : undefined} onValueChange={(v) => { setProvinceId(Number(v)); setCityId(undefined); }}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder="انتخاب استان" /></SelectTrigger>
              <SelectContent>{provinces.map((p) => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>شهر <span className="text-destructive">*</span></Label>
            <Select dir="rtl" value={cityId ? String(cityId) : undefined} onValueChange={(v) => setCityId(Number(v))} disabled={!provinceId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={provinceId ? 'انتخاب شهر' : 'ابتدا استان'} /></SelectTrigger>
              <SelectContent>{cities.map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="ghost" onClick={() => router.push('/panel')}>انصراف</Button>
        <Button type="submit" size="lg" className="rounded-xl" disabled={saving}>
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          {saving ? 'در حال ثبت…' : 'ثبت محصول'}
        </Button>
      </div>
    </form>
  );
}
