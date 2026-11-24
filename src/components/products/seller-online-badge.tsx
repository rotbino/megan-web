'use client';

/**
 * نشان آنلاین/آفلاین فروشنده در کارت آگهی (سایدبار) — polling ۳۰s.
 * SSR هم می‌تواند online/lastSeenAt اولیه بدهد (prop) تا قبل از اولین
 * پاس، وضعیت درست باشد.
 */

import { PresenceDot } from '@/components/shared/presence-dot';
import { findPresence, usePresenceStatus } from '@/lib/api/presence';

export function SellerOnlineBadge({
  userName,
  sellerId,
  initialOnline,
  initialLastSeenAt,
}: {
  userName: string;
  sellerId?: string;
  initialOnline?: boolean | null;
  initialLastSeenAt?: string | null;
}) {
  const { data: presenceItems } = usePresenceStatus({
    ...(sellerId ? { ids: [sellerId] } : {}),
    userNames: [userName],
  });
  const live = findPresence(presenceItems, {
    ...(sellerId ? { id: sellerId } : {}),
    userName,
  });

  return (
    <PresenceDot
      online={live?.online ?? initialOnline ?? null}
      lastSeenAt={live?.lastSeenAt ?? initialLastSeenAt}
      className="shrink-0"
    />
  );
}
