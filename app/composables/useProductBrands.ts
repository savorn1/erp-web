// Wraps the backend's admin-only ProductBrandController
// (/api/admin/product-brands/**, requires ROLE_ADMIN).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface ProductBrand {
  id: number
  name: string
  active: boolean
}

export interface ProductBrandFilter {
  name?: string
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface ProductBrandPayload {
  name: string
  active: boolean
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
