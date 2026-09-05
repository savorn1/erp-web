// Wraps the backend's admin-only ProductBrandController
// (/api/admin/product-brands/**, requires ROLE_ADMIN).

export interface ProductBrand {
  id: number
  companyId: number
  companyName: string | null
  name: string
  active: boolean
}

export interface ProductBrandFilter {
  name?: string
  companyId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface ProductBrandPayload {
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

export function useProductBrands() {
  const api = useApi()

  function list(filter: ProductBrandFilter = {}) {
    return api<PageEnvelope<ProductBrand>>('/api/admin/product-brands', { query: filter })
  }

  async function create(payload: ProductBrandPayload) {
    const res = await api<ApiEnvelope<ProductBrand>>('/api/admin/product-brands', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: ProductBrandPayload) {
    const res = await api<ApiEnvelope<ProductBrand>>(`/api/admin/product-brands/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/product-brands/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
