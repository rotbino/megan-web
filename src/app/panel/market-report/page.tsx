import { redirect } from 'next/navigation';

/** مسیر قدیمی گزارش بازار — به هاب گزارشات ریدایرکت (۲۵-۱۱ راند ۲) */
export default function MarketReportRedirect() {
  redirect('/panel/reports/market');
}
