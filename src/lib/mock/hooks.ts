'use client';

/** هوک‌های React Query — یک نقطه تعریف برای همه دیتای سرور فرانت */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { ensureChatSocket, onChatEvent } from '@/lib/api/socket';
import { useBaseData } from '@/lib/base-data';
import * as api from './api';
import type { Paged } from './api';
import type { BuyRequest, FollowFolder, FollowItem, FollowStatus, FollowTargetType, Product, ProductQuery } from '@/lib/types';

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

export function useRelatedProducts(product: Product | null | undefined, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: product ? [...qk.related(product.id), page, pageSize] : ['related', 'none'],
    queryFn: () => api.getRelatedProducts(product!, page, pageSize),
    enabled: !!product,
    placeholderData: (prev) => prev, // صفحه‌بندی نرم — اسکرول نپرد
    staleTime: 120_000,
  });
}

/** آگهی‌های دیگر همان فروشنده — ریل افقی صفحهٔ محصول */
export function useSellerProducts(userName: string | undefined, excludeId?: number, limit = 12) {
  return useQuery({
    queryKey: ['seller-products', userName, excludeId, limit],
    queryFn: () => api.getSellerProducts(userName!, excludeId, limit),
    enabled: Boolean(userName),
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
  opts: { s?: string; categoryId?: number; provinceId?: number; page?: number; perPage?: number } = {},
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

export function useMyProducts(enabled = true) {
  return useQuery({
    queryKey: ['panel-my-products'],
    queryFn: api.getMyProducts,
    staleTime: 30_000,
    enabled,
  });
}

// ─── پیگیری‌ها — CRM کوچک ایمچ ────────────────────────────────────────

/** پرونده‌های پیگیری من — تعداد و خلاصه قیف هر پرونده */
export function useFollowFolders() {
  return useQuery({ queryKey: ['follow-folders'], queryFn: api.getFollowFolders, staleTime: 15_000 });
}

/** موارد یک پرونده — با snapshot درخواست خرید/آگهی فروش */
export function useFollowFolderItems(folderId: string) {
  return useQuery({
    queryKey: ['follow-items', folderId],
    queryFn: () => api.getFollowFolderItems(folderId),
    staleTime: 15_000,
    enabled: Boolean(folderId),
  });
}

/** وضعیت دکمهٔ ذخیره — آیا این هدف در پیگیری من است؟ (فقط با ورود) */
export function useIsFollowing(targetType: FollowTargetType, targetId: number, enabled = true) {
  return useQuery({
    queryKey: ['follow-state', targetType, targetId],
    queryFn: () => api.isFollowing(targetType, targetId),
    enabled,
    staleTime: 15_000,
  });
}

/** باطل‌کردن کل دیتای پیگیری پس از هر تغییر */
function useInvalidateFollows() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['follow-folders'] });
    queryClient.invalidateQueries({ queryKey: ['follow-items'] });
    queryClient.invalidateQueries({ queryKey: ['follow-state'] });
  };
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
      // صفحهٔ آمار هم isLadder را نشان می‌دهد (ردیف «روش‌های افزایش بازدید»)
      queryClient.invalidateQueries({ queryKey: ['product-stats'] });
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
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    });
    const offRead = onChatEvent('read', (p) => {
      opts.onRead?.(p);
      queryClient.invalidateQueries({ queryKey: ['chat-thread-messages'] });
    });
    // پیام مستقیم پشتیبانی (ادمین → کاربر) — صندوق جدا از مکالمات
    const offAdmin = onChatEvent('adminMessage', (p) => {
      opts.onAdminMessage?.(p);
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
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
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ['chat-thread-messages', threadId],
    queryFn: async () => {
      const msgs = await api.getChatThreadMessages(threadId!);
      // باز کردن مکالمه = خوانده‌شدن سمت سرور → بج هدر/فوتر همان لحظه صفر شود
      void queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      return msgs;
    },
    enabled: !!threadId,
    staleTime: 15_000,
    refetchInterval: 30_000, // شبکه ایمنی — WS قطع شد، از REST تازه می‌شود
  });
}

export function useConversations() {
  return useQuery({ queryKey: ['chat-conversations'], queryFn: api.getConversations, staleTime: 15_000 });
}

