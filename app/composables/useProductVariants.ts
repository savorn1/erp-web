// Wraps the backend's admin-only ProductVariantController
// (/api/admin/product-variants/**, requires ROLE_ADMIN). costPrice/sellingPrice/
// unitOfMeasureId being null means "inherit the parent product's own value" —
// this composable doesn't resolve that; the page falls back to the product's
// own value for display.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface ProductVariant {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  name: string
  sku: string
  barcode: string | null
  unitOfMeasureId: number | null
  unitOfMeasureName: string | null
  unitOfMeasureAbbreviation: string | null
  costPrice: number | null
  sellingPrice: number | null
  imageUrl: string | null
  active: boolean
}

export interface ProductVariantFilter {
  name?: string
  sku?: string
  productId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface ProductVariantPayload {
  productId: number
  name: string
  sku: string
  barcode?: string
  unitOfMeasureId?: number
  costPrice?: number
  sellingPrice?: number
  imageUrl?: string
  active: boolean
}

export function useProductVariants() {
  const api = useApi()

  function list(filter: ProductVariantFilter = {}) {
    return api<PageEnvelope<ProductVariant>>('/api/admin/product-variants', { query: filter })
  }

  async function create(payload: ProductVariantPayload) {
    const res = await api<ApiEnvelope<ProductVariant>>('/api/admin/product-variants', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: ProductVariantPayload) {
    const res = await api<ApiEnvelope<ProductVariant>>(`/api/admin/product-variants/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/product-variants/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
