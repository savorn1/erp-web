// Wraps the backend's admin-only ProductTypeController
// (/api/admin/product-types/**, requires ROLE_ADMIN).

export interface ProductType {
  id: number
  companyId: number
  companyName: string | null
  name: string
  active: boolean
}

export interface ProductTypeFilter {
  name?: string
  companyId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface ProductTypePayload {
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

export function useProductTypes() {
  const api = useApi()

  function list(filter: ProductTypeFilter = {}) {
    return api<PageEnvelope<ProductType>>('/api/admin/product-types', { query: filter })
  }

  async function create(payload: ProductTypePayload) {
    const res = await api<ApiEnvelope<ProductType>>('/api/admin/product-types', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: ProductTypePayload) {
    const res = await api<ApiEnvelope<ProductType>>(`/api/admin/product-types/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/product-types/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
