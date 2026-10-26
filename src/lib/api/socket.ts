'use client';

/**
 * کلاینت WebSocket چت — socket.io تک‌نمونه (singleton) با توکن JWT.
 * اتصال مستقیم به بک‌اند (NEXT_PUBLIC_WS_URL — پیش‌فرض :4000)؛ CORS بک باز است.
 * چند کامپوننت می‌توانند onChatEvent بگیرند — همه روی همان اتصال.
 */

import { io, type Socket } from 'socket.io-client';
import { getTokens } from './client';

export interface ChatNewMessageEvent {
  threadId: string;
  message: {
    id: string;
    threadId: string;
    senderId: string;
    text: string;
    readAt: string | null;
    createdAt: string;
  };
  senderName: string;
}

export interface ChatReadEvent {
  threadId: string;
  by: string;
}

type Handler = (payload: unknown) => void;

const listeners: Record<'newMessage' | 'read', Set<Handler>> = {
  newMessage: new Set(),
  read: new Set(),
};

let socket: Socket | null = null;
let connecting = false;

function wsBase(): string {
  return process.env.NEXT_PUBLIC_WS_URL ?? 'http://localhost:4000';
}

/** اتصال (در صورت نبود) — با توکن تازه؛ بی‌خطر برای فراخوانی مکرر */
export function ensureChatSocket(): Socket | null {
  if (typeof window === 'undefined') return null;
  if (socket?.connected) return socket;
  if (connecting) return socket;

  const token = getTokens()?.accessToken;
  if (!token) return null;

  // اتصال مرده قبلی را ببند
  socket?.removeAllListeners();
  socket?.close();

  connecting = true;
  socket = io(wsBase(), {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on('chat:newMessage', (p) => {
    listeners.newMessage.forEach((h) => h(p));
  });
  socket.on('chat:read', (p) => {
    listeners.read.forEach((h) => h(p));
  });
  socket.on('connect', () => {
    connecting = false;
  });
  socket.on('connect_error', () => {
    connecting = false;
    // توکن ممکن است منقضی شده باشد — اتصال دوباره با توکن تازه در فراخوانی بعدی
  });

  return socket;
}

/** اشتراک رویداد چت — تابع لغو اشتراک برمی‌گرداند */
export function onChatEvent(
  event: 'newMessage' | 'read',
  handler: Handler,
): () => void {
  listeners[event].add(handler);
  ensureChatSocket();
  return () => {
    listeners[event].delete(handler);
  };
}

/** بستن اتصال (هنگام خروج از حساب) */
export function closeChatSocket(): void {
  socket?.removeAllListeners();
  socket?.close();
  socket = null;
  connecting = false;
}
