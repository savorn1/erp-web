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

export interface RejectionRow {
  moNumber: string
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  reason: string | null
  rejectedBy: string | null
  rejectedAt: string
}

export interface Rejections {
  dateFrom: string | null
  dateTo: string | null
  rows: RejectionRow[]
  totalRejectedQuantity: number
}

export interface MaterialRequirementRow {
  componentProductId: number
  componentProductName: string | null
  componentProductSku: string | null
  warehouseId: number
  warehouseName: string | null
  unitOfMeasureAbbreviation: string | null
  totalRequiredQuantity: number
  availableQuantity: number
  shortfallQuantity: number
}

export interface MaterialRequirements {
  rows: MaterialRequirementRow[]
  shortageCount: number
}

export interface BomCostRow {
  bomId: number
  bomNumber: string
  name: string
  version: number
  productId: number
  productName: string | null
  productSku: string | null
  outputQuantity: number
  materialCostPerBatch: number
  materialCostPerUnit: number
}

export interface BomCost {
  rows: BomCostRow[]
}

export interface CostVarianceRow {
  moNumber: string
  productId: number
  productName: string | null
  productSku: string | null
  plannedQuantity: number
  standardMaterialCost: number
  actualMaterialCost: number
  varianceAmount: number
  variancePercent: number
}

export interface CostVariance {
  dateFrom: string | null
  dateTo: string | null
  rows: CostVarianceRow[]
  totalStandardMaterialCost: number
  totalActualMaterialCost: number
  totalVarianceAmount: number
}

export interface ProductionTimeRow {
  moNumber: string
  productId: number
  productName: string | null
  productSku: string | null
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualStartDate: string
  actualEndDate: string
  actualDurationHours: number
}

export interface ProductionTime {
  dateFrom: string | null
  dateTo: string | null
  rows: ProductionTimeRow[]
  averageDurationHours: number
}

export interface QualityPassFailRow {
  productId: number
  productName: string | null
  productSku: string | null
  inspectedCount: number
  passedCount: number
  failedCount: number
  passRatePercent: number
}

export interface QualityPassFail {
  dateFrom: string | null
  dateTo: string | null
  rows: QualityPassFailRow[]
  totalInspected: number
  totalPassed: number
  totalFailed: number
  overallPassRatePercent: number
}

export interface PlanVsActualRow {
  moNumber: string
  productId: number
  productName: string | null
  productSku: string | null
  plannedQuantity: number
  producedQuantity: number
  scrapQuantity: number
  achievementPercent: number
  yieldPercent: number
}

export interface PlanVsActual {
  dateFrom: string | null
  dateTo: string | null
  rows: PlanVsActualRow[]
  averageAchievementPercent: number
  averageYieldPercent: number
}

export interface ProductionTrendRow {
  month: string
  orderCount: number
  totalProducedQuantity: number
  totalScrapQuantity: number
}

export interface ProductionTrend {
  dateFrom: string | null
  dateTo: string | null
  rows: ProductionTrendRow[]
}

export interface ManufacturingProfitabilityRow {
  productId: number
  productName: string | null
  productSku: string | null
  totalProducedQuantity: number
  averageUnitCost: number
  sellingPrice: number
  marginPerUnit: number
  totalMargin: number
  marginPercent: number
}

export interface ManufacturingProfitability {
  dateFrom: string | null
  dateTo: string | null
  rows: ManufacturingProfitabilityRow[]
  totalMargin: number
}

export interface WorkCenterUtilizationRow {
  workCenterId: number
  workCenterName: string | null
  operationCount: number
  totalActualHours: number
  averageHoursPerOperation: number
  utilizationPercent: number | null
}

export interface WorkCenterUtilization {
  dateFrom: string | null
  dateTo: string | null
  rows: WorkCenterUtilizationRow[]
}

export interface MachineUtilizationRow {
  machineId: number
  machineName: string | null
  machineStatus: string | null
  operationCount: number
  totalActualHours: number
  averageHoursPerOperation: number
}

