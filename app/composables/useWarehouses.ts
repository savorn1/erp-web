// Wraps the backend's admin-only WarehouseController (/api/admin/warehouses/**,
// requires ROLE_ADMIN). Company and manager are resolved server-side into
// display names. Mirrors useBranches.

export interface Warehouse {
  id: number
  companyId: number
  companyName: string | null
  name: string
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  managerId: number | null
  managerUsername: string | null
  phone: string | null
  email: string | null
  timezone: string | null
  active: boolean
  zoneCount: number
}

export interface WarehouseFilter {
  name?: string
  companyId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface WarehousePayload {
  companyId: number
  name: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  managerId?: number
  phone?: string
  email?: string
  timezone?: string
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

export function useWarehouses() {
  const api = useApi()

  function list(filter: WarehouseFilter = {}) {
    return api<PageEnvelope<Warehouse>>('/api/admin/warehouses', { query: filter })
  }

  async function create(payload: WarehousePayload) {
    const res = await api<ApiEnvelope<Warehouse>>('/api/admin/warehouses', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: WarehousePayload) {
    const res = await api<ApiEnvelope<Warehouse>>(`/api/admin/warehouses/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function updateStatus(id: number, active: boolean) {
    const res = await api<ApiEnvelope<Warehouse>>(`/api/admin/warehouses/${id}/status`, { method: 'PUT', body: { active } })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/warehouses/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, updateStatus, remove }
}
