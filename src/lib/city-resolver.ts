/**
 * رزولور شهر سمت سرور — نام شهر → id باسکول + استان (برای صفحات فرود شهری).
 *
 * خواستهٔ مالک ۱-۱۱ (دور جدید): «تک تک شهرها با تک تک دسته ها» — هر عبارتِ
 * شهری سئو (خرید عمده برنج در تهران) به صفحهٔ فرود اختصاصی
 * /product-list/search/{کالا}/{شهر} می‌رود که نتایجش واقعاً با city_id همان
 * شهر فیلتر شده است. این ماژول نام شهرِ مسیر را به id تبدیل می‌کند.
 *
 * داده: POST /locations/getCitiesByProvince بدون province_id = همهٔ شهرها
 * (کش ۱۰ دقیقه‌ای بک‌اند + کش دادهٔ نکست ۱ ساعته). کل لیست یک‌بار در هر
 * پروسه memo می‌شود؛ جستجو روی Map با کلید نرمال‌شده (بدون فاصله/نیم‌فاصله،
 * ی→ی عربی و…) تا «بندرعباس» با «بندر عباس» یکی باشد.
 */

import { serverPost } from './api/client';

export interface ResolvedCity {
  /** id عددی باسکول — همان چیزی که getProductList می‌فهمد */
  id: number;
  /** نام رسمی شهر از دیتابیس (برای h1/عنوان) */
  name: string;
  /** id استانِ شهر — برای seed اولیهٔ فیلتر آبشاری سمت کلاینت */
  provinceId: number;
}

interface RawCity {
  id: number;
  province_id: number | null;
  city_name: string;
}

/** کلید یکتای مقایسه — فقط حروف فارسی نرمال‌شده، بدون هیچ فاصله‌ای */
function cityKey(name: string): string {
  return name
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/\u200c/g, '')
    .replace(/\s+/g, '')
    .trim();
}

/** همهٔ شهرها — کش دادهٔ نکست (۱ ساعت) + memo پروسه */
async function getAllCities(): Promise<RawCity[]> {
  try {
    const raw = await serverPost<RawCity[]>('/locations/getCitiesByProvince', {}, 3600);
    return Array.isArray(raw) ? raw.filter((c) => c && c.id && c.city_name) : [];
  } catch {
    return []; // بک‌اند در دسترس نیست → 404 آرام
  }
}

/** رزولور memo-شده — کلید → شهر */
let cityIndex: Map<string, ResolvedCity> | null = null;

/** یافتن شهر با نام — نرمال‌سازی مقایسه (بندرعباس = بندر عباس) */
export async function resolveCityByName(name: string): Promise<ResolvedCity | null> {
  const key = cityKey(name);
  if (!key) return null;
  if (!cityIndex) {
    const list = await getAllCities();
    cityIndex = new Map();
    for (const c of list) {
      if (c.province_id == null) continue;
      const k = cityKey(c.city_name);
      // اولین تقدم را نگه می‌داریم (شهرهای هم‌نام در استان‌های مختلف — نادر)
      if (k && !cityIndex.has(k)) {
        cityIndex.set(k, { id: c.id, name: c.city_name, provinceId: c.province_id });
      }
    }
  }
  return cityIndex.get(key) ?? null;
}