export interface MachineUtilization {
  dateFrom: string | null
  dateTo: string | null
  rows: MachineUtilizationRow[]
}

export interface OperationPerformanceRow {
  operationName: string
  workCenterName: string | null
  executionCount: number
  standardTimeMinutes: number
  averageActualTimeMinutes: number
  varianceMinutes: number
}

export interface OperationPerformance {
  dateFrom: string | null
  dateTo: string | null
  rows: OperationPerformanceRow[]
}

export interface MachineCostRow {
  machineId: number
  machineName: string | null
  operationCount: number
  totalActualHours: number
  costPerHour: number | null
  totalCost: number | null
}

export interface MachineCost {
  dateFrom: string | null
  dateTo: string | null
  rows: MachineCostRow[]
  totalCost: number
}

export interface BomComparisonLine {
  componentProductId: number
  componentProductName: string | null
  componentProductSku: string | null
  quantity: number
  scrapPercent: number | null
  lineCost: number
}

export interface BomComparisonSide {
  bomId: number
  bomNumber: string
  version: number
  name: string
  status: string
  outputQuantity: number
  materialCostPerBatch: number
  materialCostPerUnit: number
  lines: BomComparisonLine[]
}

export interface BomComparison {
  left: BomComparisonSide
  right: BomComparisonSide
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

  async function rejections(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<Rejections>>('/api/admin/manufacturing-reports/rejections', { query: filter })
    return res.data
  }

  async function materialRequirements(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<MaterialRequirements>>('/api/admin/manufacturing-reports/material-requirements', { query: filter })
    return res.data
  }

  async function bomCost(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<BomCost>>('/api/admin/manufacturing-reports/bom-cost', { query: filter })
    return res.data
  }

  async function costVariance(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<CostVariance>>('/api/admin/manufacturing-reports/cost-variance', { query: filter })
    return res.data
  }

  async function productionTime(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<ProductionTime>>('/api/admin/manufacturing-reports/production-time', { query: filter })
    return res.data
  }

  async function qualityPassFail(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<QualityPassFail>>('/api/admin/manufacturing-reports/quality-pass-fail', { query: filter })
    return res.data
  }

  async function planVsActual(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<PlanVsActual>>('/api/admin/manufacturing-reports/plan-vs-actual', { query: filter })
    return res.data
  }

  async function productionTrend(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<ProductionTrend>>('/api/admin/manufacturing-reports/production-trend', { query: filter })
    return res.data
  }

  async function profitability(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<ManufacturingProfitability>>('/api/admin/manufacturing-reports/profitability', { query: filter })
    return res.data
  }

  async function workCenterUtilization(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<WorkCenterUtilization>>('/api/admin/manufacturing-reports/work-center-utilization', { query: filter })
    return res.data
  }

  async function machineUtilization(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<MachineUtilization>>('/api/admin/manufacturing-reports/machine-utilization', { query: filter })
    return res.data
  }

  async function operationPerformance(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<OperationPerformance>>('/api/admin/manufacturing-reports/operation-performance', { query: filter })
    return res.data
  }

  async function machineCost(filter: ManufacturingReportFilter = {}) {
    const res = await api<ApiEnvelope<MachineCost>>('/api/admin/manufacturing-reports/machine-cost', { query: filter })
    return res.data
  }

  async function bomComparison(bomId: number, compareToBomId: number) {
    const res = await api<ApiEnvelope<BomComparison>>('/api/admin/manufacturing-reports/bom-comparison', { query: { bomId, compareToBomId } })
    return res.data
  }

  return {
    summary,
    materialConsumption,
    productionOutput,
    scrapWastage,
    cost,
    rejections,
    materialRequirements,
    bomCost,
    costVariance,
    productionTime,
    qualityPassFail,
    planVsActual,
    productionTrend,
    profitability,
    workCenterUtilization,
    machineUtilization,
    operationPerformance,
    machineCost,
    bomComparison
  }
}
