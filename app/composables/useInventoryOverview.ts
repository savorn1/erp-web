// Wraps the backend's admin-only InventoryOverviewController
// (/api/admin/inventory-overview, requires ROLE_ADMIN). Read-only, computed
// cross-module report — nothing here is stored; reserved/incoming/outgoing
// are derived on the fly from Sales Orders, Purchase Orders, and in-flight
// Stock Transfers (see InventoryOverviewServiceImpl).

import type { PageEnvelope } from '#shared/types'

export interface InventoryOverviewRow {
  productId: number
  productName: string | null
  productSku: string | null
  warehouseId: number
  warehouseName: string | null
  currentStock: number
  reservedStock: number
  availableStock: number
  incomingStock: number
  outgoingStock: number
  unitCost: number
  valuationValue: number
  // Zero means no threshold configured — never flagged by the Low Stock report.
  reorderPoint: number
}

export interface InventoryOverviewFilter {
  companyId?: number
  warehouseId?: number
  productId?: number
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export function useInventoryOverview() {
  const api = useApi()

  function get(filter: InventoryOverviewFilter = {}) {
    return api<PageEnvelope<InventoryOverviewRow>>('/api/admin/inventory-overview', { query: filter })
  }

  return { get }
}
