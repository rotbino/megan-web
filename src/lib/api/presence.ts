'use client';

/**
 * ─── حضور آنلاین/آفلاین (سمت کاربر) ─────────────────────────────────────────
 * سه قطعه:
 *  ۱. heartbeatPresence — نبض ۴۵ ثانیه‌ای کاربرِ واردشده (جهانی، از لی‌اوت ریشه)
 *  ۲. usePresenceStatus — وضعیت گروهی افراد دیگر با polling ۳۰ ثانیه‌ای
 *  ۳. PresenceHeartbeat — کامپوننت نصب در لی‌اوت (نبض + اتصال WS پایدار)
 *
 * «آنلاین» پنجره ۹۰ ثانیه بک‌اند است؛ polling ۳۰s یعنی حداکثر ~۳۰s تأخیر دید.
 */

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from './client';
import { ensureChatSocket } from './socket';

export interface PresenceItem {
  id: string;
  userName: string;
  online: boolean;
  lastSeenAt: string | null;
}

export interface PresenceStatusResult {
  items: PresenceItem[];
}

/** POST /presence/heartbeat — ریز و ارزان؛ خطایش بی‌اهمیت است */
async function heartbeatPresence(): Promise<void> {
  try {
    await apiFetch('/presence/heartbeat', {});
  } catch {
    /* آفلاین/توکن منقضی — بعداً دوباره */
  }
}

export interface UsePresenceInput {
  /** شناسه‌های ObjectId — کارت فروشنده/چت */
  ids?: string[];
  /** شناسه‌های عمومی پروفایل — صفحات پروفایل/آگهی */
  userNames?: string[];
}

/**
 * وضعیت حضور افراد — polling ۳۰s؛ کلید کوئری پایدار تا چند مصرف‌کننده
 * همان درخواست را اشتراک بگذارند (یک fetch برای کل صفحه).
 */
export function usePresenceStatus(input: UsePresenceInput) {
  const ids = input.ids?.filter(Boolean) ?? [];
  const userNames = input.userNames?.filter(Boolean) ?? [];
  const has = ids.length > 0 || userNames.length > 0;

  return useQuery({
    queryKey: ['presence-status', ids, userNames] as const,
    queryFn: async (): Promise<PresenceItem[]> => {
      const res = await apiFetch<PresenceStatusResult>('/presence/status', {
        ...(ids.length ? { ids: ids.slice(0, 50) } : {}),
        ...(userNames.length ? { userNames: userNames.slice(0, 50) } : {}),
      }, { auth: false });
      return res.items ?? [];
    },
    enabled: has,
    // وضعیت حضور حقیقتاً لحظه‌ای است — کش ۲۵s تازه + بازخوانی ۳۰s
    staleTime: 25_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

/** یافتن وضعیت یک نفر از نتیجه گروهی */
export function findPresence(items: PresenceItem[] | undefined, key: { id?: string; userName?: string }): PresenceItem | undefined {
  if (!items) return undefined;
  if (key.id) {
    const byId = items.find((i) => i.id === key.id);
    if (byId) return byId;
  }
  if (key.userName) return items.find((i) => i.userName === key.userName);
  return undefined;
}

/**
 * کامپوننت جهانی نبض — در لی‌اوت ریشه نصب می‌شود:
 *  • کاربر واردشده هر ۴۵s نبض می‌زند (خودش «آنلاین» دیده می‌شود)
 *  • سوکت چت را هم زنده نگه می‌دارد (push پیام در همه صفحات، نه فقط چت)
 */
export function PresenceHeartbeat({ loggedIn }: { loggedIn: boolean }) {
  useEffect(() => {
    if (!loggedIn) return;

    // بلافاصله + هر ۴۵ ثانیه (پنجره بک‌اند ۹۰s — دو فرصت از دست‌رفته)
    void heartbeatPresence();
    ensureChatSocket();
    const timer = setInterval(() => {
      void heartbeatPresence();
      ensureChatSocket();
    }, 45_000);

    // برگشت به تب — نبض فوری (کاربر «آنلاین» را همان لحظه بگیرد)
    const onVisible = () => {
      if (document.visibilityState === 'visible') void heartbeatPresence();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [loggedIn]);

  return null;
}
