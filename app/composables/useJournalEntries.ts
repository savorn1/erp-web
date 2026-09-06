// Wraps the backend's admin-only JournalEntryController
// (/api/admin/journal-entries/**, requires ROLE_ADMIN). Manual general-ledger
// postings against the Chart of Accounts — no module auto-posts to these yet.
// DRAFT is fully editable; posting (the approval step) makes it immutable.
// Correcting a posted entry creates a second, already-posted entry with every
// line's debit/credit swapped (reverse()), rather than mutating this one.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type JournalEntryStatus = 'DRAFT' | 'POSTED'

export interface JournalEntryLine {
  id: number
  accountId: number
  accountCode: string | null
  accountName: string | null
  debit: number
  credit: number
  description: string | null
}

export interface JournalEntry {
  id: number
  companyId: number
  companyName: string | null
  journalNumber: string
  entryDate: string
  description: string | null
  status: JournalEntryStatus
  totalDebit: number
  totalCredit: number
  reversalOfJournalEntryId: number | null
  reversalOfJournalNumber: string | null
  reversedByJournalEntryId: number | null
  reversedByJournalNumber: string | null
  createdBy: string | null
  createdAt: string
  postedBy: string | null
  postedAt: string | null
  lines: JournalEntryLine[] | null
}

export interface JournalEntryFilter {
  journalNumber?: string
  companyId?: number
  status?: JournalEntryStatus
  accountId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface JournalEntryLinePayload {
  accountId: number
  debit: number
  credit: number
  description?: string
}

export interface JournalEntryPayload {
  companyId: number
  entryDate: string
  description?: string
  lines: JournalEntryLinePayload[]
}

export function useJournalEntries() {
  const api = useApi()

  function list(filter: JournalEntryFilter = {}) {
    return api<PageEnvelope<JournalEntry>>('/api/admin/journal-entries', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<JournalEntry>>(`/api/admin/journal-entries/${id}`)
    return res.data
  }

  async function create(payload: JournalEntryPayload) {
    const res = await api<ApiEnvelope<JournalEntry>>('/api/admin/journal-entries', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: JournalEntryPayload) {
    const res = await api<ApiEnvelope<JournalEntry>>(`/api/admin/journal-entries/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/journal-entries/${id}`, { method: 'DELETE' })
  }

  async function post(id: number) {
    const res = await api<ApiEnvelope<JournalEntry>>(`/api/admin/journal-entries/${id}/post`, { method: 'POST' })
    return res.data
  }

  async function reverse(id: number) {
    const res = await api<ApiEnvelope<JournalEntry>>(`/api/admin/journal-entries/${id}/reverse`, { method: 'POST' })
    return res.data
  }

  return { list, get, create, update, remove, post, reverse }
}
