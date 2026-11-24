'use client';

/**
 * ─── حضور آنلاین/آفلاین (سمت کاربر) ─────────────────────────────────────────
 * قطعه‌ها:
 *  ۱. heartbeatPresence — نبض ۴۵ ثانیه‌ای کاربرِ واردشده (جهانی، از لی‌اوت ریشه)
 *  ۲. leaveBeacon — بیکن خروج در pagehide/beforeunload و ۴۰۱ (نشست تمام‌شده)؛
 *     سرور توکنِ منقضی را برای خروج می‌پذیرد → آفلاین «همان لحظه»، نه بعد از ۹۰s
 *  ۳. usePresenceStatus — وضعیت گروهی افراد دیگر با polling ۳۰ ثانیه‌ای
 *  ۴. PresenceHeartbeat — کامپوننت نصب در لی‌اوت (نبض + اتصال WS پایدار +
 *     به‌روزرسانی بج پیام‌های خوانده‌نشده در همه صفحات)
 *
 * «آنلاین» پنجره ۹۰ ثانیه بک‌اند است؛ polling ۳۰s یعنی حداکثر ~۳۰s تأخیر دید.
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, apiBase, apiFetch, getTokens, joinUrl } from './client';
import { ensureChatSocket, onChatEvent } from './socket';

export interface PresenceItem {
  id: string;
  userName: string;
  online: boolean;
  lastSeenAt: string | null;
}

export interface PresenceStatusResult {
  items: PresenceItem[];
}

/** بیکن خروج — بستن صفحه/پایان نشست؛ fetch با keepalive از unload جان سالم به در می‌برد */
function leaveBeacon(token?: string): void {
  const t = token ?? getTokens()?.accessToken;
  if (!t) return;
  try {
    void fetch(joinUrl(apiBase(), '/presence/leave'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${t}` },
      body: '{}',
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    /* بهترین تلاش — اگر نرسد، قطع سوکت/پیرشدن پنجره آفلاین می‌کند */
  }
}

/** POST /presence/heartbeat — ریز و ارزان؛ ۴۰۱ یعنی نشست تمام شده → خروج فوری */
async function heartbeatPresence(): Promise<void> {
  const token = getTokens()?.accessToken;
  if (!token) return;
  try {
    await apiFetch('/presence/heartbeat', {});
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      // توکن همین الان پاک شده؟ آنِ قبل از فراخوانی را بفرست — سرور برای
      // «خروج» امضای معتبرِ منقضی را هم می‌پذیرد
      leaveBeacon(token);
    }
    /* آفلاین شبکه — بعداً دوباره */
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
 *  • بستن/ترک صفحه → بیکن خروج → سرور او را همان لحظه آفلاین می‌کند
 *  • سوکت چت را هم زنده نگه می‌دارد (push پیام در همه صفحات، نه فقط چت)
 *  • پیام تازه (چت/پشتیبانی) → بج خوانده‌نشده هدر/فوتر در همه صفحات تازه می‌شود
 */
export function PresenceHeartbeat({ loggedIn }: { loggedIn: boolean }) {
  const queryClient = useQueryClient();

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

    // خروج واقعی از صفحه (بستن تب/رفرش/ناوبری بیرونی) — هر دو رویداد چون
    // مرورگرها فقط یکی را می‌دهند؛ keepalive تحویل را در unload تضمین می‌کند
    const onLeave = () => leaveBeacon();
    window.addEventListener('pagehide', onLeave);
    window.addEventListener('beforeunload', onLeave);

    // بج پیام‌های خوانده‌نشده — در همه صفحات زنده بماند (نه فقط پیام‌ها)
    const offNew = onChatEvent('newMessage', () => {
      void queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    });
    const offAdmin = onChatEvent('adminMessage', () => {
      void queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    });

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pagehide', onLeave);
      window.removeEventListener('beforeunload', onLeave);
      offNew();
      offAdmin();
    };
  }, [loggedIn, queryClient]);

  return null;
}
