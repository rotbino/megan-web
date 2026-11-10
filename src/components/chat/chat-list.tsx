'use client'

import { Skeleton } from '@/components/ui/skeleton'
import { ContactAvatar } from '@/components/chat/avatar'
import { formatListTime } from '@/lib/format'
import type { ConversationSummary } from '@/lib/types'
import { cn } from '@/lib/utils'

type ChatListProps = {
  conversations: ConversationSummary[]
  activeId: string | null
  loading: boolean
  onSelect: (id: string) => void
  className?: string
}

export function ChatList({
  conversations,
  activeId,
  loading,
  onSelect,
  className,
}: ChatListProps) {
  return (
    <aside
      className={cn(
        'h-full w-full flex-col md:w-[320px] md:shrink-0 md:border-e md:bg-background lg:w-[360px]',
        'bg-neutral-50/70',
        className,
      )}
    >
      <header className="flex h-14 shrink-0 items-center border-b bg-background/80 px-4 backdrop-blur">
        <h1 className="text-base font-bold">گفتگوها</h1>
      </header>

      <nav aria-label="فهرست گفتگوها" className="nice-scroll min-h-0 flex-1 overflow-y-auto p-2">
        {loading ? (
          <ul className="space-y-1" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3 rounded-xl p-2.5">
                <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              </li>
            ))}
          </ul>
        ) : conversations.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            گفتگویی وجود ندارد
          </p>
        ) : (
          <ul className="space-y-0.5">
            {conversations.map((c) => {
              const isActive = c.id === activeId
              return (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(c.id)}
                    aria-current={isActive ? 'true' : undefined}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl p-2.5 text-start transition-colors',
                      'min-h-[60px] outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50',
                      isActive
                        ? 'bg-emerald-50/80'
                        : 'hover:bg-neutral-200/40 active:bg-neutral-200/60',
                    )}
                  >
                    <ContactAvatar name={c.contactName} className="h-11 w-11 text-sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline gap-2">
                        <span className="truncate text-sm font-semibold">
                          {c.contactName}
                        </span>
                        <span className="ms-auto shrink-0 text-[10px] text-muted-foreground">
                          {formatListTime(c.lastMessageAt)}
                        </span>
                      </span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span
                          className={cn(
                            'truncate text-xs',
                            c.unread > 0
                              ? 'font-medium text-foreground/80'
                              : 'text-muted-foreground',
                          )}
                        >
                          {c.lastSender === 'user' ? 'شما: ' : ''}
                          {c.lastMessage ?? 'بدون پیام'}
                        </span>
                        {c.unread > 0 && (
                          <span className="ms-auto grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                            {c.unread.toLocaleString('fa-IR')}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </nav>
    </aside>
  )
}
