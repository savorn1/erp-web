// Wraps the backend's admin-only ProductTypeController
// (/api/admin/product-types/**, requires ROLE_ADMIN).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface ProductType {
  id: number
  name: string
  active: boolean
}

export interface ProductTypeFilter {
  name?: string
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface ProductTypePayload {
  name: string
  active: boolean
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
