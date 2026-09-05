// Wraps the backend's admin-only SupplierTypeController
// (/api/admin/supplier-types/**, requires ROLE_ADMIN).

export interface SupplierType {
  id: number
  companyId: number
  companyName: string | null
  name: string
  active: boolean
}

export interface SupplierTypeFilter {
  name?: string
  companyId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface SupplierTypePayload {
  companyId: number
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

export function useSupplierTypes() {
  const api = useApi()

  function list(filter: SupplierTypeFilter = {}) {
    return api<PageEnvelope<SupplierType>>('/api/admin/supplier-types', { query: filter })
  }

  async function create(payload: SupplierTypePayload) {
    const res = await api<ApiEnvelope<SupplierType>>('/api/admin/supplier-types', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: SupplierTypePayload) {
    const res = await api<ApiEnvelope<SupplierType>>(`/api/admin/supplier-types/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/supplier-types/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
