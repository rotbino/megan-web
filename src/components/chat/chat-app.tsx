'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { ChatList } from '@/components/chat/chat-list'
import { ChatWindow } from '@/components/chat/chat-window'
import type {
  ChatMessage,
  ConversationDetail,
  ConversationSummary,
  LocalMessage,
} from '@/lib/types'
import { cn } from '@/lib/utils'

const json = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, init)
  if (!res.ok) throw new Error(`${res.status}`)
  return res.json()
}

export function ChatApp() {
  const [conversations, setConversations] = useState<ConversationSummary[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [detail, setDetail] = useState<ConversationDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [typing, setTyping] = useState(false)

  const activeIdRef = useRef<string | null>(null)
  const replyPendingRef = useRef(false)
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  const fetchList = useCallback(async () => {
    try {
      const data = await json('/api/conversations')
      setConversations(data.conversations)
    } catch {
      /* keep current list on transient errors */
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchList()
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') fetchList()
    }, 10_000)
    return () => clearInterval(id)
  }, [fetchList])

  /** Patch a conversation row in the list (last message + time) and keep it sorted */
  const patchList = useCallback(
    (convId: string, lastMessage: string, lastSender: 'user' | 'contact') => {
      setConversations((prev) => {
        const now = new Date().toISOString()
        const next = prev.map((c) =>
          c.id === convId
            ? {
                ...c,
                lastMessage,
                lastSender,
                lastMessageAt: now,
                unread: lastSender === 'contact' ? c.unread : c.unread,
              }
            : c,
        )
        return next.sort(
          (a, b) =>
            new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime(),
        )
      })
    },
    [],
  )

  // Open a conversation: load messages + mark as read
  useEffect(() => {
    if (!activeId) {
      setDetail(null)
      setDetailLoading(false)
      return
    }
    let cancelled = false
    setDetail(null)
    setDetailLoading(true)
    setTyping(false)

    json(`/api/conversations/${activeId}`)
      .then((data) => {
        if (!cancelled && data.conversation) setDetail(data.conversation)
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })

    json(`/api/conversations/${activeId}/read`, { method: 'POST' })
      .then(() => {
        if (cancelled) return
        setConversations((prev) =>
          prev.map((c) => (c.id === activeId ? { ...c, unread: 0 } : c)),
        )
      })
      .catch(() => undefined)

    return () => {
      cancelled = true
    }
  }, [activeId])

  useEffect(
    () => () => {
      timersRef.current.forEach(clearTimeout)
    },
    [],
  )

  /** Contact auto-reply: typing indicator → reply message */
  const scheduleReply = useCallback((convId: string) => {
    if (replyPendingRef.current) return
    replyPendingRef.current = true

    const typingDelay = 900 + Math.random() * 700
    const replyDelay = typingDelay + 1500 + Math.random() * 1500

    const t1 = setTimeout(() => {
      if (activeIdRef.current === convId) setTyping(true)
    }, typingDelay)

    const t2 = setTimeout(async () => {
      try {
        const data = await json(`/api/conversations/${convId}/reply`, {
          method: 'POST',
        })
        const message: ChatMessage = data.message
        setTyping(false)
        replyPendingRef.current = false
        patchList(convId, message.content, 'contact')
        if (activeIdRef.current === convId) {
          setDetail((d) =>
            d && d.id === convId
              ? {
                  ...d,
                  messages: [
                    ...d.messages.map((m) =>
                      m.sender === 'user' ? { ...m, isRead: true } : m,
                    ),
                    message,
                  ],
                }
              : d,
          )
          fetch(`/api/conversations/${convId}/read`, { method: 'POST' }).catch(
            () => undefined,
          )
        }
      } catch {
        setTyping(false)
        replyPendingRef.current = false
      }
    }, replyDelay)

    timersRef.current.push(t1, t2)
  }, [patchList])

  const doSend = useCallback(
    async (convId: string, content: string, tempId?: string) => {
      const localId =
        tempId ?? `temp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const optimistic: LocalMessage = {
        id: localId,
        conversationId: convId,
        content,
        sender: 'user',
        createdAt: new Date().toISOString(),
        isRead: false,
        status: 'sending',
      }
      setDetail((d) =>
        d && d.id === convId
          ? { ...d, messages: [...d.messages, optimistic] }
          : d,
      )
      patchList(convId, content, 'user')

      try {
        const data = await json(`/api/conversations/${convId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        const real: ChatMessage = data.message
        setDetail((d) =>
          d && d.id === convId
            ? {
                ...d,
                messages: d.messages.map((m) =>
                  m.id === localId ? real : m,
                ),
              }
            : d,
        )
        scheduleReply(convId)
      } catch {
        setDetail((d) =>
          d && d.id === convId
            ? {
                ...d,
                messages: d.messages.map((m) =>
                  m.id === localId ? { ...m, status: 'failed' } : m,
                ),
              }
            : d,
        )
      }
    },
    [patchList, scheduleReply],
  )

  const handleSend = useCallback(
    (content: string) => {
      if (!activeId) return
      doSend(activeId, content)
    },
    [activeId, doSend],
  )

  const handleRetry = useCallback(
    (localId: string) => {
      if (!detail) return
      const failed = detail.messages.find(
        (m) => m.id === localId && m.status === 'failed',
      )
      if (!failed) return
      setDetail((d) =>
        d ? { ...d, messages: d.messages.filter((m) => m.id !== localId) } : d,
      )
      doSend(detail.id, failed.content)
    },
    [detail, doSend],
  )

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Stage 1 (mobile): conversation list — full screen until one is picked */}
      <ChatList
        conversations={conversations}
        activeId={activeId}
        loading={listLoading}
        onSelect={setActiveId}
        className={cn(activeId ? 'hidden md:flex' : 'flex')}
      />

      {/* Stage 2 (mobile): the conversation — only when one is active */}
      {activeId ? (
        <ChatWindow
          conversation={detail}
          loading={detailLoading}
          typing={typing}
          onBack={() => setActiveId(null)}
          onSend={handleSend}
          onRetry={handleRetry}
          className="flex"
        />
      ) : (
        <section
          aria-hidden="true"
          className="hidden flex-1 flex-col items-center justify-center gap-3 text-muted-foreground md:flex"
        >
          <span className="grid h-16 w-16 place-items-center rounded-full bg-neutral-100">
            <MessageSquare className="h-7 w-7" />
          </span>
          <p className="text-sm">یک گفتگو را انتخاب کنید</p>
        </section>
      )}
    </div>
  )
}
