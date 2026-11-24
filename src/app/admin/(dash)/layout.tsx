import { AdminShell } from '@/components/admin/admin-shell';

/**
 * پوسته صفحات داشبورد ادمین — گارد نشست + سایدبار + تاپ‌بار.
 * (ورود در /admin/login بدون این پوسته است)
 */
export default function AdminDashLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
