'use client';

/** هوک‌های React Query — یک نقطه تعریف برای همه دیتای سرور فرانت */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { ensureChatSocket, onChatEvent } from '@/lib/api/socket';
import { useBaseData } from '@/lib/base-data';
import * as api from './api';
import type { Paged } from './api';
import type { BuyRequest, Product, ProductQuery, SavedUserItem } from '@/lib/types';

const qk = {
  products: (q: ProductQuery) => ['products', q] as const,
  product: (id: number) => ['product', id] as const,
  related: (id: number) => ['related', id] as const,
  categoryTree: ['category-tree'] as const,
  provinces: ['provinces'] as const,
  cities: (pid: number) => ['cities', pid] as const,
  buyRequests: (o: { s?: string; provinceId?: number; page?: number; perPage?: number }) => ['buy-requests', o] as const,
  seller: (u: string) => ['seller', u] as const,
  suggestions: (q: string) => ['suggestions', q] as const,
};

/** initialData = دیتای SSR صفحه (فقط وقتی کوئری فعال همان کوئری پیش‌فرض اولیه باشد) */
export function useProducts(query: ProductQuery, initialData?: Paged<Product>) {
  return useQuery({
    queryKey: qk.products(query),
    queryFn: () => api.getProducts(query),
    ...(initialData ? { initialData } : {}),
    placeholderData: keepPreviousData, // صفحه‌بندی نرم بدون پرش اسکلتون
    staleTime: 60_000,
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: qk.product(id),
    queryFn: () => api.getProduct(id),
    enabled: Number.isFinite(id) && id > 0,
    staleTime: 120_000,
  });
}

export function useRelatedProducts(product: Product | null | undefined) {
  return useQuery({
    queryKey: product ? qk.related(product.id) : ['related', 'none'],
    queryFn: () => api.getRelatedProducts(product!),
    enabled: !!product,
    staleTime: 120_000,
  });
}

/** درخت دسته‌ها — initialData از seed سرور (root layout) → هیدریشن همیشه یکسان */
export function useCategoryTree() {
  const { categoryTree } = useBaseData();
  return useQuery({
    queryKey: qk.categoryTree,
    queryFn: api.getCategoryTree,
    staleTime: 600_000,
    ...(categoryTree ? { initialData: categoryTree } : {}),
  });
}

/** استان‌ها — initialData از seed سرور (root layout) */
export function useProvinces() {
  const { provinces } = useBaseData();
  return useQuery({
    queryKey: qk.provinces,
    queryFn: api.getProvinces,
    staleTime: Infinity,
    ...(provinces ? { initialData: provinces } : {}),
  });
}

export function useCities(provinceId?: number) {
  return useQuery({
    queryKey: qk.cities(provinceId ?? 0),
    queryFn: () => api.getCities(provinceId!),
    enabled: !!provinceId,
    staleTime: Infinity,
  });
}

export function useBuyRequests(
  opts: { s?: string; provinceId?: number; page?: number; perPage?: number } = {},
  initialData?: Paged<BuyRequest>,
) {
  return useQuery({
    queryKey: qk.buyRequests(opts),
    queryFn: () => api.getBuyRequests(opts),
    ...(initialData ? { initialData } : {}),
    placeholderData: keepPreviousData, // صفحه‌بندی نرم
    staleTime: 30_000,
  });
}

/** جدیدترین درخواست‌های خرید — سکشن صفحه اول */
export function useLatestBuyRequests() {
  return useQuery({ queryKey: ['latest-buy-requests'], queryFn: api.getLatestBuyRequests, staleTime: 120_000 });
}

/** شماره تماس خریدار (Lead-gen) */
export function useBuyRequestContact() {
  return useMutation({ mutationFn: api.getBuyRequestContact });
}

export function useSeller(userName: string) {
  return useQuery({ queryKey: qk.seller(userName), queryFn: () => api.getSeller(userName), staleTime: 300_000 });
}

export function useSuggestions(typedText: string) {
  return useQuery({
    queryKey: qk.suggestions(typedText),
    queryFn: () => api.searchSuggestions(typedText),
    enabled: typedText.trim().length >= 2,
    staleTime: 60_000,
  });
}

// ─── Mutations ─────────────────────────────────────────────────────────

export function useSubmitBuyRequest() {
  return useMutation({ mutationFn: api.submitBuyRequest });
}

export function useRequestOtp() {
  return useMutation({ mutationFn: api.requestOtp });
}

export function useVerifyOtp() {
  return useMutation({ mutationFn: api.verifyOtp });
}

/** ورود روش سشن — فقط شماره موبایل (فعلاً بدون پیامک) */
export function useLoginSession() {
  return useMutation({ mutationFn: api.loginWithSession });
}

