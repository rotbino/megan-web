import {
  Bean,
  Citrus,
  Flower2,
  Grape,
  Nut,
  Palmtree,
  Shell,
  Sprout,
  Wheat,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * تصویر محصول — به‌جای عکس خارجی، پلیس‌هولدر گرادیانی تعیین‌پذیر با آیکون دسته.
 * در فاز واقعی، همین کامپوننت photos[] محصول (آبجکت‌استوریج) را می‌گیرد.
 */

const ICONS: Record<string, LucideIcon> = {
  pistachio: Nut,
  almond: Nut,
  hazelnut: Nut,
  raisin: Grape,
  driedFruit: Grape,
  date: Palmtree,
  saffron: Flower2,
  rice: Wheat,
  grain: Wheat,
  sunflowerSeed: Wheat,
  walnut: Shell,
  cucumber: Sprout,
  tomato: Citrus,
  bean: Bean,
};

const KEY_BY_NAME: Array<[string, string]> = [
  ['پسته', 'pistachio'],
  ['بادام', 'almond'],
  ['فندق', 'hazelnut'],
  ['کشمش', 'raisin'],
  ['میوه خشک', 'driedFruit'],
  ['خرما', 'date'],
  ['زعفران', 'saffron'],
  ['برنج', 'rice'],
  ['غلات', 'grain'],
  ['تخمه', 'sunflowerSeed'],
  ['گردو', 'walnut'],
  ['خیار', 'cucumber'],
  ['گوجه', 'tomato'],
  ['لوبیا', 'bean'],
];

function pickIconKey(subCategoryName: string): string | null {
  for (const [name, key] of KEY_BY_NAME) {
    if (subCategoryName.includes(name)) return key;
  }
  return null;
}

const GRADIENTS = [
  'from-teal-50 via-emerald-50 to-teal-100',
  'from-amber-50 via-yellow-50 to-amber-100',
  'from-lime-50 via-green-50 to-emerald-100',
  'from-emerald-50 via-teal-50 to-cyan-100',
  'from-yellow-50 via-lime-50 to-teal-100',
  'from-orange-50 via-amber-50 to-lime-100',
];

function pickGradient(seed: number) {
  return GRADIENTS[seed % GRADIENTS.length];
}

export function ProductImage({
  seed,
  subCategoryName,
  className,
  iconSize = 56,
}: {
  seed: number;
  subCategoryName: string;
  className?: string;
  iconSize?: number;
}) {
  const iconKey = pickIconKey(subCategoryName);
  const Icon = iconKey ? ICONS[iconKey] : Sprout;
  return (
    <div
      aria-hidden
      className={cn(
        'relative flex items-center justify-center overflow-hidden bg-gradient-to-br',
        pickGradient(seed),
        className,
      )}
    >
      <div className="absolute inset-0 opacity-[0.35] [background-image:radial-gradient(circle_at_20%_20%,white_1px,transparent_1px),radial-gradient(circle_at_70%_60%,white_1px,transparent_1px)] [background-size:28px_28px,36px_36px]" />
      <Icon
        size={iconSize}
        strokeWidth={1.4}
        className="relative text-emerald-900/35 drop-shadow-sm transition-transform duration-300 group-hover:scale-110"
      />
    </div>
  );
}
