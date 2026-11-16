'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { MapPin, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCities, useProvinces } from '@/lib/mock/hooks';

/**
 * وضعیت مشترک «فیلتر مکان» بین سایدبارِ layout دسته و لیستِ صفحه —
 * (خواستهٔ مالک ۱۷-۱۱): ناوبری بین دسته‌های هم‌سطح (سیب → هلو) فقط ستون
 * لیست کالاها را عوض می‌کند؛ هدر/فوتر از layout بالاتر و سایدبار (فیلتر
 * بار) از layout دسته می‌آیند و ریمونت نمی‌شوند. چون سایدبار حالا بیرون
 * از صفحه زنده می‌ماند، state استان/شهر در این Context نگه داشته می‌شود تا
 * انتخاب کاربر بین دسته‌ها حفظ شود و کارت مکان با لیست هم‌نوا بماند.
 *
 * صفحه‌های بدون provider (لیست اصلی، جستجو، بازار شهری) از حالت «کنترل‌شده»
 * LocationFilterCard استفاده می‌کنند — عین رفتار قبلی با state محلی صفحه.
 */

interface FilterStateValue {
  provinceId?: number;
  cityId?: number;
  /** انتخاب استان — شهر وابسته را هم پاک می‌کند */
  setProvince: (id: number | undefined) => void;
  setCity: (id: number | undefined) => void;
  /** حذف همهٔ فیلترها — مکان + فیلترهای محلی صفحهٔ فعلی (سورت/جستجو/نیاز) */
  resetAll: () => void;
  /** صفحهٔ فعلی فیلترهای محلی‌اش را ثبت می‌کند تا «حذف همه» آنها را هم پاک کند */
  setPageReset: (fn: (() => void) | null) => void;
  /** آیا صفحهٔ فعلی فیلتر محلی فعال دارد؟ (نمایش دکمهٔ «حذف همه») */
  hasPageFilters: boolean;
}

const FilterStateContext = createContext<FilterStateValue | null>(null);

/** مصرف Context — خارج از provider مقدار null (صفحه با state محلی ادامه می‌دهد) */
export function useFilterState(): FilterStateValue | null {
  return useContext(FilterStateContext);
}

export function FilterStateProvider({ children }: { children: React.ReactNode }) {
  const [provinceId, setProvinceId] = useState<number | undefined>(undefined);
  const [cityId, setCityId] = useState<number | undefined>(undefined);
  const [hasPageFilters, setHasPageFilters] = useState(false);
  const pageResetRef = useRef<(() => void) | null>(null);

  const setProvince = useCallback((id: number | undefined) => {
    setProvinceId(id);
    setCityId(undefined); // شهر تابع استان است
  }, []);

  const setCity = useCallback((id: number | undefined) => setCityId(id), []);

  const setPageReset = useCallback((fn: (() => void) | null) => {
    pageResetRef.current = fn;
    setHasPageFilters(fn !== null);
  }, []);

  const resetAll = useCallback(() => {
    setProvinceId(undefined);
    setCityId(undefined);
    pageResetRef.current?.();
  }, []);

  const value = useMemo(
    () => ({ provinceId, cityId, setProvince, setCity, resetAll, setPageReset, hasPageFilters }),
    [provinceId, cityId, setProvince, setCity, resetAll, setPageReset, hasPageFilters],
  );

  return <FilterStateContext.Provider value={value}>{children}</FilterStateContext.Provider>;
}

/**
 * کارت «موقعیت جغرافیایی» سایدبار — دو حالت:
 *  • کنترل‌شده (صفحه‌هایی که سایدبار داخل خودشان رندر می‌شود: لیست اصلی/جستجو)
 *    → props از صفحه می‌آید؛ عین کد قبلی.
 *  • خودکار (صفحهٔ دسته — سایدبار از layout می‌آید) → از FilterStateContext
 *    می‌خواند؛ state بین ناوبری دسته‌ها زنده می‌ماند.
 */
export function LocationFilterCard({
  provinceId: provinceProp,
  cityId: cityProp,
  onProvinceChange,
  onCityChange,
  showReset,
  onReset,
}: {
  provinceId?: number;
  cityId?: number;
  onProvinceChange?: (id: number | undefined) => void;
  onCityChange?: (id: number | undefined) => void;
  showReset?: boolean;
  onReset?: () => void;
}) {
  const ctx = useFilterState();
  const controlled = onProvinceChange !== undefined;
  const provinceId = controlled ? provinceProp : ctx?.provinceId;
  const cityId = controlled ? cityProp : ctx?.cityId;

  const { data: provinces = [] } = useProvinces();
  const { data: cities = [] } = useCities(provinceId);

  const setProvince = (id: number | undefined) => {
    if (controlled) onProvinceChange?.(id);
    else ctx?.setProvince(id);
  };
  const setCity = (id: number | undefined) => {
    if (controlled) onCityChange?.(id);
    else ctx?.setCity(id);
  };
  const visibleReset = controlled
    ? !!showReset
    : !!(ctx && (ctx.provinceId || ctx.cityId || ctx.hasPageFilters));
  const reset = () => {
    if (controlled) onReset?.();
    else ctx?.resetAll();
  };

  return (
    <div className="space-y-3 rounded-md border bg-card p-4">
      <h2 className="flex items-center gap-1.5 text-sm font-bold">
        <MapPin size={14} className="text-primary" />
        موقعیت جغرافیایی
      </h2>
      <Select
        dir="rtl"
        value={provinceId ? String(provinceId) : undefined}
        onValueChange={(v) => setProvince(Number(v))}
      >
        <SelectTrigger className="w-full rounded-md" aria-label="استان">
          <SelectValue placeholder="همه استان‌ها" />
        </SelectTrigger>
        <SelectContent>
          {provinces.map((p) => (
            <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        dir="rtl"
        value={cityId ? String(cityId) : undefined}
        onValueChange={(v) => setCity(Number(v))}
        disabled={!provinceId}
      >
        <SelectTrigger className="w-full rounded-md" aria-label="شهر">
          <SelectValue placeholder={provinceId ? 'همه شهرها' : 'ابتدا استان را انتخاب کنید'} />
        </SelectTrigger>
        <SelectContent>
          {cities.map((c) => (
            <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {visibleReset && (
        <Button variant="ghost" size="sm" onClick={reset} className="w-full gap-1.5 text-muted-foreground">
          <RotateCcw size={13} />
          حذف همه فیلترها
        </Button>
      )}
    </div>
  );
}
