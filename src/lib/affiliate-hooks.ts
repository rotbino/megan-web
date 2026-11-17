'use client';

/**
 * هوک‌های React Query بازاریابی افلیت — یک نقطه تعریف برای دیتای پنل
 * بازاریاب و پنل ادمین. در فاز اتصال، فقط توابع src/lib/affiliate.ts
 * به فراخوانی بک‌اند تغییر می‌کنند و این هوک‌ها دست‌نخورده می‌مانند.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as api from './affiliate';
import type { AffiliateRole, AffiliateSettings } from './affiliate';

// ─── پنل بازاریاب ──────────────────────────────────────────────────────

export function useAffiliateOverview() {
  return useQuery({ queryKey: ['affiliate-overview'], queryFn: api.getAffiliateOverview, staleTime: 30_000 });
}

export function useAffiliateInvitees() {
  return useQuery({ queryKey: ['affiliate-invitees'], queryFn: api.getAffiliateInvitees, staleTime: 30_000 });
}

export function useAffiliateEarnings() {
  return useQuery({ queryKey: ['affiliate-earnings'], queryFn: api.getAffiliateEarnings, staleTime: 30_000 });
}

export function useAffiliateSubMarketers() {
  return useQuery({ queryKey: ['affiliate-subs'], queryFn: api.getAffiliateSubMarketers, staleTime: 30_000 });
}

export function useAffiliateMessages() {
  return useQuery({ queryKey: ['affiliate-messages'], queryFn: api.getAffiliateMessages, staleTime: 15_000 });
}

export function useAcceptAffiliateContract() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.acceptAffiliateContract,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-overview'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-earnings'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-subs'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-invitees'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-messages'] });
    },
  });
}

export function useSendAffiliateMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.sendAffiliateMessage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-messages'] });
    },
  });
}

// ─── پنل ادمین بازاریابی ───────────────────────────────────────────────

export function useAdminAffiliateSettings() {
  return useQuery({ queryKey: ['admin-affiliate-settings'], queryFn: api.getAdminAffiliateSettings, staleTime: 30_000 });
}

export function useAdminAffiliates() {
  return useQuery({ queryKey: ['admin-affiliates'], queryFn: api.getAdminAffiliates, staleTime: 15_000 });
}

export function useAdminPayments() {
  return useQuery({ queryKey: ['admin-affiliate-payments'], queryFn: api.getAdminPayments, staleTime: 15_000 });
}

export function useUpdateAffiliateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (s: AffiliateSettings) => api.updateAdminAffiliateSettings(s),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-settings'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-overview'] }); // متن قرارداد به‌روز شود
    },
  });
}

export function useSetAffiliateRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, role }: { userId: number; role: AffiliateRole }) =>
      api.setAdminAffiliateRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-affiliates'] });
      queryClient.invalidateQueries({ queryKey: ['admin-affiliate-payments'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-overview'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-earnings'] });
      queryClient.invalidateQueries({ queryKey: ['affiliate-subs'] });
    },
  });
}
