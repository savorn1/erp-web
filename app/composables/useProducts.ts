// Wraps the backend's admin-only ProductController (/api/admin/products/**,
// requires ROLE_ADMIN). Single-item endpoints wrap their payload in
// ApiResponse<T>; list wraps in PageResponse<T>. Category/brand/type/unit of
// measure/supplier are resolved server-side into display names.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type ProductStatus = 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED'
export type ProductTrackingType = 'NONE' | 'BATCH' | 'SERIAL'

export interface Product {
  id: number
  companyId: number
  companyName: string | null
  categoryId: number | null
  categoryName: string | null
  brandId: number | null
  brandName: string | null
  typeId: number | null
  typeName: string | null
  unitOfMeasureId: number
  unitOfMeasureName: string | null
  unitOfMeasureAbbreviation: string | null
  supplierId: number | null
  supplierName: string | null
  name: string
  description: string | null
  sku: string
  barcode: string | null
  costPrice: number
  sellingPrice: number
  taxRate: number
  status: ProductStatus
  trackingType: ProductTrackingType
  imageUrl: string | null
  // Zero means no threshold configured — never flagged by the Low Stock report.
  reorderPoint: number
}

export interface ProductFilter {
  name?: string
  sku?: string
  companyId?: number
  categoryId?: number
  brandId?: number
  typeId?: number
  supplierId?: number
  status?: ProductStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface ProductPayload {
  companyId: number
  categoryId?: number
  brandId?: number
  typeId?: number
  unitOfMeasureId: number
  supplierId?: number
  name: string
  description?: string
  sku: string
  barcode?: string
  costPrice: number
  sellingPrice: number
  taxRate: number
  trackingType?: ProductTrackingType
  imageUrl?: string
  reorderPoint?: number
}

export function useProducts() {
  const api = useApi()

  function list(filter: ProductFilter = {}) {
    return api<PageEnvelope<Product>>('/api/admin/products', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Product>>(`/api/admin/products/${id}`)
    return res.data
  }

  async function create(payload: ProductPayload) {
    const res = await api<ApiEnvelope<Product>>('/api/admin/products', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: ProductPayload) {
    const res = await api<ApiEnvelope<Product>>(`/api/admin/products/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function updateStatus(id: number, status: ProductStatus) {
    const res = await api<ApiEnvelope<Product>>(`/api/admin/products/${id}/status`, { method: 'PUT', body: { status } })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/products/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, updateStatus, remove }
}
