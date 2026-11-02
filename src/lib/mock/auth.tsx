'use client';

/**
 * وضعیت ورود — توکن‌های واقعی بک‌اند (OTP) در lib/api/client مدیریت می‌شوند؛
 * این کانتکست «کاربر نشست» را نگه می‌دارد: نام/آواتار/نقش از پروفایل واقعی.
 *
 * نقش (فروشنده/خریدار) روی بک‌اند (is_seller/is_buyer) ماندگار است —
 * با سوییچ پنل یا رادیوی ویرایش پروفایل عوض می‌شود و سیستم
 * (هدر، نوار پایین موبایل، منوها) خودش را با نقش تطبیق می‌دهد.
 *
 * جریان هیدریشن: کش نشست از localStorage فوراً می‌آید (بدون فلش)،
 * سپس پروفایل واقعی از بک‌اند دریافت و تصحیح می‌شود.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { getTokens } from '@/lib/api/client';
import { fetchAuthUser, logoutRemote, updateUserRoleRemote } from '@/lib/mock/api';
import { closeChatSocket } from '@/lib/api/socket';
import { silentResubscribeIfGranted } from '@/lib/push';
import { LazyAuthModal } from '@/components/shared/lazy-auth-modal';
import type { AuthIntent } from '@/components/shared/auth-modal';
import type { SessionUser } from '@/lib/types';

const STORAGE_KEY = 'imach:session-user';

interface AuthContextValue {
  user: SessionUser | null;
  /** اگر لاگین نبود مودال ورود را با نیات داده‌شده باز می‌کند —
   *  جملهٔ مودال با همان نیات جمله‌بندی می‌شود (قیمت/تماس/ثبت‌نام/...) */
  requireAuth: (intent?: AuthIntent) => boolean;
  login: (user: SessionUser) => void;
  logout: () => void;
  /** خروج نرم + باز شدن مودال ورود با شماره و اعلان داده‌شده —
   *  بعد از تعیین/تغییر رمز (خواسته مالک ۱-۱۱): کاربر خارج می‌شود و
   *  «رمز عبور شما تغییر کرد. لطفاً با رمز جدید وارد شوید» می‌بیند؛
   *  فرم مستقیم روی مرحلهٔ رمز با همان شماره شروع می‌شود. */
  forceRelogin: (phone: string, notice: string) => void;
  /** تغییر نقش فروشنده/خریدار — هم‌زمان در بک‌اند ماندگار می‌شود.
   *  خواستهٔ مالک ۲-۱۱ دور پانزدهم: سوییچ پنل = بازگشت به آیمچ من — صفحات
   *  نقش قبلی (مثل محصولات من/درخواست‌ها) برای نقش تازه بی‌معنی‌اند؛ مگر
   *  فرمی صریحاً بماند (رادیوی نقش در ویرایش پروفایل: keepPage) */
  setRole: (role: 'seller' | 'buyer', opts?: { keepPage?: boolean }) => void;
  /** دریافت دوباره پروفایل از بک‌اند — بعد از ویرایش پروفایل/ثبت‌نام */
  refreshUser: () => Promise<SessionUser | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** سازگاری با کش قدیمی (فقط phone/userName/role ذخیره می‌شد) */
