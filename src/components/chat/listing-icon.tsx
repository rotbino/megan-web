import {
  Bike,
  Car,
  Gamepad2,
  Home,
  Smartphone,
  Sofa,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const ICONS: Record<string, { icon: LucideIcon; tile: string }> = {
  home: { icon: Home, tile: 'bg-emerald-50 text-emerald-600' },
  car: { icon: Car, tile: 'bg-rose-50 text-rose-600' },
  phone: { icon: Smartphone, tile: 'bg-amber-50 text-amber-600' },
  sofa: { icon: Sofa, tile: 'bg-violet-50 text-violet-600' },
  bike: { icon: Bike, tile: 'bg-teal-50 text-teal-600' },
  gamepad: { icon: Gamepad2, tile: 'bg-orange-50 text-orange-600' },
}

export function ListingIcon({
  icon,
  className,
}: {
  icon: string
  className?: string
}) {
  const item = ICONS[icon] ?? ICONS.home
  const Icon = item.icon
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-xl',
        item.tile,
        className ?? 'h-10 w-10',
      )}
    >
      <Icon className="h-5 w-5" />
    </span>
  )
}
