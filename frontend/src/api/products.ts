import { apiClient } from "./client";
import type {
  Product,
  ProductListResponse,
  ProductConfig,
  PriceSnapshot,
  PriceChange,
  PriceHistoryPoint,
} from "@/types";

export interface ProductFilters {
  page?: number;
  page_size?: number;
  search?: string;
  is_active?: boolean;
}

export interface ProductCreatePayload {
  omarket_url: string;
  floor_price: number;
  step?: number;
  check_interval_minutes?: number;
}

export interface ProductConfigUpdatePayload {
  step?: number;
  floor_price?: number;
  auto_reprice?: boolean;
  check_interval_minutes?: number;
}

export const productsApi = {
  list: (filters: ProductFilters = {}) =>
    apiClient.get<ProductListResponse>("/products", { params: filters }).then((r) => r.data),

  get: (id: string) =>
    apiClient.get<Product>(`/products/${id}`).then((r) => r.data),

  create: (payload: ProductCreatePayload) =>
    apiClient.post<Product>("/products", payload).then((r) => r.data),

  update: (id: string, payload: { name?: string; is_active?: boolean }) =>
    apiClient.patch<Product>(`/products/${id}`, payload).then((r) => r.data),

  remove: (id: string) =>
    apiClient.delete(`/products/${id}`),

  getConfig: (id: string) =>
    apiClient.get<ProductConfig>(`/products/${id}/config`).then((r) => r.data),

  updateConfig: (id: string, payload: ProductConfigUpdatePayload) =>
    apiClient.put<ProductConfig>(`/products/${id}/config`, payload).then((r) => r.data),

  scan: (id: string) =>
    apiClient.post(`/products/${id}/scan`).then((r) => r.data),

  scanAll: () =>
    apiClient.post("/products/scan-all").then((r) => r.data),

  pause: (id: string) =>
    apiClient.post(`/products/${id}/pause`).then((r) => r.data),

  resume: (id: string) =>
    apiClient.post(`/products/${id}/resume`).then((r) => r.data),

  getSnapshots: (id: string, page = 1, page_size = 20) =>
    apiClient
      .get<PriceSnapshot[]>(`/products/${id}/snapshots`, { params: { page, page_size } })
      .then((r) => r.data),

  getPriceHistory: (id: string, days = 7) =>
    apiClient
      .get<PriceHistoryPoint[]>(`/products/${id}/prices`, { params: { days } })
      .then((r) => r.data),

  getPriceChanges: (id: string, page = 1, page_size = 20) =>
    apiClient
      .get<PriceChange[]>(`/products/${id}/changes`, { params: { page, page_size } })
      .then((r) => r.data),
};
