// Wraps the backend's admin-only InventoryReportController
// (/api/admin/inventory-reports/**, requires ROLE_ADMIN). Most of these
// reuse InventoryOverviewService's per-product/warehouse data (see
// useInventoryOverview.ts) filtered/grouped differently; the movement-based
// ones (ledger, in, out, opening/closing, aging, turnover) replay
// StockMovement instead.

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

export interface StockThreshold {
  rows: InventoryOverviewRow[]
  count: number
}

export interface StockDetailRow {
  productId: number
  productName: string | null
  productSku: string | null
  warehouseId: number
  warehouseName: string | null
  binId: number | null
  binName: string | null
  quantityOnHand: number
}

export interface StockDetail {
  rows: StockDetailRow[]
}

export interface StockMovementReportFilter {
  companyId?: number
  warehouseId?: number
  productId?: number
  dateFrom?: string
  dateTo?: string
}

export interface StockLedgerFilter extends StockMovementReportFilter {}

export interface StockLedgerRow {
  date: string
  productId: number
  productName: string | null
  productSku: string | null
  warehouseId: number
  warehouseName: string | null
  type: string
  referenceType: string | null
  referenceId: number | null
  quantityDelta: number
  balance: number
}

export interface StockLedger {
  rows: StockLedgerRow[]
  openingBalance: number
  closingBalance: number
}

export interface StockInOutRow {
  productId: number
  productName: string | null
  productSku: string | null
  warehouseId: number
  warehouseName: string | null
  quantity: number
  movementCount: number
}

export interface StockInOut {
  rows: StockInOutRow[]
  totalQuantity: number
}

export interface StockOpeningClosingRow {
  productId: number
  productName: string | null
  productSku: string | null
  warehouseId: number
  warehouseName: string | null
  openingQuantity: number
  closingQuantity: number
}

export interface StockOpeningClosing {
  rows: StockOpeningClosingRow[]
}

export interface StockAgingRow {
  productId: number
  productName: string | null
  productSku: string | null
  warehouseId: number
  warehouseName: string | null
  currentStock: number
  value: number
  lastInboundDate: string | null
  daysSinceInbound: number | null
  ageBucket: string
}

export interface StockAgingBucket {
  bucket: string
  totalQuantity: number
  totalValue: number
}

export interface StockAging {
  rows: StockAgingRow[]
  buckets: StockAgingBucket[]
}

export interface StockTurnoverFilter {
  companyId?: number
  warehouseId?: number
  productId?: number
  days?: number
}

export interface StockTurnoverRow {
  productId: number
  productName: string | null
  productSku: string | null
  warehouseId: number
  warehouseName: string | null
  currentStock: number
  outboundQuantityInWindow: number
  lastOutboundDate: string | null
}

export interface StockTurnover {
  rows: StockTurnoverRow[]
  windowDays: number
}

export interface BatchLotFilter {
  companyId?: number
  productId?: number
  includeDepleted?: boolean
}

export interface BatchLotStockRow {
  batchId: number
  batchNumber: string
  productId: number
  productName: string | null
  productSku: string | null
  expirationDate: string | null
  currentQuantity: number
}

export interface BatchLotStock {
  rows: BatchLotStockRow[]
}

export interface PartyStockFilter {
  companyId?: number
  warehouseId?: number
  partyId?: number
}

export interface StockByPartyRow {
  partyId: number
  partyName: string | null
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
}

export interface StockByParty {
  rows: StockByPartyRow[]
}

export interface StockProfitabilityRow {
  productId: number
  productName: string | null
  productSku: string | null
  quantitySold: number
  revenue: number
  cogs: number
  grossProfit: number
  marginPercent: number
  currentStockValue: number
  turnoverRatio: number | null
}

export interface StockProfitability {
  rows: StockProfitabilityRow[]
  totalRevenue: number
  totalCogs: number
  totalGrossProfit: number
}

export interface StockCountVarianceFilter {
  companyId?: number
  warehouseId?: number
  dateFrom?: string
  dateTo?: string
}

