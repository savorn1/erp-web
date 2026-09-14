// Wraps the backend's admin-only CostCenterController
// (/api/admin/cost-centers/**, requires ROLE_ADMIN). A department/unit a
// JournalEntryLine can optionally be tagged with — see
// useJournalEntries's costCenterId field.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface CostCenter {
  id: number
  companyId: number
  companyName: string | null
  code: string
  name: string
  description: string | null
  active: boolean
}

export interface CostCenterFilter {
  code?: string
  companyId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CostCenterPayload {
  companyId: number
  code: string
  name: string
  description?: string
  active: boolean
}

export function useCostCenters() {
  const api = useApi()

  function list(filter: CostCenterFilter = {}) {
    return api<PageEnvelope<CostCenter>>('/api/admin/cost-centers', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<CostCenter>>(`/api/admin/cost-centers/${id}`)
    return res.data
  }

  async function create(payload: CostCenterPayload) {
    const res = await api<ApiEnvelope<CostCenter>>('/api/admin/cost-centers', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: CostCenterPayload) {
    const res = await api<ApiEnvelope<CostCenter>>(`/api/admin/cost-centers/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/cost-centers/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, remove }
}
