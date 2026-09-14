// Wraps the backend's admin-only WorkCenterController
// (/api/admin/work-centers/**, requires ROLE_ADMIN). Plain master data — a
// physical/logical production area a RoutingOperation is assigned to.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface WorkCenter {
  id: number
  companyId: number
  companyName: string | null
  name: string
  code: string | null
  warehouseId: number | null
  warehouseName: string | null
  description: string | null
  capacityPerHour: number | null
  active: boolean
}

export interface WorkCenterFilter {
  name?: string
  companyId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface WorkCenterPayload {
  companyId: number
  name: string
  code?: string
  warehouseId?: number
  description?: string
  capacityPerHour?: number
}

export function useWorkCenters() {
  const api = useApi()

  function list(filter: WorkCenterFilter = {}) {
    return api<PageEnvelope<WorkCenter>>('/api/admin/work-centers', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<WorkCenter>>(`/api/admin/work-centers/${id}`)
    return res.data
  }

  async function create(payload: WorkCenterPayload) {
    const res = await api<ApiEnvelope<WorkCenter>>('/api/admin/work-centers', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: Omit<WorkCenterPayload, 'companyId'>) {
    const res = await api<ApiEnvelope<WorkCenter>>(`/api/admin/work-centers/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function updateStatus(id: number, active: boolean) {
    const res = await api<ApiEnvelope<WorkCenter>>(`/api/admin/work-centers/${id}/status`, { method: 'PUT', body: { active } })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/work-centers/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, updateStatus, remove }
}