/** تعیین رمز پنل — از بنر قرمز پنل */
export function useSetPassword() {
  return useMutation({ mutationFn: api.setPasswordRemote });
}

// ─── پنل فروشنده ──────────────────────────────────────────────────────

export function usePanelProfile() {
  return useQuery({ queryKey: ['panel-profile'], queryFn: api.getPanelProfile, staleTime: 60_000 });
}

export function useMyProducts() {
  return useQuery({ queryKey: ['panel-my-products'], queryFn: api.getMyProducts, staleTime: 30_000 });
}

export function useSavedLists() {
  return useQuery({ queryKey: ['panel-saved-lists'], queryFn: api.getSavedLists, staleTime: 30_000 });
}

export function useSavedListUsers(listId: string) {
  return useQuery({
    queryKey: ['panel-saved-users', listId],
    queryFn: () => api.getSavedListUsers(listId),
    staleTime: 30_000,
  });
}

export function useSuggestedBuyers() {
  return useQuery({ queryKey: ['panel-suggested-buyers'], queryFn: api.getSuggestedBuyers, staleTime: 60_000 });
}

export function useSubmitProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.submitProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-my-products'] });
    },
  });
}

/** حذف نرم آگهی خودم — با ابطال کش لیست */
export function useDeleteMyProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteMyProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-my-products'] });
      queryClient.invalidateQueries({ queryKey: ['panel-profile'] });
    },
  });
}

/** جزئیات آگهی خودم — پیش‌پر کردن فرم ویرایش */
export function useMyProductDetail(id: number | null) {
  return useQuery({
    queryKey: ['panel-my-product-detail', id],
    queryFn: () => api.getMyProductDetail(id!),
    enabled: id != null && id > 0,
    staleTime: 30_000,
  });
}

/** ویرایش آگهی خودم → دوباره در انتظار تایید */
export function useUpdateMyProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateMyProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-my-products'] });
      queryClient.invalidateQueries({ queryKey: ['panel-my-product-detail'] });
    },
  });
}

/** خرید نردبان یک‌ماهه — کسر واقعی از کیف پول */
export function useLadderProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.ladderProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-my-products'] });
      queryClient.invalidateQueries({ queryKey: ['panel-profile'] });
      queryClient.invalidateQueries({ queryKey: ['panel-wallet-transactions'] });
    },
  });
}


// ─── چت و پیام‌ها (B8) ────────────────────────────────────────────────

/** رویدادهای WS چت — با invalidation خودکار React Query */
export function useChatSocketEvents(opts: { onNewMessage?: (p: unknown) => void; onRead?: (p: unknown) => void; onAdminMessage?: (p: unknown) => void } = {}) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const offNew = onChatEvent('newMessage', (p) => {
      opts.onNewMessage?.(p);
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-thread-messages'] });
    });
    const offRead = onChatEvent('read', (p) => {
      opts.onRead?.(p);
      queryClient.invalidateQueries({ queryKey: ['chat-thread-messages'] });
    });
    // پیام مستقیم پشتیبانی (ادمین → کاربر) — صندوق جدا از مکالمات
    const offAdmin = onChatEvent('adminMessage', (p) => {
      opts.onAdminMessage?.(p);
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
    });
    // کاربر ممکن است بعد از mount لاگین کند — تلاش دوره‌ای اتصال با توکن تازه
    const timer = setInterval(() => ensureChatSocket(), 5_000);
    return () => {
      clearInterval(timer);
      offNew();
      offRead();
      offAdmin();
    };
  }, []);
}

export function useStartChatThread() {
  return useMutation({ mutationFn: api.startChatThread });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { threadId: string; text: string }) => api.sendChatMessage(input.threadId, input.text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-thread-messages'] });
    },
  });
}

export function useChatThreadMessages(threadId: string | null) {
  return useQuery({
    queryKey: ['chat-thread-messages', threadId],
    queryFn: () => api.getChatThreadMessages(threadId!),
    enabled: !!threadId,
    staleTime: 15_000,
    refetchInterval: 30_000, // شبکه ایمنی — WS قطع شد، از REST تازه می‌شود
  });
}

export function useConversations() {
  return useQuery({ queryKey: ['chat-conversations'], queryFn: api.getConversations, staleTime: 15_000 });
}

// ─── پیام‌های پشتیبانی (ادمین → کاربر) ─────────────────────────────────

/** صندوق «پشتیبانی ایمچ» — WS + شبکه ایمنی REST هر ۳۰ ثانیه */
export function useAdminMessages() {
  return useQuery({
    queryKey: ['admin-messages'],
    queryFn: api.getMyAdminMessages,
    staleTime: 15_000,
    refetchInterval: 30_000,
  });
}

