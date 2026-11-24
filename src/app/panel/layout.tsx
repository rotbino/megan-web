import type { Metadata } from 'next';
import { PanelShell } from '@/components/panel/panel-shell';

/** پنل کاربری خصوصی است — ایندکس موتورهای جستجو ممنوع (مثل صفحه ورود). */
export const metadata: Metadata = {
  title: 'پنل کاربری',
  robots: { index: false, follow: false },
};

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <PanelShell>{children}</PanelShell>;
}
