// Wraps the backend's admin-only ProductPriceController
// (/api/admin/product-prices/**, requires ROLE_ADMIN). Per-price-group
// overrides for a product's selling price (e.g. a lower price for the
// Wholesale tier) — at most one row per (productId, priceGroupId). Falls
// back to the product's own sellingPrice when no override exists (see
// SalesOrderServiceImpl's pricing cascade).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface ProductPrice {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  priceGroupId: number
  priceGroupName: string | null
  price: number
}

export interface ProductPriceFilter {
  productId?: number
  priceGroupId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface ProductPricePayload {
  productId: number
  priceGroupId: number
  price: number
}

export function useProductPrices() {
  const api = useApi()

  function list(filter: ProductPriceFilter = {}) {
    return api<PageEnvelope<ProductPrice>>('/api/admin/product-prices', { query: filter })
  }

  async function create(payload: ProductPricePayload) {
    const res = await api<ApiEnvelope<ProductPrice>>('/api/admin/product-prices', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: ProductPricePayload) {
    const res = await api<ApiEnvelope<ProductPrice>>(`/api/admin/product-prices/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/product-prices/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
