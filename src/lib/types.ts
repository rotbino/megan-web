/**
 * انواع داده مِگان — کاملاً منطبق بر ساختار باسکول (استخراج‌شده از APIهای واقعی)
 * و هم‌راستا با مدل‌های Prisma در megan-back.
 *
 * نگاشت نام‌ها (TS camelCase ↔ ستون snake_case باسکول):
 *   myuserId ↔ myuser_id | subCategoryId ↔ sub_category_id
 *   minSalePrice ↔ min_sale_price | minSaleAmount ↔ min_sale_amount
 *   isElevated ↔ is_elevated | activePakageType ↔ active_pakage_type
 */

export type PackageType = 0 | 1 | 2; // 0=رایگان 1=فروشنده عادی 2=فروشنده ویژه

export interface User {
  id: number;
  phone: string;
  userName: string; // شناسه عمومی پروفایل مثل c34qxnsh
  firstName: string;
  lastName: string;
  activePakageType: PackageType;
  isVerified: boolean;
  businessDesc?: string;
  createdAt: string;
}

export interface Category {
  id: number;
  categoryName: string;
  slug: string;
  unit: string; // «کیلوگرم»
  min: number; // حداقل سفارش پیش‌فرض
  example?: string;
  parentId: number | null;
  score: number;
  children?: Category[];
}

export interface Province {
  id: number;
  name: string;
}

export interface City {
  id: number;
  name: string;
  provinceId: number;
}

export interface Product {
  id: number;
  productName: string;
  slug: string;
  description: string;
  stock: number; // موجودی آماده فروش
  minSalePrice: number | null; // کف قیمت هر واحد (تومان)
  minSaleAmount: number; // حداقل میزان فروش در هر معامله
  unit: string;

  categoryId: number; // دسته پدر (مثل خشکبار)
  categoryName: string;
  subCategoryId: number; // دسته برگ (مثل پسته)
  subCategoryName: string;

  provinceId: number;
  provinceName: string;
  cityId: number;
  cityName: string;

  myuserId: number;
  seller: {
    id: number;
    userName: string;
    firstName: string;
    lastName: string;
    activePakageType: PackageType;
    isVerified: boolean;
  };

  isElevated: boolean;
  hasVideo: boolean;
  isOld: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  photos: string[];
}

export interface BuyRequest {
  id: number;
  name: string | null;
  categoryId: number;
  subcategoryName: string;
  requirementAmount: number;
  unit: string;
  myuserId: number;
  firstName: string;
  lastName: string;
  city: string;
  isVerified: boolean;
  createdAt: string;
}

export type SortKey = 'related' | 'newest' | 'cheapest' | 'stockiest';

export interface ProductQuery {
  categorySlug?: string;
  s?: string; // عبارت جستجو (مثل باسکول: ?s=)
  provinceId?: number;
  cityId?: number;
  sort?: SortKey;
  page?: number;
}
