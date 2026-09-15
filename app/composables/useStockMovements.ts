// Wraps the backend's admin-only StockMovementController
// (/api/admin/stock-movements/**, requires ROLE_ADMIN). Read-only audit trail.

import type { PageEnvelope } from '#shared/types'

export type StockMovementType = 'RECEIPT' | 'ISSUE' | 'TRANSFER_OUT' | 'TRANSFER_IN' | 'ADJUSTMENT' | 'MATERIAL_CONSUMPTION' | 'PRODUCTION_OUTPUT'
export type StockMovementDirection = 'IN' | 'OUT'

export interface StockMovement {
  id: number
  companyId: number
  productId: number
  productName: string | null
  productSku: string | null
  warehouseId: number
  warehouseName: string | null
  binId: number | null
  binName: string | null
  type: StockMovementType
  // Derived from quantityDelta's sign — ADJUSTMENT can go either way, so
  // this isn't inferrable from `type` alone.
  direction: StockMovementDirection
  quantityDelta: number
  referenceType: string
  referenceId: number
  createdBy: string | null
  createdAt: string
}

export interface StockMovementFilter {
  companyId?: number
  productId?: number
  warehouseId?: number
  type?: StockMovementType
  direction?: StockMovementDirection
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export function useStockMovements() {
  const api = useApi()

  function list(filter: StockMovementFilter = {}) {
    return api<PageEnvelope<StockMovement>>('/api/admin/stock-movements', { query: filter })
  }

  return { list }
}
