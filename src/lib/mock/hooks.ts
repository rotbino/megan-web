'use client';

/** هوک‌های React Query — یک نقطه تعریف برای همه دیتای سرور فرانت */

import { useMutation, useQuery, keepPreviousData } from '@tanstack/react-query';
import * as api from './api';
import type { Product, ProductQuery } from '@/lib/types';

const qk = {
  products: (q: ProductQuery) => ['products', q] as const,
  product: (id: number) => ['product', id] as const,
  related: (id: number) => ['related', id] as const,
  categoryTree: ['category-tree'] as const,
  provinces: ['provinces'] as const,
  cities: (pid: number) => ['cities', pid] as const,
  buyRequests: (o: { s?: string; provinceName?: string }) => ['buy-requests', o] as const,
  seller: (u: string) => ['seller', u] as const,
  suggestions: (q: string) => ['suggestions', q] as const,
};

export function useProducts(query: ProductQuery) {
  return useQuery({
    queryKey: qk.products(query),
    queryFn: () => api.getProducts(query),
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

export function useCategoryTree() {
  return useQuery({ queryKey: qk.categoryTree, queryFn: api.getCategoryTree, staleTime: 600_000 });
}

export function useProvinces() {
  return useQuery({ queryKey: qk.provinces, queryFn: api.getProvinces, staleTime: Infinity });
}

export function useCities(provinceId?: number) {
  return useQuery({
    queryKey: qk.cities(provinceId ?? 0),
    queryFn: () => api.getCities(provinceId!),
    enabled: !!provinceId,
    staleTime: Infinity,
  });
}

export function useBuyRequests(opts: { s?: string; provinceName?: string } = {}) {
  return useQuery({ queryKey: qk.buyRequests(opts), queryFn: () => api.getBuyRequests(opts), staleTime: 30_000 });
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
