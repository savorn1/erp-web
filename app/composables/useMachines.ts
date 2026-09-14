// Wraps the backend's admin-only MachineController
// (/api/admin/machines/**, requires ROLE_ADMIN).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type MachineStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'DOWN'

export interface Machine {
  id: number
  companyId: number
  companyName: string | null
  workCenterId: number
  workCenterName: string | null
  name: string
  code: string | null
  status: MachineStatus
  costPerHour: number | null
}

export interface MachineFilter {
  name?: string
  companyId?: number
  workCenterId?: number
  status?: MachineStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface MachinePayload {
  companyId: number
  workCenterId: number
  name: string
  code?: string
  costPerHour?: number
}

export function useMachines() {
  const api = useApi()

  function list(filter: MachineFilter = {}) {
    return api<PageEnvelope<Machine>>('/api/admin/machines', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Machine>>(`/api/admin/machines/${id}`)
    return res.data
  }

  async function create(payload: MachinePayload) {
    const res = await api<ApiEnvelope<Machine>>('/api/admin/machines', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: Omit<MachinePayload, 'companyId'>) {
    const res = await api<ApiEnvelope<Machine>>(`/api/admin/machines/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function updateStatus(id: number, status: MachineStatus) {
    const res = await api<ApiEnvelope<Machine>>(`/api/admin/machines/${id}/status`, { method: 'PUT', body: { status } })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/machines/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, updateStatus, remove }
}
