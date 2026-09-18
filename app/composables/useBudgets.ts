// Wraps the backend's admin-only BudgetController (/api/admin/budgets/**).
// One row per (companyId, accountId, costCenterId, accountingPeriodId) —
// upsert() finds-or-updates by that combination, so re-saving the same
// account+period edits the existing row rather than erroring on a duplicate.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface Budget {
  id: number
  companyId: number
  accountId: number
  accountCode: string | null
  accountName: string | null
  costCenterId: number | null
  costCenterName: string | null
  accountingPeriodId: number
  periodName: string | null
  amount: number
  notes: string | null
  createdBy: string | null
}

export interface BudgetFilter {
  companyId?: number
  fiscalYearId?: number
  accountingPeriodId?: number
  costCenterId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface UpsertBudgetPayload {
  companyId: number
  accountId: number
  costCenterId?: number
  accountingPeriodId: number
  amount: number
  notes?: string
}

export function useBudgets() {
  const api = useApi()

  function list(filter: BudgetFilter = {}) {
    return api<PageEnvelope<Budget>>('/api/admin/budgets', { query: filter })
  }

  async function upsert(payload: UpsertBudgetPayload) {
    const res = await api<ApiEnvelope<Budget>>('/api/admin/budgets', { method: 'POST', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/budgets/${id}`, { method: 'DELETE' })
  }

  return { list, upsert, remove }
}
