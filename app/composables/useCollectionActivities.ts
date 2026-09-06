// Wraps the backend's admin-only CollectionActivityController
// (/api/admin/collection-activities/**, requires ROLE_ADMIN). A logged
// follow-up (call, email, letter…) chasing payment on a customer invoice —
// not tied to invoice status, so notes can still be added after it's paid.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type CollectionContactMethod = 'PHONE' | 'EMAIL' | 'LETTER' | 'IN_PERSON' | 'OTHER'

export interface CollectionActivity {
  id: number
  companyId: number
  invoiceId: number
  invoiceNumber: string | null
  customerId: number
  customerName: string | null
  activityDate: string
  method: CollectionContactMethod
  notes: string | null
  followUpDate: string | null
  resolved: boolean
  createdBy: string | null
}

export interface CollectionActivityFilter {
  companyId?: number
  invoiceId?: number
  customerId?: number
  resolved?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CollectionActivityPayload {
  invoiceId: number
  activityDate: string
  method: CollectionContactMethod
  notes?: string
  followUpDate?: string
  resolved: boolean
}

export function useCollectionActivities() {
  const api = useApi()

  function list(filter: CollectionActivityFilter = {}) {
    return api<PageEnvelope<CollectionActivity>>('/api/admin/collection-activities', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<CollectionActivity>>(`/api/admin/collection-activities/${id}`)
    return res.data
  }

  async function create(payload: CollectionActivityPayload) {
    const res = await api<ApiEnvelope<CollectionActivity>>('/api/admin/collection-activities', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: CollectionActivityPayload) {
    const res = await api<ApiEnvelope<CollectionActivity>>(`/api/admin/collection-activities/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/collection-activities/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, remove }
}
