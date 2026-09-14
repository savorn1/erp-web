// Wraps the backend's admin-only ManufacturingReportController
// (/api/admin/manufacturing-reports/**, requires ROLE_ADMIN).

import type { ApiEnvelope } from '#shared/types'

export interface ManufacturingReportFilter {
  companyId?: number
  warehouseId?: number
  productId?: number
  dateFrom?: string
  dateTo?: string
}

export interface MoSummaryRow {
  status: string
  orderCount: number
  totalPlannedQuantity: number
  totalProducedQuantity: number
  totalScrapQuantity: number
}

export interface MoSummary {
  dateFrom: string | null
  dateTo: string | null
  rows: MoSummaryRow[]
  totalOrders: number
  totalPlannedQuantity: number
  totalProducedQuantity: number
  totalScrapQuantity: number
}

export interface MaterialConsumptionRow {
  componentProductId: number
  componentProductName: string | null
  componentProductSku: string | null
  totalConsumedQuantity: number
  totalCost: number
}

export interface MaterialConsumption {
  dateFrom: string | null
  dateTo: string | null
  rows: MaterialConsumptionRow[]
  totalConsumedCost: number
}

export interface ProductionOutputRow {
  productId: number
  productName: string | null
  productSku: string | null
  orderCount: number
  totalProducedQuantity: number
  totalScrapQuantity: number
}

export interface ProductionOutput {
  dateFrom: string | null
  dateTo: string | null
  rows: ProductionOutputRow[]
  totalProducedQuantity: number
}

export interface ScrapWastageRow {
  moNumber: string
  productId: number
  productName: string | null
  productSku: string | null
  plannedQuantity: number
  producedQuantity: number
  scrapQuantity: number
  scrapPercent: number
  scrapReason: string | null
  actualEndDate: string
}

export interface ScrapWastage {
  dateFrom: string | null
  dateTo: string | null
  rows: ScrapWastageRow[]
  totalScrapQuantity: number
}

export interface ManufacturingCostRow {
  moNumber: string
  productId: number
  productName: string | null
  productSku: string | null
  producedQuantity: number
  materialCost: number
  laborCost: number
  overheadCost: number
  totalCost: number
  unitCost: number
}

export interface ManufacturingCost {
  dateFrom: string | null
  dateTo: string | null
  rows: ManufacturingCostRow[]
  totalMaterialCost: number
  totalLaborCost: number
  totalOverheadCost: number
  totalCost: number
}

export function useManufacturingReports() {
  const api = useApi()

  async function summary(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<MoSummary>>('/api/admin/manufacturing-reports/summary', { query: filter })
    return res.data
  }

  async function materialConsumption(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<MaterialConsumption>>('/api/admin/manufacturing-reports/material-consumption', { query: filter })
    return res.data
  }

  async function productionOutput(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<ProductionOutput>>('/api/admin/manufacturing-reports/production-output', { query: filter })
    return res.data
  }

  async function scrapWastage(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<ScrapWastage>>('/api/admin/manufacturing-reports/scrap-wastage', { query: filter })
    return res.data
  }

  async function cost(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<ManufacturingCost>>('/api/admin/manufacturing-reports/cost', { query: filter })
    return res.data
  }

  return { summary, materialConsumption, productionOutput, scrapWastage, cost }
}
