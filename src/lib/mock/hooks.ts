'use client';

/** هوک‌های React Query — یک نقطه تعریف برای همه دیتای سرور فرانت */

import { useEffect } from 'react';
import { useMutation, useQuery, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { ensureChatSocket, onChatEvent } from '@/lib/api/socket';
import { useBaseData } from '@/lib/base-data';
import * as api from './api';
import type { Paged, ChatFileMeta, ChatMessage } from './api';
import type { BuyRequest, CityMarketQuery, FollowFolder, FollowFolderKind, FollowItem, FollowPriority, FollowStatus, FollowTargetType, Product, ProductQuery } from '@/lib/types';

const qk = {
  products: (q: ProductQuery) => ['products', q] as const,
  cityMarket: (q: CityMarketQuery) => ['city-market', q] as const,
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

/**
 * لیست محصولات با اسکرول بی‌پایان (خواستهٔ مالک ۱۴-۱۱) — همان endpoint با
 * useInfiniteQuery؛ کلید کوئری «بدون page» است (صفحه = pageParam).
 * initialData = صفحهٔ SSR هر شماره‌ای که از URL سئو آمده (۱، ۲، …) — زنجیره
 * از همان‌جا به جلو ادامه می‌یابد؛ با عوض شدن فیلترها کلید عوض می‌شود و
 * چون seed شرطی است، کوئری تازه از صفحهٔ ۱ شروع می‌شود.
 */
export function useInfiniteProducts(
  query: Omit<ProductQuery, 'page'>,
  initialData?: Paged<Product>,
) {
  return useInfiniteQuery({
    queryKey: ['products-infinite', query] as const,
    queryFn: ({ pageParam }: { pageParam: number }) => api.getProducts({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: Paged<Product>) =>
      lastPage.page < lastPage.pageCount ? lastPage.page + 1 : undefined,
    ...(initialData ? { initialData: { pages: [initialData], pageParams: [initialData.page] } } : {}),
    placeholderData: keepPreviousData, // تعویض نرم فیلتر بدون پرش اسکلتون
    staleTime: 60_000,
  });
}

/**
 * لیست چندشهری «بازار عمدهٔ شهری» — سرویس جداگانهٔ /cityMarket/getProducts
 * (خواستهٔ مالک ۹-۱۱). شهر خود صفحه همیشه در cityIds هست؛ تیک شهرهای دیگر
 * استان فقط کلید را عوض می‌کند — با keepPreviousData گرید نرم رفرش می‌شود.
 */
export function useCityMarketProducts(query: CityMarketQuery, initialData?: Paged<Product>) {
  return useQuery({
    queryKey: qk.cityMarket(query),
    queryFn: () => api.getCityMarketProducts(query),
    ...(initialData ? { initialData } : {}),
    placeholderData: keepPreviousData, // تیک/صفحه‌بندی نرم بدون پرش اسکلتون
    staleTime: 60_000,
  });
}

/** بازار شهری با اسکرول بی‌پایان (خواستهٔ مالک ۱۴-۱۱) — عین useInfiniteProducts، سرویس چندشهری */
export function useInfiniteCityMarketProducts(
  query: Omit<CityMarketQuery, 'page'>,
  initialData?: Paged<Product>,
) {
  return useInfiniteQuery({
    queryKey: ['city-market-infinite', query] as const,
    queryFn: ({ pageParam }: { pageParam: number }) => api.getCityMarketProducts({ ...query, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (lastPage: Paged<Product>) =>
      lastPage.page < lastPage.pageCount ? lastPage.page + 1 : undefined,
    ...(initialData ? { initialData: { pages: [initialData], pageParams: [initialData.page] } } : {}),
    placeholderData: keepPreviousData,
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.submitBuyRequest,
    onSuccess: () => {
      // اولین درخواست ثبت شد → تسک «اولین درخواست خرید» از زنگوله می‌افتد
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });
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

/** پرونده‌های پیگیری من — تعداد و خلاصه قیف هر پرونده؛ kind: فقط همان
 *  نوع سرنخ (خرید/فروش — مستقل‌سازی دور ۲۸؛ کلید کوئری شامل kind است) */
export function useFollowFolders(kind?: FollowFolderKind) {
  return useQuery({
    queryKey: ['follow-folders', kind ?? 'all'],
    queryFn: () => api.getFollowFolders(kind),
    staleTime: 15_000,
  });
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

/** همهٔ موارد پیگیری از همهٔ پرونده‌ها — تک‌صفحهٔ CRM؛ targetType: فقط همان
 *  نوع سرنخ (دور ۲۸). prefix مشترک ['follow-items'] → با هر تغییر باطل می‌شود */
export function useAllFollowItems(targetType?: FollowTargetType) {
  return useQuery({
    queryKey: ['follow-items', 'all', targetType ?? 'all'],
    queryFn: () => api.getAllFollowItems(targetType),
    staleTime: 15_000,
  });
}

/** نقشهٔ موارد ذخیره‌شدهٔ یک نوع — یک درخواست مشترک برای همهٔ دکمه‌های ذخیرهٔ صفحه
 *  (کوئری react-query با کلید مشترک؛ همهٔ کارت‌ها از همان کش می‌خوانند) */
export function useFollowingMap(targetType: FollowTargetType, enabled = true) {
  return useQuery({
    queryKey: ['following-map', targetType],
    queryFn: () => api.getFollowingMap(targetType),
    enabled,
    staleTime: 15_000,
  });
}

/** وضعیت دکمهٔ ذخیره — آیا این هدف در پیگیری من است؟ (فقط با ورود)
 *  از نقشهٔ مشترک می‌خواند: ۱۶ کارت آگهی = ۱ درخواست، نه ۱۶ درخواست */
export function useIsFollowing(targetType: FollowTargetType, targetId: number, enabled = true) {
  return useQuery({
    queryKey: ['following-map', targetType],
    queryFn: () => api.getFollowingMap(targetType),
    enabled,
    staleTime: 15_000,
    select: (map: Record<number, FollowItem>) => ({
      following: Boolean(map[targetId]),
      item: map[targetId] ?? null,
    }),
  });
}

/** باطل‌کردن کل دیتای پیگیری پس از هر تغییر — بج تسک‌ها هم تازه شود چون
 *  شمار سرنخ‌های سررسیده تغییر کرد (خواستهٔ مالک ۱۱-۱۱ دور ۴) */
function useInvalidateFollows() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['follow-folders'] });
    queryClient.invalidateQueries({ queryKey: ['follow-items'] });
    queryClient.invalidateQueries({ queryKey: ['following-map'] });
    queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
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
      // اولین آگهی ثبت شد → تسک «اولین آگهی» از زنگوله می‌افتد
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
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
export function useChatSocketEvents(
  opts: {
    onNewMessage?: (p: unknown) => void;
    onRead?: (p: unknown) => void;
    onAdminMessage?: (p: unknown) => void;
    onEdit?: (p: unknown) => void;
    onDelete?: (p: unknown) => void;
    onSupportMessage?: (p: unknown) => void;
  } = {},
) {
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
    // پاسخ تازهٔ گفتگوی پشتیبانی (خواستهٔ مالک ۸-۱۱) — صفحهٔ پشتیبانی،
    // بج منوی «پشتیبانی» و پیام لینک‌دار چت همان لحظه تازه می‌شوند
    const offSupport = onChatEvent('supportMessage', (p) => {
      opts.onSupportMessage?.(p);
      queryClient.invalidateQueries({ queryKey: ['support-conversation'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    });
    // ویرایش/حذف پیام (فقط قبل از مشاهده) — پیام‌ها و لیست مکالمات تازه شوند
    const offEdit = onChatEvent('edit', (p) => {
      opts.onEdit?.(p);
      queryClient.invalidateQueries({ queryKey: ['chat-thread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    });
    const offDelete = onChatEvent('delete', (p) => {
      opts.onDelete?.(p);
      queryClient.invalidateQueries({ queryKey: ['chat-thread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    });
    // کاربر ممکن است بعد از mount لاگین کند — تلاش دوره‌ای اتصال با توکن تازه
    const timer = setInterval(() => ensureChatSocket(), 5_000);
    return () => {
      clearInterval(timer);
      offNew();
      offRead();
      offAdmin();
      offSupport();
      offEdit();
      offDelete();
    };
  }, []);
}

export function useStartChatThread() {
  return useMutation({ mutationFn: api.startChatThread });
}

export function useSendChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { threadId: string; text: string; file?: ChatFileMeta | null }) =>
      api.sendChatMessage(input.threadId, input.text, input.file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['chat-thread-messages'] });
    },
  });
}

/** ویرایش پیام خودی — فقط تا قبل از مشاهده طرف مقابل (چت مدرک است) */
export function useEditChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { messageId: string; text: string }) =>
      api.editChatMessage(input.messageId, input.text),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-thread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });
}

/** حذف پیام خودی دیده‌نشده — فایل پیوست در سرور هم پاک می‌شود */
export function useDeleteChatMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (messageId: string) => api.deleteChatMessage(messageId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-thread-messages'] });
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    },
  });
}

/** آپلود پیوست چت — تصویر/ویدئو/سند تا ۵MB */
export function useUploadChatFile() {
  return useMutation({ mutationFn: (file: File) => api.uploadChatFile(file) });
}

/**
 * پیام‌های مکالمه با پیجینگ معکوس (خواسته مالک ۷-۱۱):
 * صفحه اول = آخرین ۲۰ پیام؛ fetchNextPage صفحه قدیمی‌تری می‌آورد (before =
 * قدیمی‌ترین createdAt). `messages` همیشه صعودی (قدیمی بالا، جدید پایین)
 * و `hasMore` می‌گوید صفحه قدیمی‌تری هست یا نه.
 * واکشی ≠ خواندن (خواسته مالک ۸-۱۱): بج خوانده‌نشده تا نمایش واقعی چت
 * باقی می‌ماند — علامت‌گذاری فقط با useMarkThreadRead صریح انجام می‌شود.
 */
export function useChatThreadMessages(threadId: string | null) {
  const queryClient = useQueryClient();
  const query = useInfiniteQuery({
    queryKey: ['chat-thread-messages', threadId],
    queryFn: async ({ pageParam }: { pageParam?: string }) => {
      // ۲۱ می‌گیریم — ۲۱امین فقط برای تشخیص hasMore است
      const msgs = await api.getChatThreadMessages(threadId!, {
        ...(pageParam ? { before: pageParam } : {}),
        take: api.CHAT_PAGE_SIZE + 1,
      });
      void queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      return msgs;
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => {
      // ۲۱ مورد = صفحهٔ قدیمی‌تری هست. مکان‌نما باید قدیمی‌ترین پیامِ
      // «نگه‌داشته‌شده» باشد (اندیس ۱) — اندیس ۰ در مسطح‌سازی بریده می‌شود
      // و اگر مکان‌نما شود همان پیام در هیچ صفحه‌ای نمی‌آید (درس تست ۷-۱۱).
      return lastPage.length > api.CHAT_PAGE_SIZE ? lastPage[1].createdAt : undefined;
    },
    enabled: !!threadId,
    staleTime: 15_000,
    refetchInterval: 30_000, // شبکه ایمنی — WS قطع شد، از REST تازه می‌شود
  });

  // صفحات: [جدیدترین دسته، قدیمی‌تر، …] — هر دسته صعودی؛ برای ترتیب کلی
  // صعودی باید دسته‌ها را معکوس و بعد مسطح کنیم.
  // هر صفحهٔ ۲۱تایی از سمت قدیمی بریده می‌شود (۲۱امین فقط سنجهٔ hasMore است
  // و پیامِ جدیدترین هرگز نمی‌افتد — درس تست ۷-۱۱).
  const pages = query.data?.pages ?? [];
  const flat: ChatMessage[] = [];
  for (let i = pages.length - 1; i >= 0; i--) {
    const page = pages[i];
    const start = page.length > api.CHAT_PAGE_SIZE ? 1 : 0;
    for (let j = start; j < page.length; j++) flat.push(page[j]);
  }
  // hasMore = آخرین دستهٔ خام ۲۱تایی بود (صفحهٔ قدیمی‌تری مانده)
  const hasMore = pages.length > 0 && pages[pages.length - 1].length > api.CHAT_PAGE_SIZE;

  return {
    ...query,
    messages: flat,
    hasMore: hasMore && !query.isError,
  };
}

export function useConversations() {
  return useQuery({ queryKey: ['chat-conversations'], queryFn: api.getConversations, staleTime: 15_000 });
}

/**
 * علامت‌گذاری خوانده‌شدهٔ صریح مکالمه (خواسته مالک ۸-۱۱):
 * بک‌اند در واکشی پیام‌ها دیگر خودکار readAt نمی‌زند؛ این هوک وقتی صدا زده
 * می‌شود که چت «واقعاً به کاربر نمایش داده شده» (رندر پیام‌ها + پنجرهٔ
 * مرئی). بعد از موفقیت: بج لیست/هدر/فوتر صفر و تیک‌های پیام تازه می‌شوند.
 */
export function useMarkThreadRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (threadId: string) => api.markChatThreadRead(threadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
      // readAt پیام‌های طرف مقابل تازه شود (تیک دوبرابر فرستنده از مسیر WS)
      queryClient.invalidateQueries({ queryKey: ['chat-thread-messages'] });
    },
  });
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

// ─── تسک‌های کاربر — «کارهای مهم من» (خواستهٔ مالک ۱۱-۱۱ دور ۴) ──────

/** بج زنگولهٔ کارهای مهم — سرنخ‌های سررسیده، احراز هویت، تکمیل پروفایل،
 *  اولین آگهی/درخواست. تسک‌ها stateless از وضعیت واقعی محاسبه می‌شوند؛
 *  polling ۶۰s + refetch روی فوکوس + ابطال دستی بعد از هر mutation مرتبط
 *  (پیگیری‌ها، احراز، پروفایل، ثبت آگهی/درخواست) تا بج همان لحظه بیفتد. */
export function useMyTasks(enabled: boolean) {
  return useQuery({
    queryKey: ['my-tasks'],
    queryFn: api.getMyTasks,
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
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

/** خواندن پاسخ‌های گفتگوی پشتیبانی (تیکت) — باز کردن مکالمهٔ «پشتیبانی
 *  ایمچ» هم بج تیکت را صفر می‌کند (خواستهٔ مالک ۸-۱۱ دور ۲۵: «دقیقا مثل
 *  پیام‌های خوانده‌نشده» — تا کاربر خودِ چت را باز نکند بج نمی‌پرد) */
export function useMarkSupportConversationRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.markSupportConversationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support-conversation'] });
      queryClient.invalidateQueries({ queryKey: ['unread-messages-count'] });
    },
  });
}

// ─── پیگیری‌ها — تغییرات (CRM کوچک) ───────────────────────────────────

export function useCreateFollowFolder() {
  const invalidate = useInvalidateFollows();
  return useMutation({
    mutationFn: (input: { name: string; kind?: FollowFolderKind }) =>
      api.createFollowFolder(input.name, input.kind),
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

/** گام ۲ جریان ذخیره — پرونده + وضعیت + اولویت + یادآور + یادداشت اختیاری */
export function useUpsertFollow() {
  const invalidate = useInvalidateFollows();
  return useMutation({
    mutationFn: (input: {
      folderId: string;
      targetType: FollowTargetType;
      targetId: number;
      status?: FollowStatus;
      priority?: FollowPriority;
      nextFollowDays?: number;
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

/** تغییر اولویت — «تغییر اولویت» زیر سه‌نقطه و در مودال (خواسته مالک ۷-۱۱) */
export function useSetFollowPriority() {
  const invalidate = useInvalidateFollows();
  return useMutation({
    mutationFn: (input: { itemId: string; priority: FollowPriority }) =>
      api.setFollowPriority(input.itemId, input.priority),
    onSuccess: invalidate,
  });
}

/** یادآور «پیگیری بعدی N روز دیگر» — days=0 حذف یادآور */
export function useSetNextFollowDays() {
  const invalidate = useInvalidateFollows();
  return useMutation({
    mutationFn: (input: { itemId: string; days: number }) =>
      api.setNextFollowDays(input.itemId, input.days),
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

// «فروشندگان پیشنهادی» حذف شد (خواستهٔ مالک ۱۱-۱۱): ورودی آن حالا دکمهٔ هر
// ردیف «درخواست‌های خرید من» است که مستقیم به لیست محصولات همان دسته با
// سورت «مطابق نیاز من» می‌رود.

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
      // بخش‌های خالی پروفایل پر شدند → تسک «تکمیل پروفایل» تازه شود
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
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
      // سهمیهٔ خرید کمپین «کاربران جدید» کم شد → شمارشگر/تخفیف تازه شود (۹-۱۱)
      queryClient.invalidateQueries({ queryKey: ['membership-plans'] });
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
      // مدارک رفت → تسک احراز تا بررسی تمام شود از زنگوله می‌افتد
      queryClient.invalidateQueries({ queryKey: ['my-tasks'] });
    },
  });
}

// ─── نظرات کاربران ──────────────────────────────────────────────────────────

/** کلید کش نظرات با بُعد نقش (خواستهٔ مالک ۱۱-۱۱) — 'seller' (کاتالوگ) از
 *  'buyer' (دفتر خرید) جدا کش می‌شود؛ یک نقطهٔ حقیقت برای query و mutation */
const reviewsKey = (userName: string, subject: string) => ['user-reviews', userName, subject] as const;

export function useSellerReviews(userName: string, page = 1, subject: 'seller' | 'buyer' = 'seller') {
  return useQuery({
    queryKey: [...reviewsKey(userName, subject), page] as const,
    queryFn: () => api.getSellerReviews(userName, page, 10, subject),
    enabled: Boolean(userName),
    staleTime: 60_000,
  });
}

export function useAddSellerReview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { userName: string; rating: number; text: string; subject?: 'seller' | 'buyer' }) =>
      api.addSellerReview(input),
    onSuccess: (_d, input) => {
      void queryClient.invalidateQueries({ queryKey: reviewsKey(input.userName, input.subject ?? 'seller') });
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

/** وضعیت گیت پیشنهاد تامین — بستهٔ فعال + موجودی (خواسته مالک ۶-۱۱:
 *  سهمیه/سقف روزانه حذف شد؛ فقط برای گیت isFeatured استفاده می‌شود) */
export function useMyOfferQuota(enabled = true) {
  return useQuery({
    queryKey: ['my-offer-quota'],
    queryFn: () => api.getMyOfferQuota(),
    enabled,
  });
}

/** ارسال تکی — بعدش مکالمات و لیست «پیشنهادات ارسال شده» تازه شوند */
export function useSendSupplyOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.sendSupplyOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['my-sent-offers'] });
    },
  });
}

/** ارسال گروهی — کیف پول + مکالمات + پیشنهادات ارسالی تازه شوند */
export function useGroupSendSupplyOffer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.groupSendSupplyOffer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      queryClient.invalidateQueries({ queryKey: ['my-sent-offers'] });
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

/** گفتگوهای من با خریداران فوری (خواسته مالک ۷-۱۱ و ۸-۱۱) — تب «پیشنهادهای
 *  من»: عدد = همان دسته؛ undefined = همهٔ دسته‌ها؛ null = کوئری نکن */
export function useMyUrgentChats(categoryId: number | null | undefined) {
  return useQuery({
    queryKey: ['my-urgent-chats', categoryId ?? 'all'],
    queryFn: () => api.getMyUrgentChats(categoryId != null ? { categoryId } : {}),
    enabled: categoryId !== null,
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

/** آپدیت سریع قیمت از کارت آگهی (خواسته مالک ۷-۱۱ دور هفدهم) — مدال کوچک
 *  قیمت + اعتبار؛ بج «قیمت منقضی شده» بلافاصله از لیست برداشته می‌شود */
export function useUpdateProductPrice() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateMyPrice,
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

/* ─── کاتالوگ کاربر (خواسته مالک ۱۰-۱۱ + بازنگری) — کاتالوگ همان صفحهٔ عمومی فروشنده ──── */

/** آیا من این کاتالوگ (پروفایل فروشنده) را ذخیره کرده‌ام؟ — فقط کاربر واردشده */
export function useCatalogSaved(userName: string, enabled: boolean) {
  return useQuery({
    queryKey: ['catalog-saved', userName],
    queryFn: () => api.isCatalogSaved(userName),
    staleTime: 60_000,
    enabled,
  });
}

/** کاتالوگ‌های ذخیره‌شدهٔ من — پنل خریدار (دفترچهٔ تلفن) */
export function useMySavedCatalogs(enabled = true) {
  return useQuery({ queryKey: ['saved-catalogs'], queryFn: api.getMySavedCatalogs, staleTime: 30_000, enabled });
}

/** ذخیره‌کنندگان یک کاتالوگ (پروفایل فروشنده) — جعبهٔ آمار + مودال لیست */
export function useCatalogSavers(userName: string, enabled = true) {
  return useQuery({
    queryKey: ['catalog-savers', userName],
    queryFn: () => api.getCatalogSavers(userName),
    staleTime: 30_000,
    enabled: !!userName,
  });
}

/** ذخیره/حذف ذخیرهٔ کاتالوگ (toggle) — کلید: userName فروشنده */
export function useToggleCatalogSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.toggleCatalogSave,
    onSuccess: (saved, userName) => {
      queryClient.setQueryData(['catalog-saved', userName], saved);
      queryClient.invalidateQueries({ queryKey: ['saved-catalogs'] });
      queryClient.invalidateQueries({ queryKey: ['catalog-savers', userName] });
    },
  });
}

/* ─── شخصی‌سازی کاتالوگ (خواستهٔ مالک ۱۰-۱۱ دور ۳) — آیدی/برند/رنگ/آیکون ─── */

/** تنظیمات کاتالوگ خودم — مودال «تنظیمات کاتالوگ» (فقط وقتی باز است) */
export function useMyCatalogSettings(enabled: boolean) {
  return useQuery({
    queryKey: ['my-catalog-settings'],
    queryFn: () => api.getMyCatalogSettings(),
    staleTime: 60_000,
    enabled,
  });
}

/** ذخیرهٔ تنظیمات کاتالوگ — کش خودم را تازه می‌کند */
export function useUpdateCatalogSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateMyCatalogSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(['my-catalog-settings'], settings);
    },
  });
}

