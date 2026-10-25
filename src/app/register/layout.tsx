import type { Metadata } from 'next';

/** صفحه ورود/ثبت‌نام — نیازی به ایندکس ندارد */
export const metadata: Metadata = {
  title: 'ورود و ثبت نام',
  description: 'ورود یا ثبت‌نام در ایمچ با شماره موبایل و کد یک‌بارمصرف.',
  alternates: { canonical: '/register' },
  robots: { index: false, follow: true },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
