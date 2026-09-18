// Wraps the backend's admin-only LandedCostController (/api/admin/landed-costs/**).
// A landed cost (freight/customs/insurance/other) is allocated across a
// COMPLETED GoodsReceipt's lines by value or by quantity, bumping each
// affected product's cost price. Create-only — no edit/delete, since the
// GoodsReceipt it's attached to is itself an immutable ledger entry, and
// inventory-only — it never posts a journal entry (the charge itself is
// assumed already booked as its own expense elsewhere).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type LandedCostType = 'FREIGHT' | 'CUSTOMS' | 'INSURANCE' | 'OTHER'
export type LandedCostAllocationMethod = 'BY_VALUE' | 'BY_QUANTITY'

export interface LandedCostAllocation {
  productId: number
  productName: string | null
  productSku: string | null
  goodsReceiptLineId: number
  quantity: number
  originalUnitCost: number | null
  allocatedAmount: number
  newUnitCost: number
}

export interface LandedCost {
  id: number
  companyId: number
  goodsReceiptId: number
  goodsReceiptNumber: string | null
  costType: LandedCostType
  amount: number
  allocationMethod: LandedCostAllocationMethod
  costDate: string
  reference: string | null
  notes: string | null
  createdBy: string | null
  allocations: LandedCostAllocation[] | null
}

export interface LandedCostFilter {
  companyId?: number
  goodsReceiptId?: number
  costType?: LandedCostType
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CreateLandedCostPayload {
  goodsReceiptId: number
  costType: LandedCostType
  amount: number
  allocationMethod: LandedCostAllocationMethod
  costDate: string
  reference?: string
  notes?: string
}

export function useLandedCosts() {
  const api = useApi()

  function list(filter: LandedCostFilter = {}) {
    return api<PageEnvelope<LandedCost>>('/api/admin/landed-costs', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<LandedCost>>(`/api/admin/landed-costs/${id}`)
    return res.data
  }

  async function create(payload: CreateLandedCostPayload) {
    const res = await api<ApiEnvelope<LandedCost>>('/api/admin/landed-costs', { method: 'POST', body: payload })
    return res.data
  }

  return { list, get, create }
}
