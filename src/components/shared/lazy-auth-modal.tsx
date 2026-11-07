'use client';

/**
 * مودال ورود با لود تنبل (F5) — تنها تعریف واحد.
 * چانک auth-modal (شامل input-otp و BottomSheet) فقط لحظه‌ی باز شدن fetch
 * می‌شود؛ باندل اولیه‌ی صفحات عمومی ~25KB سبک‌تر می‌شود.
 * fallback=null: مودال هنگام باز شدن بدون فلش رندر می‌شود.
 */

import { lazy, Suspense, type ComponentProps } from 'react';

const AuthModal = lazy(() =>
  import('@/components/shared/auth-modal').then((m) => ({ default: m.AuthModal })),
);

export type LazyAuthModalProps = ComponentProps<typeof AuthModal>;

export function LazyAuthModal(props: LazyAuthModalProps) {
  return (
    <Suspense fallback={null}>
      <AuthModal {...props} />
    </Suspense>
  );
}
