'use client';

/**
 * وضعیت ورود — F1: توکن واقعی بک‌اند (OTP) در lib/api/client مدیریت می‌شود؛
 * این کانتکست فقط هویت نمایشی (phone/userName/role) را نگه می‌دارد.
 * کاربر لاگین‌نشده قیمت‌ها را نمی‌بیند (دکمه «مشاهده قیمت» فرم ورود را باز می‌کند).
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { clearTokens, getTokens } from '@/lib/api/client';
import { logoutRemote } from '@/lib/mock/api';
import { LazyAuthModal } from '@/components/shared/lazy-auth-modal';

export interface MockUser {
  phone: string;
  userName: string;
  /** نقش فعلی پنل — منو، داشبورد و نوار پایین موبایل بر اساس آن عوض می‌شود */
  role?: 'seller' | 'buyer';
}

const STORAGE_KEY = 'imach:mock-user';

interface AuthContextValue {
  user: MockUser | null;
  /** اگر لاگین نبود مودال ورود را باز می‌کند */
  requireAuth: () => boolean;
  login: (user: MockUser) => void;
  logout: () => void;
  /** تغییر نقش فروشنده/خریدار — ماندگار در نشست */
  setRole: (role: 'seller' | 'buyer') => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<MockUser | null>(null);
  const [open, setOpen] = useState(false);

  // بازیابی نشست پس از هیدریشن (بدون ناسازگاری SSR)
  // — توکن واقعی در localStorage کلاینت است؛ نشست نمایشی جدا است
  useEffect(() => {
    try {
      if (getTokens()?.accessToken) {
        const raw = localStorage.getItem(STORAGE_KEY);
        // eslint-disable-next-line react-hooks/set-state-in-effect -- خواندن حافظه مرورگر فقط بعد از مونت ممکن است (الگوی استاندارد هیدریشن)
        if (raw) setUser(JSON.parse(raw) as MockUser);
      }
    } catch {
      /* نشست خراب — نادیده بگیر */
    }
  }, []);

  const login = useCallback((u: MockUser) => {
    setUser(u);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    } catch {
      /* حافظه پر است — فقط در state */
    }
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
    // خروج واقعی — ابطال رفرش‌توکن در بک‌اند + پاک‌سازی توکن‌ها
    void logoutRemote();
  }, []);

  const setRole = useCallback((role: 'seller' | 'buyer') => {
    setUser((u) => {
      if (!u) return u;
      const next = { ...u, role };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* حافظه پر است — فقط در state */
      }
      return next;
    });
  }, []);

  const requireAuth = useCallback(() => {
    if (user) return true;
    setOpen(true);
    return false;
  }, [user]);

  const value = useMemo(
    () => ({ user, requireAuth, login, logout, setRole }),
    [user, requireAuth, login, logout, setRole],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* چانک مودال فقط لحظه‌ی باز شدن fetch می‌شود (F5) */}
      {open && <LazyAuthModal open={open} onClose={() => setOpen(false)} onLoggedIn={() => setOpen(false)} />}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
