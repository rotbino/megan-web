'use client';

import { useState } from 'react';
import { Loader2, MessageSquareText, SendHorizonal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Msg {
  from: 'me' | 'seller';
  text: string;
}

/** چت ماک با فروشنده — اسکلت آماده برای WebSocket فاز بعدی */
export function ChatWidget({ sellerName, productName }: { sellerName: string; productName: string }) {
  const [messages, setMessages] = useState<Msg[]>([
    { from: 'seller', text: `سلام؛ عرضه ${productName} فعال است. برای اطلاع از قیمت به‌روز و شرایط ارسال پیام بدهید.` },
  ]);
  const [text, setText] = useState('');
  const [typing, setTyping] = useState(false);

  const send = () => {
    const t = text.trim();
    if (!t || typing) return;
    setMessages((m) => [...m, { from: 'me', text: t }]);
    setText('');
    setTyping(true);
    // پاسخ ماک فروشنده (در فاز واقعی: socket)
    setTimeout(() => {
      setMessages((m) => [...m, { from: 'seller', text: 'ممنون از پیام شما؛ کارشناسان ما تا چند دقیقه دیگر پاسخ کامل را ارسال می‌کنند.' }]);
      setTyping(false);
    }, 1200);
  };

  return (
    <section id="chat" aria-labelledby="chat-title" className="scroll-mt-24 rounded-2xl border bg-card">
      <div className="flex items-center gap-2 border-b p-4">
        <MessageSquareText size={16} className="text-primary" />
        <h2 id="chat-title" className="text-sm font-extrabold">گفتگو با {sellerName}</h2>
      </div>
      <div className="max-h-72 space-y-3 overflow-y-auto p-4">
        {messages.map((m, i) => (
          <div key={i} className={m.from === 'me' ? 'flex justify-start' : 'flex justify-end'}>
            <p
              className={
                m.from === 'me'
                  ? 'max-w-[80%] rounded-2xl rounded-s-md bg-primary px-3.5 py-2 text-sm text-primary-foreground'
                  : 'max-w-[80%] rounded-2xl rounded-e-md bg-secondary px-3.5 py-2 text-sm'
              }
            >
              {m.text}
            </p>
          </div>
        ))}
        {typing && (
          <div className="flex justify-end">
            <span className="flex items-center gap-1.5 rounded-2xl bg-secondary px-3 py-2 text-xs text-muted-foreground">
              <Loader2 size={12} className="animate-spin" />
              در حال نوشتن…
            </span>
          </div>
        )}
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex gap-2 border-t p-3"
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="پیامی بنویسید…"
          aria-label="متن پیام"
          className="rounded-xl"
        />
        <Button type="submit" size="icon" className="shrink-0 rounded-xl" aria-label="ارسال پیام">
          <SendHorizonal size={18} />
        </Button>
      </form>
    </section>
  );
}
