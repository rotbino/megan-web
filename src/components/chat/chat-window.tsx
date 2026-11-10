'use client'

import { useEffect, useRef } from 'react'
import { ArrowRight, MessageSquare } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { ContactAvatar } from '@/components/chat/avatar'
import { ListingIcon } from '@/components/chat/listing-icon'
import { MessageBubble } from '@/components/chat/message-bubble'
import { ChatInput } from '@/components/chat/chat-input'
import { formatDayLabel } from '@/lib/format'
import type { ConversationDetail, LocalMessage } from '@/lib/types'
import { cn } from '@/lib/utils'

type ChatWindowProps = {
  conversation: ConversationDetail | null
  loading: boolean
  typing: boolean
  onBack: () => void
  onSend: (content: string) => void
  onRetry: (localId: string) => void
  className?: string
}

type RenderItem =
  | { kind: 'day'; key: string; label: string }
  | {
      kind: 'msg'
      key: string
      message: LocalMessage
      isFirstOfGroup: boolean
      isLastOfGroup: boolean
    }

export function ChatWindow({
  conversation,
  loading,
  typing,
  onBack,
  onSend,
  onRetry,
  className,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const lastCountRef = useRef(0)

  const messages = conversation?.messages ?? []

  // Build render list: day separators + grouped messages
  const items: RenderItem[] = []
  let prevDay = ''
  let prevSender: string | null = null
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    const day = formatDayLabel(m.createdAt)
    if (day !== prevDay) {
      items.push({ kind: 'day', key: `day-${i}-${day}`, label: day })
      prevDay = day
      prevSender = null
    }
    const next = messages[i + 1]
    const nextDay = next ? formatDayLabel(next.createdAt) : null
    const sameAsNext =
      next && next.sender === m.sender && nextDay === day
    items.push({
      kind: 'msg',
      key: m.id,
      message: m,
      isFirstOfGroup: prevSender !== m.sender,
      isLastOfGroup: !sameAsNext,
    })
    prevSender = m.sender
  }

  // Auto-scroll to bottom
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const count = messages.length + (typing ? 1 : 0)
    const grew = count > lastCountRef.current
    lastCountRef.current = count
    el.scrollTo({ top: el.scrollHeight, behavior: grew ? 'smooth' : 'auto' })
  }, [messages.length, typing, conversation?.id])

  if (loading && !conversation) {
    return (
      <section className={cn('h-full min-w-0 flex-1 flex-col', className)} aria-busy="true">
        <div className="flex h-14 items-center gap-3 border-b px-4">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1 space-y-3 p-4">
          <Skeleton className="h-10 w-40 rounded-full" />
          <Skeleton className="h-10 w-64 rounded-2xl" />
          <Skeleton className="h-10 w-52 rounded-full" />
          <Skeleton className="h-10 w-72 rounded-2xl" />
        </div>
      </section>
    )
  }

  if (!conversation) {
    return (
      <section className={cn('h-full min-w-0 flex-1 flex-col', className)}>
        <div className="flex h-14 items-center gap-2 border-b px-3 sm:px-4">
          <button
            type="button"
            onClick={onBack}
            aria-label="بازگشت به فهرست گفتگوها"
            className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-neutral-100 md:hidden"
          >
            <ArrowRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        <div className="grid flex-1 place-items-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <span className="grid h-14 w-14 place-items-center rounded-full bg-neutral-100">
              <MessageSquare className="h-6 w-6" aria-hidden="true" />
            </span>
            <p className="text-sm">گفتگو در دسترس نیست</p>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className={cn('h-full min-w-0 flex-1 flex-col bg-background', className)}>
      {/* Header: back (mobile) + contact — intentionally minimal */}
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-2 sm:px-4">
        <button
          type="button"
          onClick={onBack}
          aria-label="بازگشت به فهرست گفتگوها"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full transition hover:bg-neutral-100 md:hidden"
        >
          <ArrowRight className="h-5 w-5" aria-hidden="true" />
        </button>
        <ContactAvatar name={conversation.contactName} className="h-10 w-10 text-sm" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold">{conversation.contactName}</h2>
          <p
            className={cn(
              'truncate text-[11px]',
              typing ? 'text-emerald-600' : 'text-muted-foreground',
            )}
          >
            {typing ? 'در حال نوشتن…' : conversation.contactStatus}
          </p>
        </div>
      </header>

      {/* Listing strip: image-ish tile + title + price only */}
      <div className="flex shrink-0 items-center gap-3 border-b bg-neutral-50/60 px-3 py-2 sm:px-4">
        <ListingIcon icon={conversation.listingIcon} className="h-11 w-11" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-5">
            {conversation.listingTitle}
          </p>
          <p className="truncate text-[11px] leading-4 text-muted-foreground">
            {conversation.listingPrice}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="nice-scroll min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-4"
      >
        <div className="mx-auto flex w-full max-w-3xl flex-col">
          {items.map((item) =>
            item.kind === 'day' ? (
              <div key={item.key} className="my-3 flex justify-center first:mt-0">
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-[10px] font-medium text-muted-foreground">
                  {item.label}
                </span>
              </div>
            ) : (
              <div
                key={item.key}
                className={cn(item.isFirstOfGroup ? 'mt-2.5' : 'mt-0.5')}
              >
                <MessageBubble
                  message={item.message}
                  isFirstOfGroup={item.isFirstOfGroup}
                  isLastOfGroup={item.isLastOfGroup}
                  onRetry={onRetry}
                />
              </div>
            ),
          )}

          {typing && (
            <div className="mt-2.5 flex justify-end" aria-live="polite">
              <div className="flex items-center gap-1.5 rounded-2xl rounded-se-md bg-neutral-100 px-4 py-3">
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" />
                <span className="typing-dot h-1.5 w-1.5 rounded-full bg-neutral-400" />
                <span className="sr-only">مخاطب در حال نوشتن است</span>
              </div>
            </div>
          )}
          <div className="h-1" />
        </div>
      </div>

      <ChatInput onSend={onSend} />
    </section>
  )
}