/* ─── دفتر خرید عمومی (خواستهٔ مالک ۱۰-۱۱ دور ۵) — قرینهٔ کاتالوگ برای خریداران ─── */

/** دیتای کامل دفتر عمومی — /b/{id}؛ کلاینت (گیت بسته سمت فرانت + NEED_PACKAGE) */
export function useBuyerBookPublic(id: string | null) {
  return useQuery({
    queryKey: ['buyer-book-public', id],
    queryFn: () => api.getBuyerBookPublic(id!),
    enabled: !!id,
    staleTime: 30_000,
    retry: false, // خطای NEED_PACKAGE/404 نباید سه‌بار تکرار شود
  });
}

/** آیا من این دفتر خرید را ذخیره کرده‌ام؟ — فقط کاربر واردشده */
export function useBuyerBookSaved(buyerUserName: string, enabled: boolean) {
  return useQuery({
    queryKey: ['buyer-book-saved', buyerUserName],
    queryFn: () => api.isBuyerBookSaved(buyerUserName),
    staleTime: 60_000,
    enabled: enabled && !!buyerUserName,
  });
}

/** ذخیره/حذف ذخیرهٔ دفتر خرید (toggle) — کلید: userName خریدار */
export function useToggleBuyerBookSave() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.toggleBuyerBookSave,
    onSuccess: (saved, buyerUserName) => {
      queryClient.setQueryData(['buyer-book-saved', buyerUserName], saved);
      queryClient.invalidateQueries({ queryKey: ['saved-buyer-books'] });
      queryClient.invalidateQueries({ queryKey: ['buyer-book-public'] });
    },
  });
}

/** دفاتر خرید ذخیره‌شدهٔ من — تب «دفاتر ذخیره شده» پنل فروشنده */
export function useMySavedBuyerBooks(enabled = true) {
  return useQuery({
    queryKey: ['saved-buyer-books'],
    queryFn: api.getMySavedBuyerBooks,
    staleTime: 30_000,
    enabled,
  });
}

/** تنظیمات دفتر خرید خودم — مودال «تنظیمات دفتر خرید» (فقط وقتی باز است) */
export function useMyBuyerBookSettings(enabled: boolean) {
  return useQuery({
    queryKey: ['my-buyer-book-settings'],
    queryFn: api.getMyBuyerBookSettings,
    staleTime: 60_000,
    enabled,
  });
}

/** ذخیرهٔ تنظیمات دفتر خرید — کش خودم را تازه می‌کند */
export function useUpdateBuyerBookSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.updateMyBuyerBookSettings,
    onSuccess: (settings) => {
      queryClient.setQueryData(['my-buyer-book-settings'], settings);
    },
  });
}