export interface StockCountVarianceRow {
  stockCountId: number
  countNumber: string
  countDate: string
  status: string
  warehouseId: number
  warehouseName: string | null
  productId: number
  productName: string | null
  productSku: string | null
  binId: number | null
  binName: string | null
  systemQuantity: number
  countedQuantity: number | null
  varianceQuantity: number | null
}

export interface StockCountVariance {
  rows: StockCountVarianceRow[]
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

  async function outOfStock(filter: InventoryOverviewFilter = {}) {
    const res = await api<ApiEnvelope<StockThreshold>>('/api/admin/inventory-reports/out-of-stock', { query: filter })
    return res.data
  }

  async function overstock(filter: InventoryOverviewFilter = {}) {
    const res = await api<ApiEnvelope<StockThreshold>>('/api/admin/inventory-reports/overstock', { query: filter })
    return res.data
  }

  async function negativeStock(filter: InventoryOverviewFilter = {}) {
    const res = await api<ApiEnvelope<StockThreshold>>('/api/admin/inventory-reports/negative-stock', { query: filter })
    return res.data
  }

  async function stockDetail(filter: InventoryOverviewFilter = {}) {
    const res = await api<ApiEnvelope<StockDetail>>('/api/admin/inventory-reports/stock-detail', { query: filter })
    return res.data
  }

  async function stockLedger(filter: StockLedgerFilter = {}) {
    const res = await api<ApiEnvelope<StockLedger>>('/api/admin/inventory-reports/stock-ledger', { query: filter })
    return res.data
  }

  async function stockIn(filter: StockMovementReportFilter = {}) {
    const res = await api<ApiEnvelope<StockInOut>>('/api/admin/inventory-reports/stock-in', { query: filter })
    return res.data
  }

  async function stockOut(filter: StockMovementReportFilter = {}) {
    const res = await api<ApiEnvelope<StockInOut>>('/api/admin/inventory-reports/stock-out', { query: filter })
    return res.data
  }

  async function openingClosingStock(filter: StockMovementReportFilter = {}) {
    const res = await api<ApiEnvelope<StockOpeningClosing>>('/api/admin/inventory-reports/opening-closing-stock', { query: filter })
    return res.data
  }

  async function stockAging(filter: InventoryOverviewFilter = {}) {
    const res = await api<ApiEnvelope<StockAging>>('/api/admin/inventory-reports/stock-aging', { query: filter })
    return res.data
  }

  async function stockTurnover(filter: StockTurnoverFilter = {}) {
    const res = await api<ApiEnvelope<StockTurnover>>('/api/admin/inventory-reports/stock-turnover', { query: filter })
    return res.data
  }

  async function batchLotStock(filter: BatchLotFilter = {}) {
    const res = await api<ApiEnvelope<BatchLotStock>>('/api/admin/inventory-reports/batch-lot-stock', { query: filter })
    return res.data
  }

  async function stockByCustomer(filter: PartyStockFilter = {}) {
    const res = await api<ApiEnvelope<StockByParty>>('/api/admin/inventory-reports/stock-by-customer', { query: filter })
    return res.data
  }

  async function stockBySupplier(filter: PartyStockFilter = {}) {
    const res = await api<ApiEnvelope<StockByParty>>('/api/admin/inventory-reports/stock-by-supplier', { query: filter })
    return res.data
  }

  async function stockProfitability(filter: StockMovementReportFilter = {}) {
    const res = await api<ApiEnvelope<StockProfitability>>('/api/admin/inventory-reports/stock-profitability', { query: filter })
    return res.data
  }

  async function stockCountVariance(filter: StockCountVarianceFilter = {}) {
    const res = await api<ApiEnvelope<StockCountVariance>>('/api/admin/inventory-reports/stock-count-variance', { query: filter })
    return res.data
  }

  return {
    stockValuation,
    lowStock,
    outOfStock,
    overstock,
    negativeStock,
    stockDetail,
    stockLedger,
    stockIn,
    stockOut,
    openingClosingStock,
    stockAging,
    stockTurnover,
    batchLotStock,
    stockByCustomer,
    stockBySupplier,
    stockProfitability,
    stockCountVariance
  }
}
