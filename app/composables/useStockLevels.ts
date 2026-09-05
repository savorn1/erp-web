// Wraps the backend's admin-only StockLevelController
// (/api/admin/stock-levels/**, requires ROLE_ADMIN). Read-only — quantities
// only ever change through goods receipts (and, in later inventory steps,
// other stock movements).

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

interface PageEnvelope<T> {
  traceId: string
  statusCode: number
  message: string
  data: T[]
  metadata: { hasNext: boolean; hasPrev: boolean; totalPage: number; currentPage: number; limit: number; totalCount: number }
}

export function useStockLevels() {
  const api = useApi()

  function list(filter: StockLevelFilter = {}) {
    return api<PageEnvelope<StockLevel>>('/api/admin/stock-levels', { query: filter })
  }

  return { list }
}
