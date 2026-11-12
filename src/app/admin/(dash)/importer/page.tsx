import { ImporterView } from '@/components/importer/importer-view';

/**
 * ایمپورتر باسکول — ابزار مهاجرت داده از buskool.com، داخل پنل مدیریت.
 * ایندکس ممنوع (پوستهٔ /admin همان noindex کلی دارد)؛ گارد نقش ارشد
 * (SUPER_ADMIN) داخل خود کامپوننت است.
 */
export default function AdminImporterPage() {
  return <ImporterView />;
}
