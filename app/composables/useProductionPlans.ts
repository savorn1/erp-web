// Wraps the backend's admin-only ProductionPlanController
// (/api/admin/production-plans/**, requires ROLE_ADMIN). A plan is just a
// lightweight grouping of ManufacturingOrders over a period — it doesn't do
// capacity/scheduling math itself, an order optionally points at one via
// its own productionPlanId (see useManufacturingOrders).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type ProductionPlanStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED'

export interface ProductionPlan {
  id: number
  companyId: number
  companyName: string | null
  planNumber: string
  name: string
  periodStart: string
  periodEnd: string
  status: ProductionPlanStatus
  notes: string | null
  createdBy: string | null
  createdAt: string
  orderCount: number
  totalPlannedQuantity: number
  totalProducedQuantity: number
}

export interface ProductionPlanFilter {
  planNumber?: string
  companyId?: number
  status?: ProductionPlanStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface ProductionPlanPayload {
  companyId: number
  name: string
  periodStart: string
  periodEnd: string
  notes?: string
}

export function useProductionPlans() {
  const api = useApi()

  function list(filter: ProductionPlanFilter = {}) {
    return api<PageEnvelope<ProductionPlan>>('/api/admin/production-plans', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<ProductionPlan>>(`/api/admin/production-plans/${id}`)
    return res.data
  }

  async function create(payload: ProductionPlanPayload) {
    const res = await api<ApiEnvelope<ProductionPlan>>('/api/admin/production-plans', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: Omit<ProductionPlanPayload, 'companyId'>) {
    const res = await api<ApiEnvelope<ProductionPlan>>(`/api/admin/production-plans/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function activate(id: number) {
    const res = await api<ApiEnvelope<ProductionPlan>>(`/api/admin/production-plans/${id}/activate`, { method: 'POST' })
    return res.data
  }

  async function close(id: number) {
    const res = await api<ApiEnvelope<ProductionPlan>>(`/api/admin/production-plans/${id}/close`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/production-plans/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, activate, close, remove }
}
