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

export function useDashboard() {
  const api = useApi()

  async function summary(filter: DashboardSummaryFilter = {}) {
    const res = await api<ApiEnvelope<DashboardSummary>>('/api/admin/dashboard/summary', { query: filter })
    return res.data
  }

  return { summary }
}
