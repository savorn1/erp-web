// Wraps the backend's admin-only PettyCashController
// (/api/admin/petty-cash/**). An append-only ledger — TOPUP funds petty cash
// from a cash/bank account, EXPENSE spends it against an expense account.
// No update/delete: a mistake is corrected with an offsetting entry, same as
// a real petty cash book. The petty cash leg itself always comes from the
// company's PostingRule.pettyCashAccountId — only the counter account is
// picked here.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type PettyCashEntryType = 'TOPUP' | 'EXPENSE'

export interface PettyCashEntry {
  id: number
  companyId: number
  companyName: string | null
  type: PettyCashEntryType
  entryNumber: string
  entryDate: string
  accountId: number
  accountLabel: string | null
  amount: number
  description: string | null
  createdBy: string | null
}

export interface PettyCashFilter {
  companyId?: number
  type?: PettyCashEntryType
  entryDateFrom?: string
  entryDateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CreatePettyCashEntryPayload {
  companyId: number
  type: PettyCashEntryType
  entryDate: string
  accountId: number
  amount: number
  description?: string
}

export interface PettyCashSummary {
  companyId: number
  toppedUp: number
  expensed: number
  balance: number
}

export function usePettyCash() {
  const api = useApi()

  function list(filter: PettyCashFilter = {}) {
    return api<PageEnvelope<PettyCashEntry>>('/api/admin/petty-cash', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<PettyCashEntry>>(`/api/admin/petty-cash/${id}`)
    return res.data
  }

  async function create(payload: CreatePettyCashEntryPayload) {
    const res = await api<ApiEnvelope<PettyCashEntry>>('/api/admin/petty-cash', { method: 'POST', body: payload })
    return res.data
  }

  async function summary(companyId: number) {
    const res = await api<ApiEnvelope<PettyCashSummary>>('/api/admin/petty-cash/summary', { query: { companyId } })
    return res.data
  }

  return { list, get, create, summary }
}
