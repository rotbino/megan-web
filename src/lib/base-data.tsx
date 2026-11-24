'use client';

/**
 * داده‌های پایه SSR-seeded — چهارچوب ضد-ناهماهنگی هیدریشن (F5):
 *
 * درخت دسته‌ها و استان‌ها در root layout سمت سرور fetch می‌شوند (کش داده نکست)
 * و از این کانتکست به‌صورت `initialData` به هوک‌های React Query می‌رسند.
 * نتیجه: HTML سرور و اولین رندر کلاینت یکی است → هیدریشن هیچ‌وقت به‌خاطر
 * «کوئری سریع‌تر از هیدریشن» نمی‌شکند (خطای React #418 و CLS ~۰.۴ را کشت).
 *
 * اگر fetch سرور شکست بخورد (بک‌اند خاموش در build) مقدارها undefined می‌مانند
 * و هوک‌ها مثل قبل به fetch کلاینت برمی‌گردند — تنزل تدریجی.
 */

import { createContext, useContext, type ReactNode } from 'react';
import type { Category, Province } from '@/lib/types';

interface BaseData {
  /** درخت کامل دسته‌ها (seed شده در root layout) */
  categoryTree?: Category[];
  /** ۳۱ استان (seed شده در root layout) */
  provinces?: Province[];
}

const BaseDataContext = createContext<BaseData>({});

export function BaseDataProvider({
  tree,
  provinces,
  children,
}: {
  tree?: Category[];
  provinces?: Province[];
  children: ReactNode;
}) {
  return (
    <BaseDataContext.Provider value={{ categoryTree: tree, provinces }}>
      {children}
    </BaseDataContext.Provider>
  );
}

export function useBaseData(): BaseData {
  return useContext(BaseDataContext);
}
