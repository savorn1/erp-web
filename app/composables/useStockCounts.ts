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
  // The unit the count sheet is filled in, and how many base units one of
  // them makes. Null unit on counts created before UOM support; factor is
  // always populated (1 where there's nothing to convert).
  unitOfMeasureId: number | null
  unitOfMeasureAbbreviation: string | null
  conversionFactor: number
  // The product's own inventory unit — what systemQuantity/countedQuantity/
  // varianceQuantity below are measured in.
  baseUnitOfMeasureAbbreviation: string | null
  // Always in the product's base inventory unit — varianceQuantity is what
  // the reconciliation adjustment posts, so it has to be.
  systemQuantity: number
  countedQuantity: number | null
  varianceQuantity: number | null
  // The same figures in unitOfMeasure, for display on the count sheet. Never
  // sent back: submitCounts takes the counted quantity in the line's unit and
  // the server converts, so only the base figures are ever stored.
  systemQuantityInUnit: number
  countedQuantityInUnit: number | null
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
  // Omit for the product's base unit. Anything else must be an
  // inventory-allowed UOM on that product.
  unitOfMeasureId?: number
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
  // In the line's own unit — the server multiplies by the snapshotted
  // conversion factor before comparing against system quantity.
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