// ─── پیام‌های پشتیبانی (ادمین → کاربر) ─────────────────────────────────

/** بج پیام‌های خوانده‌نشده — هدر/فوتر موبایل؛ polling ۳۰s + push WS */
export function useUnreadMessagesCount(enabled: boolean) {
  return useQuery({
    queryKey: ['unread-messages-count'],
    queryFn: api.getUnreadMessagesCount,
    enabled,
    staleTime: 15_000,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });
}

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-messages'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    },
  });
}

// ─── پیگیری‌ها — تغییرات (CRM کوچک) ───────────────────────────────────

export function useCreateFollowFolder() {
  const invalidate = useInvalidateFollows();
  return useMutation({
    mutationFn: (input: { name: string }) => api.createFollowFolder(input.name),
    onSuccess: invalidate,
  });
}

export function useRenameFollowFolder() {
  const invalidate = useInvalidateFollows();
  return useMutation({
    mutationFn: (input: { folderId: string; name: string }) =>
      api.renameFollowFolder(input.folderId, input.name),
    onSuccess: invalidate,
  });
}

export function useDeleteFollowFolder() {
  const invalidate = useInvalidateFollows();
  return useMutation({
    mutationFn: (folderId: string) => api.deleteFollowFolder(folderId),
    onSuccess: invalidate,
  });
}

/** گام ۲ جریان ذخیره — پرونده + وضعیت + یادداشت اختیاری */
export function useUpsertFollow() {
  const invalidate = useInvalidateFollows();
  return useMutation({
    mutationFn: (input: {
      folderId: string;
      targetType: FollowTargetType;
      targetId: number;
      status?: FollowStatus;
      note?: string;
    }) => api.upsertFollow(input),
    onSuccess: invalidate,
  });
}

export function useSetFollowStatus() {
  const invalidate = useInvalidateFollows();
  return useMutation({
    mutationFn: (input: { itemId: string; status: FollowStatus }) =>
      api.setFollowStatus(input.itemId, input.status),
    onSuccess: invalidate,
  });
}

export function useMoveFollowItem() {
  const invalidate = useInvalidateFollows();
  return useMutation({
    mutationFn: (input: { itemId: string; folderId: string }) =>
      api.moveFollowItem(input.itemId, input.folderId),
    onSuccess: invalidate,
  });
}

export function useAddFollowNote() {
  const invalidate = useInvalidateFollows();
  return useMutation({
    mutationFn: (input: { itemId: string; text: string }) => api.addFollowNote(input.itemId, input.text),
    onSuccess: invalidate,
  });
}

export function useRemoveFollowItem() {
  const invalidate = useInvalidateFollows();
  return useMutation({
    mutationFn: (itemId: string) => api.removeFollowItem(itemId),
    onSuccess: invalidate,
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

// ─── بسته‌های اشتراک (عضویت ویژه) ─────────────────────────────────────

/** پلن‌های اشتراک + کمپین جاری — عمومی (صفحه قیمت‌ها) */
export function useMembershipPlans() {
  return useQuery({
    queryKey: ['membership-plans'],
    queryFn: api.getMembershipPlans,
    staleTime: 60_000,
  });
}

/** بسته فعال من — تک منبع گیت‌های سمت کلاینت (خریداران، ظرفیت و ...) */
export function useMyPackage(enabled = true) {
  return useQuery({
    queryKey: ['panel-my-package'],
    queryFn: api.getMyPackage,
    staleTime: 30_000,
    enabled,
  });
}

/** سفارش‌های بسته خودم — در انتظار/تایید/رد + دلیل رد + فیش */
export function useMyPackageOrders() {
  return useQuery({
    queryKey: ['panel-package-orders'],
    queryFn: api.getMyPackageOrders,
    staleTime: 15_000,
  });
}

/** ارسال فیش خرید بسته (کارت به کارت) → در انتظار تأیید ادمین */
export function useSubmitPackageOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createPackageOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-package-orders'] });
      queryClient.invalidateQueries({ queryKey: ['panel-my-package'] });
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

// ─── آمار آگهی (۳۰-۱۰) ──────────────────────────────────────────────────────

/** آمار کامل آگهی من — صفحه آمار پنل؛ days = بازه (۰ = کل دوره از ثبت) —
 *  تعویض بازه دیتای قبلی را نگه می‌دارد تا نمودار بدون پرش اسکلتون عوض شود */
export function useMyProductStats(productId: number, enabled: boolean, days = 14) {
  return useQuery({
    queryKey: ['product-stats', productId, days] as const,
    queryFn: () => api.getMyProductStats(productId, days),
    enabled: enabled && Number.isFinite(productId) && productId > 0,
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

// ─── تنظیمات صورتحساب + خریداران (۳۱-۱۰) ────────────────────────────────

/** پیکربندی صورتحساب — عمومی؛ کش بلند چون به‌ندرت عوض می‌شود */
export function useBillingConfig() {
  return useQuery({
    queryKey: ['billing-config'],
    queryFn: () => api.getBillingConfig(),
    staleTime: 5 * 60_000,
  });
}

/** دفتر خرید من */
export function useMyBuyerBook() {
  return useQuery({
    queryKey: ['my-buyer-book'],
    queryFn: () => api.getMyBuyerBook(),
  });
}

/** ذخیره دفتر خرید — بعدش دایرکتوری را هم بیات کن */
export function useSaveMyBuyerBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.saveMyBuyerBook,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-buyer-book'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-directory'] });
    },
  });
}

