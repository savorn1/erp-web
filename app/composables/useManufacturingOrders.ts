// Wraps the backend's admin-only ManufacturingOrderController
// (/api/admin/manufacturing-orders/**, requires ROLE_ADMIN). Status moves
// through dedicated actions (release/start/complete/cancel) rather than a
// generic setter — the backend enforces which transitions are legal.
// Material requirement lines are derived from the chosen BOM at creation
// time and can't be edited directly; changing plannedQuantity while DRAFT
// (via update) regenerates them.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type ManufacturingOrderStatus = 'DRAFT' | 'RELEASED' | 'IN_PROGRESS' | 'PENDING_QC' | 'COMPLETED' | 'CANCELLED'
export type QualityCheckStatus = 'PENDING' | 'PASSED' | 'FAILED'

export interface ManufacturingOrderMaterial {
  id: number
  componentProductId: number
  componentProductName: string | null
  componentProductSku: string | null
  unitOfMeasureId: number | null
  unitOfMeasureAbbreviation: string | null
  requiredQuantity: number
  consumedQuantity: number
  unitCost: number
  lineCost: number
}

export interface ManufacturingOrder {
  id: number
  companyId: number
  companyName: string | null
  bomId: number
  bomNumber: string | null
  productId: number
  productName: string | null
  productSku: string | null
  warehouseId: number
  warehouseName: string | null
  productionPlanId: number | null
  planNumber: string | null
  moNumber: string
  plannedQuantity: number
  producedQuantity: number
  scrapQuantity: number
  scrapReason: string | null
  status: ManufacturingOrderStatus
  qualityStatus: QualityCheckStatus | null
  qualityNotes: string | null
  qualityCheckedBy: string | null
  qualityCheckedAt: string | null
  plannedStartDate: string | null
  plannedEndDate: string | null
  actualStartDate: string | null
  actualEndDate: string | null
  materialCost: number
  laborCost: number
  overheadCost: number
  totalCost: number
  unitCost: number
  notes: string | null
  createdBy: string | null
  createdAt: string
  materials: ManufacturingOrderMaterial[] | null
}

export interface ManufacturingOrderFilter {
  moNumber?: string
  companyId?: number
  warehouseId?: number
  productId?: number
  productionPlanId?: number
  status?: ManufacturingOrderStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface ManufacturingOrderPayload {
  companyId: number
  bomId: number
  warehouseId: number
  productionPlanId?: number
  plannedQuantity: number
  plannedStartDate?: string
  plannedEndDate?: string
  notes?: string
}

export interface CompleteManufacturingOrderPayload {
  producedQuantity: number
  scrapQuantity?: number
  scrapReason?: string
  laborCost?: number
  overheadCost?: number
}

export interface QualityCheckPayload {
  status: 'PASSED' | 'FAILED'
  notes?: string
}

export interface MaterialAvailabilityRow {
  componentProductId: number
  componentProductName: string | null
  componentProductSku: string | null
  unitOfMeasureId: number | null
  unitOfMeasureAbbreviation: string | null
  requiredQuantity: number
  availableQuantity: number
  shortfallQuantity: number
}

export function useManufacturingOrders() {
  const api = useApi()

  function list(filter: ManufacturingOrderFilter = {}) {
    return api<PageEnvelope<ManufacturingOrder>>('/api/admin/manufacturing-orders', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<ManufacturingOrder>>(`/api/admin/manufacturing-orders/${id}`)
    return res.data
  }

  async function create(payload: ManufacturingOrderPayload) {
    const res = await api<ApiEnvelope<ManufacturingOrder>>('/api/admin/manufacturing-orders', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: Omit<ManufacturingOrderPayload, 'companyId' | 'bomId'>) {
    const res = await api<ApiEnvelope<ManufacturingOrder>>(`/api/admin/manufacturing-orders/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function release(id: number) {
    const res = await api<ApiEnvelope<ManufacturingOrder>>(`/api/admin/manufacturing-orders/${id}/release`, { method: 'POST' })
    return res.data
  }

  async function start(id: number) {
    const res = await api<ApiEnvelope<ManufacturingOrder>>(`/api/admin/manufacturing-orders/${id}/start`, { method: 'POST' })
    return res.data
  }

  async function complete(id: number, payload: CompleteManufacturingOrderPayload) {
    const res = await api<ApiEnvelope<ManufacturingOrder>>(`/api/admin/manufacturing-orders/${id}/complete`, { method: 'POST', body: payload })
    return res.data
  }

  async function qualityCheck(id: number, payload: QualityCheckPayload) {
    const res = await api<ApiEnvelope<ManufacturingOrder>>(`/api/admin/manufacturing-orders/${id}/quality-check`, { method: 'POST', body: payload })
    return res.data
  }

  async function materialAvailability(id: number) {
    const res = await api<ApiEnvelope<MaterialAvailabilityRow[]>>(`/api/admin/manufacturing-orders/${id}/material-availability`)
    return res.data
  }

  async function cancel(id: number) {
    const res = await api<ApiEnvelope<ManufacturingOrder>>(`/api/admin/manufacturing-orders/${id}/cancel`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/manufacturing-orders/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, release, start, complete, qualityCheck, materialAvailability, cancel, remove }
}
