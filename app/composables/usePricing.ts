// Wraps the backend's admin-only PricingController
// (/api/admin/pricing/lookup, requires ROLE_ADMIN). Read-only: explains
// which rule of the pricing cascade (Customer -> CustomerGroup -> PriceGroup
// -> ProductPrice) resolves a given customer/product's unit price, for
// support/admin verification without creating a real sales order.

import type { ApiEnvelope } from '#shared/types'

export type PriceLookupSource = 'PRODUCT_PRICE_OVERRIDE' | 'PRICE_GROUP_DISCOUNT' | 'SELLING_PRICE'

export interface PriceLookupResult {
  productId: number
  productName: string | null
  productSku: string | null
  sellingPrice: number
  customerId: number
  customerName: string | null
  customerGroupId: number | null
  customerGroupName: string | null
  priceGroupId: number | null
  priceGroupName: string | null
  discountPercent: number | null
  productPriceId: number | null
  resolvedUnitPrice: number
  source: PriceLookupSource
}

export function usePricing() {
  const api = useApi()

  async function lookup(companyId: number, customerId: number, productId: number) {
    const res = await api<ApiEnvelope<PriceLookupResult>>('/api/admin/pricing/lookup', {
      query: { companyId, customerId, productId }
    })
    return res.data
  }

  return { lookup }
}
