'use client';

import { UsersManager } from '@/components/data-import/users-manager';

/**
 * مدیریت کاربران ایمپورت‌شده — بخش «دیتا ایمپورت» (خواستهٔ مالک ۱۳-۱۱).
 * جدا از صفحهٔ «کاربران» پنل ادمین: تمرکز روی رفتار کاربران ایمپورت‌شده از
 * باسکول (ویژه بودن، ورود بعد از دعوت، پاک‌سازی رهاشده‌ها) در کنار سایر
 * کاربران. گارد نشست در پوستهٔ /data-import است.
 */
export default function DataImportUsersPage() {
  return <UsersManager />;
}
