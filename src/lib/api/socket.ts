'use client';

/**
 * کلاینت WebSocket چت — socket.io تک‌نمونه (singleton) با توکن JWT.
 * اتصال مستقیم به بک‌اند (NEXT_PUBLIC_WS_URL — پیش‌فرض :4000)؛ CORS بک باز است.
 * چند کامپوننت می‌توانند onChatEvent بگیرند — همه روی همان اتصال.
 */

import { io, type Socket } from 'socket.io-client';
import { getTokens } from './client';

export interface ChatMessagePayload {
  id: string;
  threadId: string;
  senderId: string;
  text: string;
  readAt: string | null;
  createdAt: string;
  kind: 'text' | 'image' | 'video' | 'file';
  file: { url: string; key: string; name: string; size: number; mime: string } | null;
  editedAt: string | null;
}

export interface ChatNewMessageEvent {
  threadId: string;
  message: ChatMessagePayload;
  senderName: string;
}

export interface ChatReadEvent {
  threadId: string;
  by: string;
}

/** Ù¾ÛØ§Ù ÙÛØ±Ø§ÛØ´âØ´Ø¯Ù ÙÙØ· ØªØ§ ÙØ¨Ù Ø§Ø² ÙØ´Ø§ÙØ¯ÙÙ Ø·Ø±Ù ÙÙØ§Ø¨Ù */
export interface ChatEditEvent {
  threadId: string;
  message: ChatMessagePayload;
}

/** Ù¾ÛØ§Ù Ø­Ø°ÙâØ´Ø¯Ù Ø¯ÛØ¯ÙâÙØ´Ø¯Ùâ ÙØ§ÛÙØ´ ÙÙ Ø§Ø² Ø³Ø±ÙØ± Ù¾Ø§Ú© Ø´Ø¯Ù */
export interface ChatDeleteEvent {
  threadId: string;
  messageId: string;
}

/** پیام پشتیبانی (ادمین → کاربر) — یک‌طرفه؛ بدون threadId */
export interface AdminNewMessageEvent {
  message: {
    id: string;
    text: string;
    adminUsername: string;
    createdAt: string;
  };
}

/** پاسخ تازهٔ گفتگوی پشتیبانی (ادمین → کاربر) — ریل‌تایم (خواستهٔ مالک ۸-۱۱) */
export interface SupportNewMessageEvent {
  message: ChatMessagePayload;
}

type Handler = (payload: unknown) => void;

export type ChatEventName = 'newMessage' | 'read' | 'adminMessage' | 'edit' | 'delete' | 'supportMessage';

const listeners: Record<ChatEventName, Set<Handler>> = {
  newMessage: new Set(),
  read: new Set(),
  adminMessage: new Set(),
  edit: new Set(),
  delete: new Set(),
  supportMessage: new Set(),
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
  socket.on('chat:adminMessage', (p) => {
    listeners.adminMessage.forEach((h) => h(p));
  });
  socket.on('chat:edit', (p) => {
    listeners.edit.forEach((h) => h(p));
  });
  socket.on('chat:delete', (p) => {
    listeners.delete.forEach((h) => h(p));
  });
  socket.on('support:newMessage', (p) => {
    listeners.supportMessage.forEach((h) => h(p));
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
export function onChatEvent(event: ChatEventName, handler: Handler): () => void {
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
