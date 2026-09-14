// Wraps the backend's admin-only RoutingController
// (/api/admin/routings/**, requires ROLE_ADMIN). A routing is the sequence
// of shop-floor operations for one BOM's finished good; when a
// ManufacturingOrder is created against a BOM that has an ACTIVE routing,
// its operations are cloned into that order's WorkOrders (see
// useManufacturingOrders — the `workOrders` field on ManufacturingOrder).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type RoutingStatus = 'ACTIVE' | 'INACTIVE'

export interface RoutingOperation {
  id: number
  sequenceNumber: number
  name: string
  workCenterId: number
  workCenterName: string | null
  machineId: number | null
  machineName: string | null
  standardTimeMinutes: number | null
}

export interface Routing {
  id: number
  companyId: number
  companyName: string | null
  bomId: number
  bomNumber: string | null
  routingNumber: string
  name: string
  status: RoutingStatus
  notes: string | null
  createdBy: string | null
  createdAt: string
  operations: RoutingOperation[] | null
}

export interface RoutingFilter {
  routingNumber?: string
  companyId?: number
  bomId?: number
  status?: RoutingStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface RoutingOperationPayload {
  sequenceNumber: number
  name: string
  workCenterId: number
  machineId?: number
  standardTimeMinutes?: number
}

export interface RoutingPayload {
  companyId: number
  bomId: number
  name: string
  notes?: string
  operations: RoutingOperationPayload[]
}

export function useRoutings() {
  const api = useApi()

  function list(filter: RoutingFilter = {}) {
    return api<PageEnvelope<Routing>>('/api/admin/routings', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Routing>>(`/api/admin/routings/${id}`)
    return res.data
  }

  async function create(payload: RoutingPayload) {
    const res = await api<ApiEnvelope<Routing>>('/api/admin/routings', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: Omit<RoutingPayload, 'companyId' | 'bomId'>) {
    const res = await api<ApiEnvelope<Routing>>(`/api/admin/routings/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function activate(id: number) {
    const res = await api<ApiEnvelope<Routing>>(`/api/admin/routings/${id}/activate`, { method: 'POST' })
    return res.data
  }

  async function deactivate(id: number) {
    const res = await api<ApiEnvelope<Routing>>(`/api/admin/routings/${id}/deactivate`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/routings/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, activate, deactivate, remove }
}
