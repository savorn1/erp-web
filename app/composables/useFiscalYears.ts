// Wraps the backend's admin-only FiscalYearController
// (/api/admin/fiscal-years/**, requires ROLE_ADMIN). Creating one also
// generates one AccountingPeriod per calendar month in its range (unless
// generateMonthlyPeriods is false) — see useAccountingPeriods. Closing a
// year closes every period within it; JournalEntryServiceImpl then refuses
// to create/edit/post any entry dated inside it.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type FiscalYearStatus = 'OPEN' | 'CLOSED'

export interface FiscalYear {
  id: number
  companyId: number
  companyName: string | null
  name: string
  startDate: string
  endDate: string
  status: FiscalYearStatus
  periodCount: number
  openPeriodCount: number
}

export interface FiscalYearFilter {
  companyId?: number
  status?: FiscalYearStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface FiscalYearPayload {
  companyId: number
  name: string
  startDate: string
  endDate: string
  generateMonthlyPeriods?: boolean
}

export function useFiscalYears() {
  const api = useApi()

  function list(filter: FiscalYearFilter = {}) {
    return api<PageEnvelope<FiscalYear>>('/api/admin/fiscal-years', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<FiscalYear>>(`/api/admin/fiscal-years/${id}`)
    return res.data
  }

  async function create(payload: FiscalYearPayload) {
    const res = await api<ApiEnvelope<FiscalYear>>('/api/admin/fiscal-years', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: Omit<FiscalYearPayload, 'generateMonthlyPeriods'>) {
    const res = await api<ApiEnvelope<FiscalYear>>(`/api/admin/fiscal-years/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function close(id: number) {
    const res = await api<ApiEnvelope<FiscalYear>>(`/api/admin/fiscal-years/${id}/close`, { method: 'POST' })
    return res.data
  }

  async function reopen(id: number) {
    const res = await api<ApiEnvelope<FiscalYear>>(`/api/admin/fiscal-years/${id}/reopen`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/fiscal-years/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, close, reopen, remove }
}
