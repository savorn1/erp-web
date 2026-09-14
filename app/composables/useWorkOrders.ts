// Wraps the backend's admin-only WorkOrderController
// (/api/admin/work-orders/**, requires ROLE_ADMIN). Work orders are
// generated automatically by ManufacturingOrderServiceImpl (from the BOM's
// active routing) — there is no create endpoint here, only list/start/
// complete. Starting or completing one is tracking-only: it never moves
// stock (the ManufacturingOrder's own start/complete/quality-check actions
// remain the sole source of that).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type WorkOrderStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED'

export interface WorkOrder {
  id: number
  manufacturingOrderId: number
  moNumber: string | null
  sequenceNumber: number
  name: string
  workCenterId: number
  workCenterName: string | null
  machineId: number | null
  machineName: string | null
  standardTimeMinutes: number | null
  status: WorkOrderStatus
  actualStartDate: string | null
  actualEndDate: string | null
  notes: string | null
}

export interface WorkOrderFilter {
  manufacturingOrderId?: number
  workCenterId?: number
  machineId?: number
  status?: WorkOrderStatus
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export function useWorkOrders() {
  const api = useApi()

  function list(filter: WorkOrderFilter = {}) {
    return api<PageEnvelope<WorkOrder>>('/api/admin/work-orders', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<WorkOrder>>(`/api/admin/work-orders/${id}`)
    return res.data
  }

  async function start(id: number) {
    const res = await api<ApiEnvelope<WorkOrder>>(`/api/admin/work-orders/${id}/start`, { method: 'POST' })
    return res.data
  }

  async function complete(id: number, notes?: string) {
    const res = await api<ApiEnvelope<WorkOrder>>(`/api/admin/work-orders/${id}/complete`, { method: 'POST', body: { notes } })
    return res.data
  }

  return { list, get, start, complete }
}
