// Wraps the backend's admin-only StockCountController
// (/api/admin/stock-counts/**, requires ROLE_ADMIN). DRAFT (enter counted
// quantities) -> COMPLETED (locked) -> RECONCILED (variances turned into a
// Stock Adjustment, which still needs its own approval — see
// useStockAdjustments). Only untracked (NONE) products are supported.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type StockCountStatus = 'DRAFT' | 'COMPLETED' | 'RECONCILED'

export interface StockCountLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  binId: number | null
  binName: string | null
  systemQuantity: number
  countedQuantity: number | null
  varianceQuantity: number | null
}

export interface StockCount {
  id: number
  companyId: number
  warehouseId: number
  warehouseName: string | null
  countNumber: string
  countDate: string
  status: StockCountStatus
  notes: string | null
  countedBy: string | null
  adjustmentId: number | null
  adjustmentNumber: string | null
  lines: StockCountLine[] | null
}

export interface StockCountFilter {
  countNumber?: string
  companyId?: number
  warehouseId?: number
  status?: StockCountStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface StockCountLinePayload {
  productId: number
  binId?: number
}

export interface StockCountPayload {
  companyId: number
  warehouseId: number
  countDate: string
  notes?: string
  lines: StockCountLinePayload[]
}

export interface StockCountLineCountPayload {
  lineId: number
  countedQuantity: number
}

export function useStockCounts() {
  const api = useApi()

  function list(filter: StockCountFilter = {}) {
    return api<PageEnvelope<StockCount>>('/api/admin/stock-counts', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<StockCount>>(`/api/admin/stock-counts/${id}`)
    return res.data
  }

  async function create(payload: StockCountPayload) {
    const res = await api<ApiEnvelope<StockCount>>('/api/admin/stock-counts', { method: 'POST', body: payload })
    return res.data
  }

  async function submitCounts(id: number, lines: StockCountLineCountPayload[]) {
    const res = await api<ApiEnvelope<StockCount>>(`/api/admin/stock-counts/${id}/counts`, { method: 'PUT', body: { lines } })
    return res.data
  }

  async function complete(id: number) {
    const res = await api<ApiEnvelope<StockCount>>(`/api/admin/stock-counts/${id}/complete`, { method: 'POST' })
    return res.data
  }

  async function reconcile(id: number) {
    const res = await api<ApiEnvelope<StockCount>>(`/api/admin/stock-counts/${id}/reconcile`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/stock-counts/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, submitCounts, complete, reconcile, remove }
}
