'use client';

/**
 * پوشش کلاینتِ نبض حضور — در لی‌اوت ریشه (سروری) نصب می‌شود؛
 * وضعیت ورود را از AuthProvider می‌گیرد و PresenceHeartbeat را فعال می‌کند.
 */

import { useAuth } from '@/lib/mock/auth';
import { PresenceHeartbeat } from '@/lib/api/presence';

export function PresenceProvider() {
  const { user } = useAuth();
  return <PresenceHeartbeat loggedIn={Boolean(user)} />;
}
