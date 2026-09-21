// Wraps the backend's admin-only RmaController (/api/admin/rma-requests/**).
// A 2-gate workflow — REQUESTED -> APPROVED -> RESOLVED (or REJECTED/
// CANCELLED before resolution) — matching this app's PurchaseRequest/
// StockAdjustment convention. Only resolve() actually moves money/stock:
// REFUND calls the existing Credit Note flow against the RMA's invoice
// (required for that resolution type), REPLACEMENT records a same-product
// stock swap, REPAIR is pure audit trail.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type RmaStatus = 'REQUESTED' | 'APPROVED' | 'RESOLVED' | 'REJECTED' | 'CANCELLED'
export type RmaResolutionType = 'REFUND' | 'REPLACEMENT' | 'REPAIR'

export interface RmaLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  invoiceLineId: number | null
  serialNumberId: number | null
  serialNumberValue: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  reasonNote: string | null
  withinWarranty: boolean | null
}

export interface Rma {
  id: number
  companyId: number
  companyName: string | null
  customerId: number
  customerName: string | null
  invoiceId: number | null
  invoiceNumber: string | null
  warehouseId: number
  warehouseName: string | null
  rmaNumber: string
  requestDate: string
  status: RmaStatus
  // The status the document held when it was cancelled or rejected.
  // Null when it was never cancelled, or was cancelled before this was recorded.
  cancelledFromStatus: string | null
  resolutionType: RmaResolutionType | null
  reason: string | null
  notes: string | null
  createdBy: string | null
  totalRefundable: number
  lines: RmaLine[] | null
}

export interface RmaFilter {
  companyId?: number
  customerId?: number
  status?: RmaStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface RmaLinePayload {
  productId: number
  invoiceLineId?: number
  serialNumberId?: number
  quantity: number
  unitPrice?: number
  reasonNote?: string
}

export interface CreateRmaPayload {
  companyId: number
  customerId: number
  invoiceId?: number
  warehouseId: number
  requestDate: string
  reason?: string
  notes?: string
  lines: RmaLinePayload[]
}

export interface ResolveRmaPayload {
  resolutionType: RmaResolutionType
  notes?: string
}

export function useRmaRequests() {
  const api = useApi()

  function list(filter: RmaFilter = {}) {
    return api<PageEnvelope<Rma>>('/api/admin/rma-requests', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Rma>>(`/api/admin/rma-requests/${id}`)
    return res.data
  }

  async function create(payload: CreateRmaPayload) {
    const res = await api<ApiEnvelope<Rma>>('/api/admin/rma-requests', { method: 'POST', body: payload })
    return res.data
  }

  async function approve(id: number) {
    const res = await api<ApiEnvelope<Rma>>(`/api/admin/rma-requests/${id}/approve`, { method: 'POST' })
    return res.data
  }

  async function reject(id: number) {
    const res = await api<ApiEnvelope<Rma>>(`/api/admin/rma-requests/${id}/reject`, { method: 'POST' })
    return res.data
  }

  async function resolve(id: number, payload: ResolveRmaPayload) {
    const res = await api<ApiEnvelope<Rma>>(`/api/admin/rma-requests/${id}/resolve`, { method: 'POST', body: payload })
    return res.data
  }

  async function cancel(id: number) {
    const res = await api<ApiEnvelope<Rma>>(`/api/admin/rma-requests/${id}/cancel`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/rma-requests/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, approve, reject, resolve, cancel, remove }
}
