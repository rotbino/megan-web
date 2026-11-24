'use client';

import * as React from 'react';
import * as SwitchPrimitives from '@radix-ui/react-switch';
import { cn } from '@/lib/utils';

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root> & { size?: 'default' | 'lg' }
>(({ className, size = 'default', ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      'peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input',
      // سایز بزرگ (خواستهٔ مالک ۱۹-۱۱ شب — سوییچ‌های «دارد/ندارد» تصاویر آگهی‌ها):
      // ریل ۲۸×۵۲ + توپ ۲۴px + سفر ۲۴px — بامزه و راحت‌تیک
      size === 'lg' && 'h-7 w-[52px]',
      className,
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-0 data-[state=unchecked]:translate-x-4 rtl:data-[state=checked]:-translate-x-4 rtl:data-[state=unchecked]:translate-x-0',
        size === 'lg' &&
          'h-6 w-6 data-[state=unchecked]:translate-x-6 rtl:data-[state=checked]:-translate-x-6',
      )}
    />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };
