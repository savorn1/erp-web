// Wraps the backend's admin-only ProductPriceController
// (/api/admin/product-prices/**, requires ROLE_ADMIN). Per-price-group
// overrides for a product's selling price (e.g. a lower price for the
// Wholesale tier), optionally for one specific unit — at most one row per
// (productId, priceGroupId, unitOfMeasureId). The cascade on a sales order
// line is: a price for that exact unit (used as-is), else the base-unit
// price times the line's conversion factor, else the price group's default
// discount, else the product's own sellingPrice. See SalesOrderServiceImpl.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface ProductPrice {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  priceGroupId: number
  priceGroupName: string | null
  // Per one of `unitOfMeasureAbbreviation`.
  price: number
  // Null means the product's base unit. A row naming another unit is a
  // genuine per-unit price — a case can be cheaper than twelve bottles — and
  // is used as-is on an order line rather than scaled.
  unitOfMeasureId: number | null
  unitOfMeasureAbbreviation: string | null
  perUnitPrice: boolean
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
  // Omit for the product's base unit. Anything else must be a sales-allowed
  // UOM on that product, and the price is per one of *that* unit.
  unitOfMeasureId?: number
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
