// Wraps the backend's admin-only ProductUomController
// (/api/admin/products/{productId}/uoms/** and .../variants/{variantId}/uoms/**,
// requires ROLE_ADMIN) plus the top-level conversion calculator. Foundation
// only — nothing on a Purchase/Sales/Invoice/GoodsReceipt line reads this
// yet; see ProductUom's own backend comment.

import type { ApiEnvelope } from '#shared/types'

export interface ProductUom {
  id: number
  productId: number
  // Null when this row belongs to the product itself rather than one of its variants.
  variantId: number | null
  unitOfMeasureId: number
  unitOfMeasureName: string | null
  unitOfMeasureAbbreviation: string | null
  conversionFactor: number
  baseUnit: boolean
  allowPurchase: boolean
  allowSales: boolean
  allowInventory: boolean
  defaultPurchase: boolean
  defaultSales: boolean
  barcode: string | null
  // (variant's or product's) sellingPrice * conversionFactor when price is unset.
  effectivePrice: number
  price: number | null
  active: boolean
}

export interface ProductUomPayload {
  unitOfMeasureId: number
  // Required unless this row is the base unit.
  conversionFactor?: number
  allowPurchase: boolean
  allowSales: boolean
  allowInventory: boolean
  defaultPurchase: boolean
  defaultSales: boolean
  barcode?: string
  price?: number
  active: boolean
}

export interface ConvertUomPayload {
  productId: number
  // Omit to convert using the product's own UOMs; set to use that variant's instead.
  variantId?: number
  fromUnitOfMeasureId: number
  toUnitOfMeasureId: number
  quantity: number
}

export interface ConvertUomResult {
  productId: number
  variantId: number | null
  fromUnitOfMeasureId: number
  quantity: number
  toUnitOfMeasureId: number
  convertedQuantity: number
  baseUnitOfMeasureId: number
  baseQuantity: number
}

function uomsPath(productId: number, variantId?: number) {
  return variantId ? `/api/admin/products/${productId}/variants/${variantId}/uoms` : `/api/admin/products/${productId}/uoms`
}

export function useProductUoms() {
  const api = useApi()

  async function list(productId: number, variantId?: number) {
    const res = await api<ApiEnvelope<ProductUom[]>>(uomsPath(productId, variantId))
    return res.data
  }

  async function create(productId: number, payload: ProductUomPayload, variantId?: number) {
    const res = await api<ApiEnvelope<ProductUom>>(uomsPath(productId, variantId), { method: 'POST', body: payload })
    return res.data
  }

  async function update(productId: number, id: number, payload: ProductUomPayload, variantId?: number) {
    const res = await api<ApiEnvelope<ProductUom>>(`${uomsPath(productId, variantId)}/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(productId: number, id: number, variantId?: number) {
    await api(`${uomsPath(productId, variantId)}/${id}`, { method: 'DELETE' })
  }

  async function convert(payload: ConvertUomPayload) {
    const res = await api<ApiEnvelope<ConvertUomResult>>('/api/admin/product-uoms/convert', { query: payload })
    return res.data
  }

  return { list, create, update, remove, convert }
}
