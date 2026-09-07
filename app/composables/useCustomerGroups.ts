// Wraps the backend's admin-only CustomerGroupController
// (/api/admin/customer-groups/**, requires ROLE_ADMIN).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface CustomerGroup {
  id: number
  name: string
  priceGroupId: number | null
  priceGroupName: string | null
  active: boolean
}

export interface CustomerGroupFilter {
  name?: string
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CustomerGroupPayload {
  name: string
  priceGroupId?: number
  active: boolean
}

export function useCustomerGroups() {
  const api = useApi()

  function list(filter: CustomerGroupFilter = {}) {
    return api<PageEnvelope<CustomerGroup>>('/api/admin/customer-groups', { query: filter })
  }

  async function create(payload: CustomerGroupPayload) {
    const res = await api<ApiEnvelope<CustomerGroup>>('/api/admin/customer-groups', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: CustomerGroupPayload) {
    const res = await api<ApiEnvelope<CustomerGroup>>(`/api/admin/customer-groups/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/customer-groups/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
