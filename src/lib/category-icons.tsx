'use client';

/**
 * آیکون دسته‌بندی‌های ریشه — کاشی آیکون مینیمال کارت‌های دفتر خرید (پنل و سایت).
 * به‌جای عکس، آیکون خطی برند؛ رنگ از کانتکست (text-primary و غیره).
 */

import {
  Cog,
  Dumbbell,
  FlaskConical,
  HardHat,
  Leaf,
  Shirt,
  ShoppingBag,
  Sparkles,
  Tv,
  UtensilsCrossed,
  Wheat,
} from 'lucide-react';

type CategoryIcon = React.ComponentType<{ size?: number | string; className?: string }>;

/** نگاشت نام دسته ریشه → آیکون (دیتای دفتر خرید نام ریشه را دارد) */
const ICON_BY_ROOT_NAME: Record<string, CategoryIcon> = {
  'کشاورزی': Wheat,
  'فرآورده های غذایی': UtensilsCrossed,
  'خانه و مصالح ساختمانی': HardHat,
  'فلزات، مواد معدنی و شیمیایی': FlaskConical,
  'مد، پوشاک و پارچه': Shirt,
  'کیف و کفش': ShoppingBag,
  'ماشین آلات و تجهیزات صنعتی': Cog,
  'آرایشی، بهداشتی و سلامت': Sparkles,
  'لوازم خانگی و الکترونیکی': Tv,
  'لوازم ورزشی، کادویی و اسباب بازی': Dumbbell,
};

/** آیکون دسته ریشه بر اساس نام — پیش‌فرض: برگ */
export function RootCategoryIcon({
  rootName,
  size,
  className,
}: {
  rootName: string | number | undefined | null;
  size?: number | string;
  className?: string;
}) {
  const Cmp = ICON_BY_ROOT_NAME[String(rootName ?? '')] ?? Leaf;
  return <Cmp size={size} className={className} />;
}
