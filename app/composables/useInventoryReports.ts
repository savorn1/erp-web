// Wraps the backend's admin-only InventoryReportController
// (/api/admin/inventory-reports/**, requires ROLE_ADMIN). Both reports reuse
// InventoryOverviewService's per-product/warehouse data — stockValuation
// groups it by warehouse, lowStock filters it to rows where
// Product.reorderPoint > 0 and availableStock has fallen below it.

import type { ApiEnvelope } from '#shared/types'
import type { InventoryOverviewFilter, InventoryOverviewRow } from '~/composables/useInventoryOverview'

export interface StockValuationRow {
  warehouseId: number
  warehouseName: string | null
  productCount: number
  totalQuantity: number
  totalValue: number
}

export interface StockValuation {
  rows: StockValuationRow[]
  totalQuantity: number
  totalValue: number
}

export interface LowStock {
  rows: InventoryOverviewRow[]
  count: number
}

export function useInventoryReports() {
  const api = useApi()

  async function stockValuation(filter: InventoryOverviewFilter = {}) {
    const res = await api<ApiEnvelope<StockValuation>>('/api/admin/inventory-reports/stock-valuation', { query: filter })
    return res.data
  }

  async function lowStock(filter: InventoryOverviewFilter = {}) {
    const res = await api<ApiEnvelope<LowStock>>('/api/admin/inventory-reports/low-stock', { query: filter })
    return res.data
  }

  return { stockValuation, lowStock }
}
