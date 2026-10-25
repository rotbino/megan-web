'use client';

/**
 * وضعیت ورود ماک — در فاز اتصال به بک‌اند با توکن واقعی (OTP بک‌اند ایمچ) جایگزین می‌شود.
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
import { AuthModal } from '@/components/shared/auth-modal';

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
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- خواندن حافظه مرورگر فقط بعد از مونت ممکن است (الگوی استاندارد هیدریشن)
      if (raw) setUser(JSON.parse(raw) as MockUser);
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
      <AuthModal open={open} onClose={() => setOpen(false)} onLoggedIn={() => setOpen(false)} />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
