// Wraps the backend's admin-only SupplierTypeController
// (/api/admin/supplier-types/**, requires ROLE_ADMIN).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface SupplierType {
  id: number
  name: string
  active: boolean
}

export interface SupplierTypeFilter {
  name?: string
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface SupplierTypePayload {
  name: string
  active: boolean
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
