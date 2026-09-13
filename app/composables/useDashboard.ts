// Wraps the backend's admin-only DashboardController
// (/api/admin/dashboard/**, requires ROLE_ADMIN). Sums real transactional
// data (invoices, orders, bank accounts, inventory valuation) rather than
// the general ledger — see DashboardServiceImpl's own comment.

import type { ApiEnvelope } from '#shared/types'

export interface DashboardSummaryFilter {
  companyId?: number
  dateFrom?: string
  dateTo?: string
}

export interface DashboardSummary {
  dateFrom: string | null
  dateTo: string | null
  revenue: number
  expense: number
  profit: number
  cash: number
  receivable: number
  payable: number
  inventoryValue: number
  sales: number
  purchase: number
}

export interface DashboardTrendFilter {
  companyId?: number
  /** Trailing calendar months to return, oldest first, ending with the current month. Defaults to 6. */
  months?: number
}

export interface DashboardTrendPoint {
  month: string
  sales: number
  purchase: number
}

export interface DashboardTrend {
  months: DashboardTrendPoint[]
}

export function useDashboard() {
  const api = useApi()

  async function summary(filter: DashboardSummaryFilter = {}) {
    const res = await api<ApiEnvelope<DashboardSummary>>('/api/admin/dashboard/summary', { query: filter })
    return res.data
  }

  async function trend(filter: DashboardTrendFilter = {}) {
    const res = await api<ApiEnvelope<DashboardTrend>>('/api/admin/dashboard/trend', { query: filter })
    return res.data
  }

  return { summary, trend }
}
