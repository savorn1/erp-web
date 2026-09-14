// Wraps the backend's admin-only JournalController (/api/admin/journals/**,
// requires ROLE_ADMIN). A journal is just a classification "book" a
// JournalEntry can be filed under (e.g. Sales Journal) — see
// useJournalEntries's journalId field. Carries no posting logic of its own.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface Journal {
  id: number
  companyId: number
  companyName: string | null
  code: string
  name: string
  description: string | null
  active: boolean
}

export interface JournalFilter {
  code?: string
  companyId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface JournalPayload {
  companyId: number
  code: string
  name: string
  description?: string
  active: boolean
}

export function useJournals() {
  const api = useApi()

  function list(filter: JournalFilter = {}) {
    return api<PageEnvelope<Journal>>('/api/admin/journals', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Journal>>(`/api/admin/journals/${id}`)
    return res.data
  }

  async function create(payload: JournalPayload) {
    const res = await api<ApiEnvelope<Journal>>('/api/admin/journals', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: JournalPayload) {
    const res = await api<ApiEnvelope<Journal>>(`/api/admin/journals/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/journals/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, remove }
}
