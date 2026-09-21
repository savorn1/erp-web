// Wraps the backend's admin-only ProductTypeController
// (/api/admin/product-types/**, requires ROLE_ADMIN).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

// A closed set, mirroring the backend ProductTypeCode enum — users pick one
// rather than inventing codes, so the rest of the system can reason about it.
export type ProductTypeCode = 'GOODS' | 'RAW_MATERIAL' | 'CONSUMABLE' | 'NON_STOCK' | 'SERVICE' | 'ASSET'

export interface ProductType {
  id: number
  // Null on types created before codes existed, until they're edited.
  code: ProductTypeCode | null
  name: string
  active: boolean
}

export interface ProductTypeFilter {
  code?: ProductTypeCode
  name?: string
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface ProductTypePayload {
  code: ProductTypeCode
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
