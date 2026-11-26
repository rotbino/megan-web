'use client';

/**
 * آیکون دسته‌بندی‌های ریشه — کاشی آیکون مینیمال (پنل و سایت).
 * به‌جای عکس، آیکون خطی برند؛ رنگ از کانتکست (text-primary و غیره).
 *
 * (۲۶-۱۱): درخت عمومی سایت = تاکسونومی v2 ایمچ (۱۵ ریشه) — آیکون هر ریشه
 * از فیلد icon درخت v2 می‌آید (نام lucide مثل «sprout»). نگاشت نام‌های قدیمی
 * باسکول هم می‌ماند (دیتای کهنهٔ دفتر خرید و فالبک‌ها).
 */

import {
  Anvil,
  Beef,
  BrickWall,
  Cog,
  Dumbbell,
  FlaskConical,
  HeartPulse,
  Leaf,
  Package,
  Shirt,
  Shovel,
  Sofa,
  Sparkles,
  Sprout,
  Trophy,
  Truck,
  Tv,
  UtensilsCrossed,
  Wheat,
  Wrench,
} from 'lucide-react';

type CategoryIcon = React.ComponentType<{ size?: number | string; className?: string }>;

/** نام آیکون lucide (فیلد icon درخت v2) → کامپوننت */
const ICON_BY_LUCIDE_NAME: Record<string, CategoryIcon> = {
  sprout: Sprout,
  beef: Beef,
  utensils: UtensilsCrossed,
  shovel: Shovel,
  cog: Cog,
  wrench: Wrench,
  package: Package,
  'brick-wall': BrickWall,
  anvil: Anvil,
  flask: FlaskConical,
  truck: Truck,
  shirt: Shirt,
  sofa: Sofa,
  trophy: Trophy,
  'heart-pulse': HeartPulse,
};

/** نگاشت نام دسته ریشه باسکول (دیتای کهنه) → آیکون */
const ICON_BY_ROOT_NAME: Record<string, CategoryIcon> = {
  'کشاورزی': Wheat,
  'فرآورده های غذایی': UtensilsCrossed,
  'خانه و مصالح ساختمانی': BrickWall,
  'فلزات، مواد معدنی و شیمیایی': FlaskConical,
  'مد، پوشاک و پارچه': Shirt,
  'کیف و کفش': Package,
  'ماشین آلات و تجهیزات صنعتی': Cog,
  'آرایشی، بهداشتی و سلامت': Sparkles,
  'لوازم خانگی و الکترونیکی': Tv,
  'لوازم ورزشی، کادویی و اسباب بازی': Dumbbell,
};

/** آیکون دستهٔ ریشه بر اساس نام — پیش‌فرض: برگ */
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

/** آیکون گرهٔ تاکسونومی v2 — از فیلد icon درخت (نام lucide)؛ پیش‌فرض: برگ */
export function TaxonomyIcon({
  icon,
  size,
  className,
}: {
  icon?: string | null;
  size?: number | string;
  className?: string;
}) {
  const Cmp = (icon && ICON_BY_LUCIDE_NAME[icon]) || Leaf;
  return <Cmp size={size} className={className} />;
}
