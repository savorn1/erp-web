// Wraps the backend's admin-only ProductCategoryController
// (/api/admin/product-categories/**, requires ROLE_ADMIN).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface ProductCategory {
  id: number
  companyId: number
  companyName: string | null
  name: string
  active: boolean
}

export interface ProductCategoryFilter {
  name?: string
  companyId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface ProductCategoryPayload {
  companyId: number
  name: string
  active: boolean
}

export function useProductCategories() {
  const api = useApi()

  function list(filter: ProductCategoryFilter = {}) {
    return api<PageEnvelope<ProductCategory>>('/api/admin/product-categories', { query: filter })
  }

  async function create(payload: ProductCategoryPayload) {
    const res = await api<ApiEnvelope<ProductCategory>>('/api/admin/product-categories', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: ProductCategoryPayload) {
    const res = await api<ApiEnvelope<ProductCategory>>(`/api/admin/product-categories/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/product-categories/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
