// Wraps the backend's admin-only CommissionRuleController
// (/api/admin/commission-rules/**) and CommissionController
// (/api/admin/commissions/**, requires ROLE_ADMIN). Commission accrues on
// the paid portion of an invoice (via PaymentAllocation, see
// PaymentServiceImpl.recordCommissionEntries) for whichever sales rep is
// credited on the underlying SalesOrder (useSalesOrders' salesRepUserId) —
// never on invoiced-but-unpaid amounts.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface CommissionRule {
  id: number
  companyId: number
  companyName: string | null
  // Null means this is the company-wide default rate.
  userId: number | null
  userName: string | null
  ratePercent: number
  active: boolean
}

export interface CommissionRuleFilter {
  companyId?: number
  userId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CommissionRulePayload {
  companyId: number
  userId?: number
  ratePercent: number
  active: boolean
}

export interface CommissionReportFilter {
  companyId?: number
  dateFrom?: string
  dateTo?: string
  salesRepUserId?: number
}

export interface CommissionReportRow {
  salesRepUserId: number
  salesRepName: string | null
  entryCount: number
  totalBasisAmount: number
  totalCommissionAmount: number
  paidCommissionAmount: number
  unpaidCommissionAmount: number
}

export interface CommissionReport {
  dateFrom: string | null
  dateTo: string | null
  rows: CommissionReportRow[]
  totalCommissionAmount: number
}

export interface CommissionEntryFilter {
  companyId?: number
  salesRepUserId?: number
  dateFrom?: string
  dateTo?: string
  paidOut?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CommissionEntry {
  id: number
  salesRepUserId: number
  salesRepName: string | null
  invoiceId: number
  invoiceNumber: string | null
  paymentId: number
  paymentNumber: string | null
  basisAmount: number
  ratePercent: number
  commissionAmount: number
  earnedDate: string
  paidOut: boolean
  paidOutAt: string | null
}

export function useCommissionRules() {
  const api = useApi()

  function list(filter: CommissionRuleFilter = {}) {
    return api<PageEnvelope<CommissionRule>>('/api/admin/commission-rules', { query: filter })
  }

  async function create(payload: CommissionRulePayload) {
    const res = await api<ApiEnvelope<CommissionRule>>('/api/admin/commission-rules', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: CommissionRulePayload) {
    const res = await api<ApiEnvelope<CommissionRule>>(`/api/admin/commission-rules/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/commission-rules/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}

export function useCommissions() {
  const api = useApi()

  async function report(filter: CommissionReportFilter = {}) {
    const res = await api<ApiEnvelope<CommissionReport>>('/api/admin/commissions/report', { query: filter })
    return res.data
  }

  function listEntries(filter: CommissionEntryFilter = {}) {
    return api<PageEnvelope<CommissionEntry>>('/api/admin/commissions/entries', { query: filter })
  }

  async function markPaid(salesRepUserId: number, throughDate: string) {
    await api('/api/admin/commissions/mark-paid', { method: 'POST', body: { salesRepUserId, throughDate } })
  }

  return { report, listEntries, markPaid }
}
