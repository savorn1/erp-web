// Wraps the backend's admin-only WarehouseZoneController
// (/api/admin/warehouse-zones/**, requires ROLE_ADMIN).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface WarehouseZone {
  id: number
  warehouseId: number
  warehouseName: string | null
  name: string
  description: string | null
  active: boolean
  binCount: number
}

export interface WarehouseZoneFilter {
  name?: string
  warehouseId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface WarehouseZonePayload {
  warehouseId: number
  name: string
  description?: string
  active: boolean
}

export function useWarehouseZones() {
  const api = useApi()

  function list(filter: WarehouseZoneFilter = {}) {
    return api<PageEnvelope<WarehouseZone>>('/api/admin/warehouse-zones', { query: filter })
  }

  async function create(payload: WarehouseZonePayload) {
    const res = await api<ApiEnvelope<WarehouseZone>>('/api/admin/warehouse-zones', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: WarehouseZonePayload) {
    const res = await api<ApiEnvelope<WarehouseZone>>(`/api/admin/warehouse-zones/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/warehouse-zones/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
