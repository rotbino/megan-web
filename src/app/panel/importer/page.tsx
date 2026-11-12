import type { Metadata } from 'next';
import { ImporterView } from '@/components/importer/importer-view';

/** ابزار داخلی ادمین — ایندکس ممنوع */
export const metadata: Metadata = {
  title: 'ایمپورتر باسکول',
  robots: { index: false, follow: false },
};

export default function ImporterPage() {
  return <ImporterView />;
}
