// Wraps the backend's admin-only UnitOfMeasureController
// (/api/admin/units-of-measure/**, requires ROLE_ADMIN).

export interface UnitOfMeasure {
  id: number
  companyId: number
  companyName: string | null
  name: string
  abbreviation: string
  active: boolean
}

export interface UnitOfMeasureFilter {
  name?: string
  companyId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface UnitOfMeasurePayload {
  companyId: number
  name: string
  abbreviation: string
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

export function useUnitsOfMeasure() {
  const api = useApi()

  function list(filter: UnitOfMeasureFilter = {}) {
    return api<PageEnvelope<UnitOfMeasure>>('/api/admin/units-of-measure', { query: filter })
  }

  async function create(payload: UnitOfMeasurePayload) {
    const res = await api<ApiEnvelope<UnitOfMeasure>>('/api/admin/units-of-measure', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: UnitOfMeasurePayload) {
    const res = await api<ApiEnvelope<UnitOfMeasure>>(`/api/admin/units-of-measure/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/units-of-measure/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
