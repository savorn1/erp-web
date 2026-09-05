// Wraps the backend's admin-only StockMovementController
// (/api/admin/stock-movements/**, requires ROLE_ADMIN). Read-only audit
// trail — written only by goods receipt posting so far.

import type { PageEnvelope } from '#shared/types'

export type StockMovementType = 'RECEIPT'

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
