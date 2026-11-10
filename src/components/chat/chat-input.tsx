'use client'

import { useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { SendHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

type ChatInputProps = {
  onSend: (content: string) => void
  disabled?: boolean
}

export function ChatInput({ onSend, disabled }: ChatInputProps) {
  const [value, setValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const resize = () => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }

  const submit = (e?: FormEvent) => {
    e?.preventDefault()
    const content = value.trim()
    if (!content || disabled) return
    onSend(content)
    setValue('')
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    })
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="shrink-0 border-t bg-background px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-4">
      <form
        onSubmit={submit}
        className="mx-auto flex w-full max-w-3xl items-end gap-2"
      >
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            resize()
          }}
          onKeyDown={handleKeyDown}
          placeholder="پیامی بنویسید"
          aria-label="متن پیام"
          className="nice-scroll max-h-32 flex-1 resize-none rounded-2xl bg-neutral-100 px-4 py-2.5 text-sm leading-6 text-foreground placeholder:text-muted-foreground/70 outline-none transition focus:bg-neutral-100/80 focus:ring-2 focus:ring-emerald-500/40"
        />
        <button
          type="submit"
          aria-label="ارسال پیام"
          disabled={!value.trim() || disabled}
          className={cn(
            'grid h-10 w-10 shrink-0 place-items-center rounded-full transition',
            'bg-emerald-600 text-white shadow-sm',
            'hover:bg-emerald-700 active:scale-95',
            'disabled:cursor-default disabled:opacity-50 disabled:hover:bg-emerald-600 disabled:active:scale-100',
          )}
        >
          <SendHorizontal className="h-5 w-5 -scale-x-100" aria-hidden="true" />
        </button>
      </form>
    </div>
  )
}
