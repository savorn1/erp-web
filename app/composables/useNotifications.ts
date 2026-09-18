// Wraps the backend's admin-only NotificationController
// (/api/admin/notifications) — a compute-on-demand alert feed, not a
// persisted log. Aggregates across every company (this app has no global
// "current company" header context to scope it to one). Exactly one of
// count/amount is set per item; amount-based items are formatted with
// formatCurrency by the caller, count-based items just show the number.

import type { ApiEnvelope } from '#shared/types'

export interface NotificationItem {
  type: string
  label: string
  count: number | null
  amount: number | null
  link: string
}

export interface NotificationSummary {
  items: NotificationItem[]
  totalCount: number
}

export function useNotifications() {
  const api = useApi()

  async function summary() {
    const res = await api<ApiEnvelope<NotificationSummary>>('/api/admin/notifications')
    return res.data
  }

  return { summary }
}
