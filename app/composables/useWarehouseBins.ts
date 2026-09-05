// Wraps the backend's admin-only WarehouseBinController
// (/api/admin/warehouse-bins/**, requires ROLE_ADMIN). Represents a
// shelf/bin — the smallest storage location, nested under a WarehouseZone.

export interface WarehouseBin {
  id: number
  zoneId: number
  zoneName: string | null
  warehouseId: number | null
  warehouseName: string | null
  name: string
  active: boolean
}

export interface WarehouseBinFilter {
  name?: string
  zoneId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface WarehouseBinPayload {
  zoneId: number
  name: string
  active: boolean
}

interface ApiEnvelope<T> {
  traceId: string
  statusCode: number
  message: string
  data: T
}

interface PageEnvelope<T> {
  traceId: string
  statusCode: number
  message: string
  data: T[]
  metadata: { hasNext: boolean; hasPrev: boolean; totalPage: number; currentPage: number; limit: number; totalCount: number }
}

export function useWarehouseBins() {
  const api = useApi()

  function list(filter: WarehouseBinFilter = {}) {
    return api<PageEnvelope<WarehouseBin>>('/api/admin/warehouse-bins', { query: filter })
  }

  async function create(payload: WarehouseBinPayload) {
    const res = await api<ApiEnvelope<WarehouseBin>>('/api/admin/warehouse-bins', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: WarehouseBinPayload) {
    const res = await api<ApiEnvelope<WarehouseBin>>(`/api/admin/warehouse-bins/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/warehouse-bins/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
