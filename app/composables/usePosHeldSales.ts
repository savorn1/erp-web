// Wraps the backend's admin-only PosHeldSaleController
// (/api/admin/pos-held-sales/**). A held sale is a suspended cart — no stock
// or accounting effect until it's resumed and actually checked out via
// usePosSales().checkout(). resume() both returns the ticket and deletes it
// server-side, so it can only be resumed once.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'
import type { PosCheckoutLinePayload } from '~/composables/usePosSales'

export interface PosHeldSaleLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  imageUrl: string | null
  quantity: number
  discountPercent: number
}

export interface PosHeldSale {
  id: number
  companyId: number
  warehouseId: number
  registerId: number
  registerName: string | null
  posSessionId: number
  customerId: number | null
  customerName: string | null
  heldNumber: string
  heldAt: string
  heldBy: string | null
  note: string | null
  itemCount: number
  estimatedTotal: number
  lines: PosHeldSaleLine[]
}

export interface PosHeldSaleFilter {
  companyId?: number
  registerId?: number
  posSessionId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface PosHoldPayload {
  posSessionId: number
  customerId?: number
  note?: string
  lines: PosCheckoutLinePayload[]
}

export function usePosHeldSales() {
  const api = useApi()

  function list(filter: PosHeldSaleFilter = {}) {
    return api<PageEnvelope<PosHeldSale>>('/api/admin/pos-held-sales', { query: filter })
  }

  async function hold(payload: PosHoldPayload) {
    const res = await api<ApiEnvelope<PosHeldSale>>('/api/admin/pos-held-sales', { method: 'POST', body: payload })
    return res.data
  }

  async function resume(id: number) {
    const res = await api<ApiEnvelope<PosHeldSale>>(`/api/admin/pos-held-sales/${id}/resume`, { method: 'POST' })
    return res.data
  }

  async function discard(id: number) {
    await api(`/api/admin/pos-held-sales/${id}`, { method: 'DELETE' })
  }

  return { list, hold, resume, discard }
}
