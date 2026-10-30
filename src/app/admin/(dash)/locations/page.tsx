'use client';

/**
 * مدیریت مکان‌ها (فاز A2) — استان‌ها + شهرها: افزودن/ویرایش/فعال-غیرفعال.
 * مکان غیرفعال از لیست‌های عمومی پنهان و ثبت آگهی جدید روی آن رد می‌شود؛
 * آگهی‌های قدیمی نامشان را همچنان با join می‌گیرند. تم سفیدِ فلت.
 */

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Power,
  Search,
} from 'lucide-react';
import {
  fetchAdminLocations,
  setLocationActive,
  upsertLocation,
  type AdminProvince,
} from '@/lib/admin/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { toFa } from '@/lib/format';

interface FormState {
  buskolId?: number;
  type: 'province' | 'city';
  name: string;
  enName: string;
  parentId?: number; // شهر
  parentName?: string;
}

const EMPTY_PROVINCE: FormState = { type: 'province', name: '', enName: '' };

/** دیالوگ افزودن/ویرایش مکان (استان یا شهر) */
function LocationDialog({
  open,
  initial,
  onClose,
  onSaved,
}: {
  open: boolean;
  initial: FormState;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(initial);
  const [error, setError] = useState('');
  const isEdit = form.buskolId != null;

  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) {
      setForm(initial);
      setError('');
    }
  }

  const save = useMutation({
    mutationFn: () =>
      upsertLocation({
        buskolId: form.buskolId,
        type: form.type,
        name: form.name.trim(),
        ...(form.enName.trim() ? { enName: form.enName.trim() } : {}),
        ...(form.type === 'city' ? { parentId: form.parentId } : {}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin-locations'] });
      toast({ description: isEdit ? 'مکان به‌روزرسانی شد.' : 'مکان جدید ایجاد شد.' });
      onSaved();
    },
    onError: (err: Error) => setError(err.message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (form.name.trim().length < 2) {
      setError('نام مکان باید حداقل ۲ نویسه باشد.');
      return;
    }
    save.mutate();
  };

  if (!open) return null;
  const title =
    form.type === 'province'
      ? isEdit
        ? 'ویرایش استان'
        : 'استان جدید'
      : isEdit
        ? 'ویرایش شهر'
        : `شهر جدید در «${form.parentName ?? ''}»`;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="بستن" className="absolute inset-0 bg-black/40" onClick={onClose} />
      <form onSubmit={submit} className="relative w-full max-w-md space-y-4 rounded-xl border bg-card p-6 shadow-lg">
        <div>
          <h2 className="text-sm font-extrabold">{title}</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">
            نام یکتا در هر سطح؛ مکان غیرفعال از فرم‌های عمومی پنهان می‌شود.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loc-name">نام ({form.type === 'province' ? 'استان' : 'شهر'})</Label>
          <Input
            id="loc-name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            maxLength={50}
            autoFocus
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="loc-en">نام انگلیسی (اختیاری)</Label>
          <Input
            id="loc-en"
            dir="ltr"
            value={form.enName}
            onChange={(e) => setForm({ ...form, enName: e.target.value })}
            maxLength={50}
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2 pt-1">
          <Button type="submit" className="flex-1 rounded-md" disabled={save.isPending}>
            {save.isPending ? <Loader2 className="animate-spin" size={16} /> : null}
            {isEdit ? 'ذخیره تغییرات' : 'ایجاد'}
          </Button>
          <Button type="button" variant="outline" className="rounded-md" onClick={onClose}>
            انصراف
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function AdminLocationsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['admin-locations'],
    queryFn: () => fetchAdminLocations(),
  });

  const [selectedProvince, setSelectedProvince] = useState<AdminProvince | null>(null);
  const [provinceSearch, setProvinceSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [dialog, setDialog] = useState<{ open: boolean; initial: FormState }>({ open: false, initial: EMPTY_PROVINCE });

  const provinces = (data?.provinces ?? []).filter((p) =>
    provinceSearch.trim() ? p.name.includes(provinceSearch.trim()) : true,
  );
  const cities = (data?.cities ?? []).filter(
    (c) =>
      c.provinceId === selectedProvince?.id &&
      (citySearch.trim() ? c.name.includes(citySearch.trim()) : true),
  );

  const toggleActive = useMutation({
    mutationFn: (input: { buskolId: number; type: 'province' | 'city'; active: boolean }) =>
      setLocationActive(input.buskolId, input.type, input.active),
    onSuccess: (_d, input) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-locations'] });
      toast({
        description: input.active
          ? 'مکان فعال شد — در فرم‌ها و لیست‌های عمومی دیده می‌شود.'
          : 'مکان غیرفعال شد — از فرم‌های عمومی پنهان است و ثبت آگهی جدید روی آن ممکن نیست.',
      });
    },
    onError: (err: Error) => toast({ description: err.message, variant: 'destructive' }),
  });

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 place-items-center rounded-md bg-primary/10 text-primary">
            <MapPin size={18} />
          </span>
          <div>
            <h1 className="text-base font-extrabold">مدیریت مکان‌ها</h1>
            <p className="text-[11px] text-muted-foreground">
              {toFa(data?.provinces.length ?? 0)} استان — انتخاب استان، شهرهایش را نشان می‌دهد
            </p>
          </div>
        </div>
        <Button
          className="rounded-md"
          onClick={() => setDialog({ open: true, initial: EMPTY_PROVINCE })}
        >
          <Plus size={16} /> استان جدید
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <Skeleton className="h-96 rounded-lg" />
          <Skeleton className="h-96 rounded-lg" />
        </div>
      ) : (
        <div className="grid items-start gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          {/* استان‌ها */}
          <div className="overflow-hidden rounded-lg border bg-card">
            <div className="border-b p-3">
              <div className="relative">
                <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                <Input
                  value={provinceSearch}
                  onChange={(e) => setProvinceSearch(e.target.value)}
                  placeholder="جستجوی استان…"
                  className="h-9 rounded-md pe-9"
                />
              </div>
            </div>
            <ul className="max-h-[480px] overflow-y-auto">
              {provinces.map((p) => (
                <li key={p.id} className="border-b last:border-0">
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-2.5 text-sm transition-colors',
                      selectedProvince?.id === p.id ? 'bg-primary/10' : 'hover:bg-secondary/40',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedProvince(p)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-start"
                    >
                      <span className={cn('truncate', selectedProvince?.id === p.id ? 'font-bold text-primary' : 'font-medium')}>
                        {p.name}
                      </span>
                      {!p.isActive && (
                        <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                          غیرفعال
                        </span>
                      )}
                      <span className="ms-auto shrink-0 text-[11px] text-muted-foreground">
                        {toFa(p.cityCount)} شهر
                      </span>
                    </button>
                    <button
                      type="button"
                      title={p.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                      onClick={() => toggleActive.mutate({ buskolId: p.id, type: 'province', active: !p.isActive })}
                      className={cn(
                        'grid size-7 shrink-0 place-items-center rounded-sm transition-colors',
                        p.isActive
                          ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                          : 'text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600',
                      )}
                    >
                      <Power size={14} />
                    </button>
                    <button
                      type="button"
                      title="ویرایش نام استان"
                      onClick={() =>
                        setDialog({
                          open: true,
                          initial: { buskolId: p.id, type: 'province', name: p.name, enName: p.enName ?? '' },
                        })
                      }
                      className="grid size-7 shrink-0 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    >
                      <Pencil size={14} />
                    </button>
                  </div>
                </li>
              ))}
              {provinces.length === 0 && (
                <li className="p-8 text-center text-sm text-muted-foreground">استانی پیدا نشد.</li>
              )}
            </ul>
          </div>

          {/* شهرهای استان انتخابی */}
          <div className="overflow-hidden rounded-lg border bg-card">
            {selectedProvince ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b p-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-extrabold">شهرهای {selectedProvince.name}</h2>
                    <p className="text-[11px] text-muted-foreground">
                      {toFa(cities.length)} شهر — نام یکتا در هر استان
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60" />
                      <Input
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        placeholder="جستجوی شهر…"
                        className="h-9 w-40 rounded-md pe-9"
                      />
                    </div>
                    <Button
                      size="sm"
                      className="rounded-md"
                      onClick={() =>
                        setDialog({
                          open: true,
                          initial: {
                            type: 'city',
                            name: '',
                            enName: '',
                            parentId: selectedProvince.id,
                            parentName: selectedProvince.name,
                          },
                        })
                      }
                    >
                      <Plus size={15} /> شهر جدید
                    </Button>
                  </div>
                </div>
                <ul className="max-h-[432px] overflow-y-auto">
                  {cities.map((c) => (
                    <li key={c.id} className="flex items-center gap-2 border-b px-3 py-2.5 text-sm last:border-0 hover:bg-secondary/30">
                      <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                      {!c.isActive && (
                        <span className="shrink-0 rounded-full bg-destructive/10 px-1.5 py-0.5 text-[9px] font-bold text-destructive">
                          غیرفعال
                        </span>
                      )}
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {toFa(c.userCount)} کاربر · {toFa(c.productCount)} آگهی
                      </span>
                      <button
                        type="button"
                        title={c.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
                        onClick={() => toggleActive.mutate({ buskolId: c.id, type: 'city', active: !c.isActive })}
                        className={cn(
                          'grid size-7 shrink-0 place-items-center rounded-sm transition-colors',
                          c.isActive
                            ? 'text-muted-foreground hover:bg-destructive/10 hover:text-destructive'
                            : 'text-muted-foreground hover:bg-emerald-500/10 hover:text-emerald-600',
                        )}
                      >
                        <Power size={14} />
                      </button>
                      <button
                        type="button"
                        title="ویرایش شهر"
                        onClick={() =>
                          setDialog({
                            open: true,
                            initial: {
                              buskolId: c.id,
                              type: 'city',
                              name: c.name,
                              enName: c.enName ?? '',
                              parentId: c.provinceId,
                              parentName: selectedProvince.name,
                            },
                          })
                        }
                        className="grid size-7 shrink-0 place-items-center rounded-sm text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                      >
                        <Pencil size={14} />
                      </button>
                    </li>
                  ))}
                  {cities.length === 0 && (
                    <li className="p-8 text-center text-sm text-muted-foreground">
                      شهری {citySearch.trim() ? 'مطابق جستجو' : 'در این استان'} پیدا نشد.
                    </li>
                  )}
                </ul>
              </>
            ) : (
              <div className="grid h-full min-h-[240px] place-items-center p-8 text-center">
                <div className="space-y-2 text-muted-foreground">
                  <MapPin size={28} className="mx-auto opacity-40" />
                  <p className="text-sm">یک استان را از فهرست کنار انتخاب کنید</p>
                  <p className="text-[11px]">شهرهای آن استان اینجا مدیریت می‌شوند</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <LocationDialog
        open={dialog.open}
        initial={dialog.initial}
        onClose={() => setDialog((d) => ({ ...d, open: false }))}
        onSaved={() => setDialog((d) => ({ ...d, open: false }))}
      />
    </div>
  );
}
