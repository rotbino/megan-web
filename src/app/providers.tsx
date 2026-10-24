'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  // هر نشست مرورگر یک کلاینت — تنظیمات کش فرانت
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000, // داده تا ۶۰ ثانیه تازه تلقی می‌شود
            gcTime: 5 * 60_000, // کش مرده ۵ دقیقه نگه داشته می‌شود (back/forward نرم)
            refetchOnWindowFocus: false, // تجربه آرام‌تر برای بازارگاه
            retry: 1,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
