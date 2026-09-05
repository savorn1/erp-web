// Wraps the backend's admin-only StockLevelController
// (/api/admin/stock-levels/**, requires ROLE_ADMIN). Read-only — quantities
// only ever change through goods receipts (and, in later inventory steps,
// other stock movements).

import type { PageEnvelope } from '#shared/types'

export interface StockLevel {
  id: number
  companyId: number
  productId: number
  productName: string | null
  productSku: string | null
  unitOfMeasureAbbreviation: string | null
  warehouseId: number
  warehouseName: string | null
  binId: number | null
  binName: string | null
  quantityOnHand: number
}

export interface StockLevelFilter {
  companyId?: number
  productId?: number
  warehouseId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export function useStockLevels() {
  const api = useApi()

  function list(filter: StockLevelFilter = {}) {
    return api<PageEnvelope<StockLevel>>('/api/admin/stock-levels', { query: filter })
  }

  return { list }
}