/** باز کردن مکالمه پشتیبانی = خواندن همه خوانده‌نشده‌ها */
export function useMarkAdminMessagesRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.markAdminMessagesRead,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-messages'] }),
  });
}

// ─── CRM نشان شده ها (B7) ─────────────────────────────────────────────

export function useCreateSavedList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createSavedList,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['panel-saved-lists'] }),
  });
}

export function useUpdateSavedList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { listId: string; name: string }) => api.updateSavedList(input.listId, input.name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-saved-lists'] });
      queryClient.invalidateQueries({ queryKey: ['panel-saved-users'] });
    },
  });
}

export function useDeleteSavedList() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteSavedList,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['panel-saved-lists'] }),
  });
}

export function useSaveBuyer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.saveBuyerToList,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['panel-saved-lists'] }),
  });
}

export function useSetSavedUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { savedUserId: string; status: SavedUserItem['status'] }) =>
      api.setSavedUserStatus(input.savedUserId, input.status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['panel-saved-users'] }),
  });
}

export function useAddSavedUserNote() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { savedUserId: string; text: string }) =>
      api.addSavedUserNote(input.savedUserId, input.text),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['panel-saved-users'] }),
  });
}

export function useMoveSavedUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { savedUserId: string; toListId: string }) =>
      api.moveSavedUser(input.savedUserId, input.toListId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-saved-users'] });
      queryClient.invalidateQueries({ queryKey: ['panel-saved-lists'] });
    },
  });
}

export function useRemoveSavedUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.removeSavedUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-saved-users'] });
      queryClient.invalidateQueries({ queryKey: ['panel-saved-lists'] });
    },
  });
}

// ─── پنل خریدار ──────────────────────────────────────────────────────

export function useMyBuyRequests() {
  return useQuery({ queryKey: ['panel-my-buy-requests'], queryFn: api.getMyBuyRequests, staleTime: 30_000 });
}

export function useSuggestedSellerGroups() {
  return useQuery({ queryKey: ['panel-suggested-sellers'], queryFn: api.getSuggestedSellerGroups, staleTime: 60_000 });
}

export function useSubmitPanelBuyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.submitPanelBuyRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-my-buy-requests'] });
    },
  });
}

export function useDeleteMyBuyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteMyBuyRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-my-buy-requests'] });
    },
  });
}

/** ویرایش درخواست «در انتظار تایید» — با ابطال کش لیست */
export function useUpdateMyBuyRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateMyBuyRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-my-buy-requests'] });
    },
  });
}

// ─── پروفایل + کیف پول کارت به کارت ───────────────────────────────────

export function useUpdatePanelProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updatePanelProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-profile'] });
    },
  });
}

export function useWalletTransactions() {
  return useQuery({ queryKey: ['panel-wallet-transactions'], queryFn: api.getWalletTransactions, staleTime: 30_000 });
}

/** فیش‌های کارت‌به‌کارت خودم — تب «کارت به کارت» کیف پول */
export function useMyChargeOrders() {
  return useQuery({ queryKey: ['panel-wallet-charges'], queryFn: api.getMyChargeOrders, staleTime: 15_000 });
}

export function useSubmitChargeRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.submitChargeRequest,
    onSuccess: () => {
      // فیش جدید → صف کارت‌به‌کارت فوراً؛ تراکنش‌ها فقط بعد از تأیید ادمین عوض می‌شوند
      queryClient.invalidateQueries({ queryKey: ['panel-wallet-charges'] });
      queryClient.invalidateQueries({ queryKey: ['panel-profile'] });
    },
  });
}

// ─── احراز هویت اسناد (B6) ────────────────────────────────────────────

export function useMyVerification() {
  return useQuery({ queryKey: ['panel-verification'], queryFn: api.getMyVerification, staleTime: 60_000 });
}

export function useSubmitVerification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.submitVerification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-verification'] });
      queryClient.invalidateQueries({ queryKey: ['panel-profile'] }); // is_verified ممکن است تغییر کند
    },
  });
}

// ─── نظرات فروشنده ──────────────────────────────────────────────────────────

export function useSellerReviews(userName: string, page = 1) {
  return useQuery({
    queryKey: ['seller-reviews', userName, page] as const,
    queryFn: () => api.getSellerReviews(userName, page),
    enabled: Boolean(userName),
    staleTime: 60_000,
  });
}

export function useAddSellerReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userName: string; rating: number; text: string }) => api.addSellerReview(input),
    onSuccess: (_d, input) => {
      void queryClient.invalidateQueries({ queryKey: ['seller-reviews', input.userName] });
      void queryClient.invalidateQueries({ queryKey: ['seller', input.userName] });
    },
  });
}
