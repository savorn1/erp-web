// Wraps the backend's admin-only PriceGroupController
// (/api/admin/price-groups/**, requires ROLE_ADMIN). A pricing tier (e.g.
// Retail/Wholesale/Distributor/VIP) — CustomerGroup.priceGroupId links a
// customer group to one, and useProductPrices carries the actual
// per-product price for that tier.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface PriceGroup {
  id: number
  name: string
  discountPercent: number | null
  active: boolean
}

export interface PriceGroupFilter {
  name?: string
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface PriceGroupPayload {
  name: string
  discountPercent?: number
  active: boolean
}

export function usePriceGroups() {
  const api = useApi()

  function list(filter: PriceGroupFilter = {}) {
    return api<PageEnvelope<PriceGroup>>('/api/admin/price-groups', { query: filter })
  }

  async function create(payload: PriceGroupPayload) {
    const res = await api<ApiEnvelope<PriceGroup>>('/api/admin/price-groups', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: PriceGroupPayload) {
    const res = await api<ApiEnvelope<PriceGroup>>(`/api/admin/price-groups/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/price-groups/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
