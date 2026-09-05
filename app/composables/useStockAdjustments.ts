// Wraps the backend's admin-only StockAdjustmentController
// (/api/admin/stock-adjustments/**, requires ROLE_ADMIN). Request and
// approval are separate acts — a pending adjustment has zero effect on
// stock; only approve() applies it (see StockAdjustmentServiceImpl).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type StockAdjustmentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
export type StockAdjustmentReason = 'STOCK_INCREASE' | 'STOCK_DECREASE' | 'DAMAGED' | 'LOST' | 'EXPIRED'

export interface StockAdjustmentLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  binId: number | null
  binName: string | null
  reason: StockAdjustmentReason
  quantity: number
  batchId: number | null
  batchNumber: string | null
  expirationDate: string | null
  serialNumbers: string[]
}

export interface StockAdjustment {
  id: number
  companyId: number
  warehouseId: number
  warehouseName: string | null
  adjustmentNumber: string
  adjustmentDate: string
  status: StockAdjustmentStatus
  notes: string | null
  requestedBy: string | null
  approvedBy: string | null
  approvalDate: string | null
  lines: StockAdjustmentLine[] | null
}

export interface StockAdjustmentFilter {
  adjustmentNumber?: string
  companyId?: number
  warehouseId?: number
  status?: StockAdjustmentStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface StockAdjustmentLinePayload {
  productId: number
  binId?: number
  reason: StockAdjustmentReason
  quantity: number
  // Required when the product is BATCH-tracked.
  batchNumber?: string
  // Only used for reason=STOCK_INCREASE when batchNumber doesn't already exist.
  expirationDate?: string
  // Required when the product is SERIAL-tracked — must have exactly
  // `quantity` entries.
  serialNumbers?: string[]
}

export interface StockAdjustmentPayload {
  companyId: number
  warehouseId: number
  adjustmentDate: string
  notes?: string
  lines: StockAdjustmentLinePayload[]
}

export function useStockAdjustments() {
  const api = useApi()

  function list(filter: StockAdjustmentFilter = {}) {
    return api<PageEnvelope<StockAdjustment>>('/api/admin/stock-adjustments', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<StockAdjustment>>(`/api/admin/stock-adjustments/${id}`)
    return res.data
  }

  async function create(payload: StockAdjustmentPayload) {
    const res = await api<ApiEnvelope<StockAdjustment>>('/api/admin/stock-adjustments', { method: 'POST', body: payload })
    return res.data
  }

  async function approve(id: number) {
    const res = await api<ApiEnvelope<StockAdjustment>>(`/api/admin/stock-adjustments/${id}/approve`, { method: 'POST' })
    return res.data
  }

  async function reject(id: number) {
    const res = await api<ApiEnvelope<StockAdjustment>>(`/api/admin/stock-adjustments/${id}/reject`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/stock-adjustments/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, approve, reject, remove }
}
