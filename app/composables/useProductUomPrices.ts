// Wraps the backend's admin-only ProductUomPriceController
// (/api/admin/products/{productId}/uoms/{productUomId}/prices/**, requires
// ROLE_ADMIN). The selling price for one ProductUom row under one
// PriceGroup — e.g. a product's BOX unit priced differently for Retail vs
// Wholesale. Foundation only, same as useProductUoms itself.

import type { ApiEnvelope } from '#shared/types'

export interface ProductUomPrice {
  id: number
  productUomId: number
  priceGroupId: number
  priceGroupName: string | null
  price: number
  // Optional bounds — null on either side means no start/end limit.
  effectiveFrom: string | null
  effectiveTo: string | null
  active: boolean
}

export interface ProductUomPricePayload {
  priceGroupId: number
  price: number
  effectiveFrom?: string
  effectiveTo?: string
  active: boolean
}

export function useProductUomPrices() {
  const api = useApi()

  function path(productId: number, productUomId: number, id?: number) {
    const base = `/api/admin/products/${productId}/uoms/${productUomId}/prices`
    return id ? `${base}/${id}` : base
  }

  async function list(productId: number, productUomId: number) {
    const res = await api<ApiEnvelope<ProductUomPrice[]>>(path(productId, productUomId))
    return res.data
  }

  async function create(productId: number, productUomId: number, payload: ProductUomPricePayload) {
    const res = await api<ApiEnvelope<ProductUomPrice>>(path(productId, productUomId), { method: 'POST', body: payload })
    return res.data
  }

  async function update(productId: number, productUomId: number, id: number, payload: ProductUomPricePayload) {
    const res = await api<ApiEnvelope<ProductUomPrice>>(path(productId, productUomId, id), { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(productId: number, productUomId: number, id: number) {
    await api(path(productId, productUomId, id), { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
