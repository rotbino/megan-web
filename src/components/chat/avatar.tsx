import { cn } from '@/lib/utils'

const AVATAR_COLORS = [
  'bg-emerald-100 text-emerald-700',
  'bg-rose-100 text-rose-700',
  'bg-amber-100 text-amber-700',
  'bg-teal-100 text-teal-700',
  'bg-orange-100 text-orange-700',
  'bg-fuchsia-100 text-fuchsia-700',
]

export function ContactAvatar({
  name,
  className,
}: {
  name: string
  className?: string
}) {
  const hash = [...name].reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  const color = AVATAR_COLORS[hash % AVATAR_COLORS.length]
  const parts = name.trim().split(/\s+/)
  const initials = parts
    .slice(0, 2)
    .map((p) => p[0])
    .join('')

  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-full font-semibold select-none',
        color,
        className ?? 'h-10 w-10 text-sm',
      )}
    >
      {initials}
    </span>
  )
}
