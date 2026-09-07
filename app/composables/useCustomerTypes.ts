// Wraps the backend's admin-only CustomerTypeController
// (/api/admin/customer-types/**, requires ROLE_ADMIN).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface CustomerType {
  id: number
  name: string
  active: boolean
}

export interface CustomerTypeFilter {
  name?: string
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CustomerTypePayload {
  name: string
  active: boolean
}

export function useCustomerTypes() {
  const api = useApi()

  function list(filter: CustomerTypeFilter = {}) {
    return api<PageEnvelope<CustomerType>>('/api/admin/customer-types', { query: filter })
  }

  async function create(payload: CustomerTypePayload) {
    const res = await api<ApiEnvelope<CustomerType>>('/api/admin/customer-types', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: CustomerTypePayload) {
    const res = await api<ApiEnvelope<CustomerType>>(`/api/admin/customer-types/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/customer-types/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