function normalizeCachedUser(raw: unknown): SessionUser | null {
  if (!raw || typeof raw !== 'object') return null;
  const u = raw as Partial<SessionUser>;
  if (typeof u.phone !== 'string') return null;
  return {
    phone: u.phone,
    userName: typeof u.userName === 'string' ? u.userName : '',
    firstName: typeof u.firstName === 'string' ? u.firstName : '',
    lastName: typeof u.lastName === 'string' ? u.lastName : '',
    avatarUrl: u.avatarUrl ?? null,
    role: u.role === 'seller' ? 'seller' : 'buyer',
    hasPassword: u.hasPassword === true,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [open, setOpen] = useState(false);
  const [intent, setIntent] = useState<AuthIntent>('login');
  /** اعلان + شمارهٔ پیش‌پر برای ورودِ دوباره بعد از تغییر رمز */
  const [relogin, setRelogin] = useState<{ phone: string; notice: string } | null>(null);
  const bootedRef = useRef(false);
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const persist = useCallback((u: SessionUser | null) => {
    try {
      if (u) localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* حافظه پر است — فقط در state */
    }
  }, []);

  // بازیابی نشست پس از هیدریشن: کش فوری + تصحیح از بک‌اند
  // خواندن localStorage فقط بعد از مونت ممکن است — الگوی استاندارد هیدریشن (بدون ناسازگاری SSR)
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    try {
      if (getTokens()?.accessToken) {
        const cached = normalizeCachedUser(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null'));
        // eslint-disable-next-line react-hooks/set-state-in-effect -- خواندن حافظه مرورگر فقط بعد از مونت ممکن است (الگوی استاندارد هیدریشن)
        if (cached) setUser(cached);
        // تصحیح از پروفایل واقعی — نام/آواتار/نقش همیشه از بک‌اند می‌آید
        void fetchAuthUser()
          .then((fresh) => {
            if (fresh) {
              setUser(fresh);
              persist(fresh);
              // وب‌پوش (B10): نشست برگشته — اگر اجازهٔ اعلان دارد بی‌صدا تمدید کن
              void silentResubscribeIfGranted();
            } else {
              setUser(null);
              persist(null);
            }
          })
          .catch(() => {
            /* شبکه موقتاً در دسترس نیست — کش می‌ماند */
          });
      } else {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      /* نشست خراب — نادیده بگیر */
    }
  }, [persist]);

  const login = useCallback(
    (u: SessionUser) => {
      setUser(u);
      persist(u);
      // دیتای پنل نباید از نشست کاربر قبلی باقی بماند: ریسِس خروج (
      // queryClient.clear) درخواست‌های در حال پرواز را لغو نمی‌کند و نتیجه‌شان
      // بعداً به کش برمی‌گردد → با ورود کاربر جدید، کش را دوباره تخلیه می‌کنیم
      // تا پنل هرگز پروفایل کاربر قبل را نشان ندهد.
      queryClient.cancelQueries().catch(() => undefined);
      queryClient.clear();
      // وب‌پوش (B10): بعد از ورود، اگر اجازهٔ اعلان دارد بی‌صدا سابسکرایب کن
      void silentResubscribeIfGranted();
    },
    [persist, queryClient],
  );

  /** پاک‌سازی کامل نشست سمت کلاینت — مشترک بین logout و forceRelogin */
  const clearSessionClient = useCallback(() => {
    setUser(null);
    persist(null);
    // خروج واقعی — ابطال همه نشست‌ها در بک‌اند + پاک‌سازی توکن‌ها
    void logoutRemote().catch(() => undefined);
    // داده کش‌شدهٔ پنل/چت‌ها نباید بعد از خروج قابل مشاهده باشد
    // (cancelQueries: درخواست‌های در حال پرواز را هم لغو می‌کند تا بعد از clear
    // نتیجه‌شان به کش برنگردد)
    queryClient.cancelQueries().catch(() => undefined);
    queryClient.clear();
    closeChatSocket();
  }, [persist, queryClient]);

  /** خروج کامل — کلاینت + سرور + انتقال به صفحه اصلی سایت:
   *  سرور: ابطال همه نشست‌ها (اکسس‌توکن و همه رفرش‌توکن‌ها) — logoutRemote */
  const logout = useCallback(() => {
    clearSessionClient();
    // خروج = بازگشت به صفحه اصلی سایت (نه ماندن در مسیر پنل)
    router.push('/');
  }, [clearSessionClient, router]);

  /** خروج بدون جابه‌جایی + مودال ورود با شماره/اعلان — الگوی «رمز عوض شد،
   *  دوباره وارد شو»: کاربر در همان صفحه می‌ماند و مستقیم رمز جدید را می‌زند. */
  const forceRelogin = useCallback(
    (phone: string, notice: string) => {
      clearSessionClient();
      setIntent('login');
      setRelogin({ phone, notice });
      setOpen(true);
    },
    [clearSessionClient],
  );

  const setRole = useCallback(
    (role: 'seller' | 'buyer', opts?: { keepPage?: boolean }) => {
      setUser((u) => {
        if (!u || u.role === role) return u;
        const next = { ...u, role };
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch {
          /* حافظه پر است — فقط در state */
        }
        // ماندگاری در بک‌اند — بهینه (optimistic)؛ خطا وضعیت محلی را برنمی‌گرداند
        void updateUserRoleRemote(role).catch(() => undefined);
        return next;
      });
      // سوییچ پنل = بازگشت به آیمچ من (خواسته مالک دور ۱۵) — صفحات نقش
      // قبلی برای نقش تازه معنی ندارند؛ فرم‌ها با keepPage می‌مانند
      if (!opts?.keepPage && pathname !== '/panel') router.push('/panel');
    },
    [pathname, router],
  );

  const refreshUser = useCallback(async (): Promise<SessionUser | null> => {
    try {
      const fresh = await fetchAuthUser();
      setUser(fresh);
      persist(fresh);
      return fresh;
    } catch {
      return null; // شبکه — نشست فعلی دست نمی‌خورد
    }
  }, [persist]);

  const requireAuth = useCallback((why: AuthIntent = 'login') => {
    if (user) return true;
    setIntent(why);
    setOpen(true);
    return false;
  }, [user]);

  const value = useMemo(
    () => ({ user, requireAuth, login, logout, forceRelogin, setRole, refreshUser }),
    [user, requireAuth, login, logout, forceRelogin, setRole, refreshUser],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {/* چانک مودال فقط لحظه‌ی باز شدن fetch می‌شود (F5) — نیات، جملهٔ فرم را می‌سازد؛
          بعد از تغییر رمز، شماره + اعلان «با رمز جدید وارد شوید» هم می‌گیرد */}
      {open && (
        <LazyAuthModal
          open={open}
          intent={intent}
          initialPhone={relogin?.phone}
          notice={relogin?.notice}
          onClose={() => {
            setOpen(false);
            setRelogin(null);
          }}
          onLoggedIn={() => {
            setOpen(false);
            setRelogin(null);
          }}
        />
      )}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