/** دایرکتوری خریداران — فیلتر دسته/استان/شهر */
export function useBuyerDirectory(q: import('@/lib/types').BuyerDirectoryQuery) {
  return useQuery({
    queryKey: ['buyer-directory', q],
    queryFn: () => api.getBuyerDirectory(q),
    placeholderData: keepPreviousData,
  });
}

/** سهمیه پیشنهاد تامین امروز */
export function useMyOfferQuota(enabled = true) {
  return useQuery({
    queryKey: ['my-offer-quota'],
    queryFn: () => api.getMyOfferQuota(),
    enabled,
  });
}

/** ارسال تکی — بعدش سهمیه و مکالمات تازه شوند */
export function useSendSupplyOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.sendSupplyOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-offer-quota'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
}

/** ارسال گروهی — کیف پول + سهمیه + تراکنش‌ها تازه شوند */
export function useGroupSendSupplyOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.groupSendSupplyOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-offer-quota'] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['panel-profile'] });
      queryClient.invalidateQueries({ queryKey: ['panel-wallet-transactions'] });
    },
  });
}

/** پیشنهادهای تامین دریافتی — پنل خریدار (فیلتر دسته/نوع/چک/ارسال) */
export function useMyReceivedOffers(q: import('@/lib/types').ReceivedOffersQuery) {
  return useQuery({
    queryKey: ['my-received-offers', q],
    queryFn: () => api.getMyReceivedOffers(q),
    placeholderData: keepPreviousData,
  });
}

/** پیشنهادهای تامین ارسالی من (خواسته مالک ۴-۱۱) — پنل فروشنده؛
 *  categoryId اختیاری برای صفحهٔ «خریداران این کالا» */
export function useMySentOffers(q: import('@/lib/types').SentOffersQuery = {}) {
  return useQuery({
    queryKey: ['my-sent-offers', q],
    queryFn: () => api.getMySentOffers(q),
    placeholderData: keepPreviousData,
  });
}

/** تغییر گروهی قیمت/موجودی (خواسته مالک ۴-۱۱) — لیست محصولات تازه شود */
export function useBulkUpdatePrices() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.bulkUpdatePrices,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-my-products'] });
      queryClient.invalidateQueries({ queryKey: ['panel-my-product-detail'] });
    },
  });
}

// ─── مخاطبین گوشی («ارسال به مخاطبین» — خواسته مالک ۴-۱۱) ───────────────────

/** لیست مخاطبین من + عضویت در ایمچ */
export function useMyPhoneContacts() {
  return useQuery({
    queryKey: ['my-phone-contacts'],
    queryFn: () => api.getMyPhoneContacts(),
  });
}

/** لود یک‌بارهٔ مخاطبین گوشی (Contact Picker) — بعد از درون‌ریزی لیست تازه شود */
export function useImportPhoneContacts() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.importPhoneContacts,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-phone-contacts'] });
    },
  });
}

/** حذف یک مخاطب */
export function useDeletePhoneContact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deletePhoneContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-phone-contacts'] });
    },
  });
}
