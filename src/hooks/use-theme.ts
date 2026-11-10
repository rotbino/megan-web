'use client';

/**
 * هوک تم ایمچ — وضعیت روشن/تیره + رنگ برند را از localStorage می‌خواند و
 * با هر تغییر، همان‌ لحظه کل سایت (توکن‌های CSS روی <html>) را به‌روز می‌کند.
 * پالت در اسکریپت بوت پیاده‌سازی شده (window.__aimchTheme) — اینجا فقط UI است.
 *
 * useSyncExternalStore: localStorage منبع حقیقت است (اسکریپت بوت قبل از
 * رنگ‌آمیزی همان را اعمال کرده)؛ رویداد storage هم تغییر تب‌های دیگر را می‌آورد.
 */

import { useCallback, useSyncExternalStore } from 'react';
import {
  DEFAULT_ACCENT,
  type ThemeMode,
  type ThemeState,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  isCustomAccent,
  readTheme,
  writeTheme,
} from '@/lib/theme';

/** اسنپ‌شات سرور — همیشه پیش‌فرض (روشن/آبی)؛ با html suppressHydrationWarning پوشش دارد */
const SERVER_SNAPSHOT: ThemeState = { mode: 'light', accent: DEFAULT_ACCENT };

/** کش اسنپ‌شات — getSnapshot باید تا وقتی localStorage تغییر نکرده مرجع پایدار برگرداند */
let cached: ThemeState | null = null;
let cachedRaw: string | null = null;

function getSnapshot(): ThemeState {
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  if (cached === null || cachedRaw !== raw) {
    cached = readTheme();
    cachedRaw = raw;
  }
  return cached;
}

function subscribe(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(THEME_CHANGE_EVENT, callback);
  };
}

export function useTheme() {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SNAPSHOT);

  const setMode = useCallback((mode: ThemeMode) => writeTheme({ ...readTheme(), mode }), []);
  /** accent = کلید یکی از ۱۶ رنگ آماده یا «#rrggbb» دلخواه */
  const setAccent = useCallback((accent: string) => writeTheme({ ...readTheme(), accent }), []);

  return {
    mode: state.mode,
    accent: state.accent,
    custom: isCustomAccent(state.accent),
    setMode,
    setAccent,
  };
}
