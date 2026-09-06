// Wraps the backend's admin-only PurchaseRequestController
// (/api/admin/purchase-requests/**, requires ROLE_ADMIN). The internal ask a
// department makes before any supplier is involved — upstream of Rfq and
// PurchaseOrder. DRAFT -> SUBMITTED -> APPROVED/REJECTED; only a DRAFT
// request can be edited or deleted.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type PurchaseRequestStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export interface PurchaseRequestLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  notes: string | null
}

export interface PurchaseRequest {
  id: number
  companyId: number
  companyName: string | null
  departmentId: number
  departmentName: string | null
  requestNumber: string
  requestDate: string
  requiredDate: string | null
  status: PurchaseRequestStatus
  notes: string | null
  rejectionReason: string | null
  requestedBy: string | null
  lines: PurchaseRequestLine[] | null
}

export interface PurchaseRequestFilter {
  requestNumber?: string
  companyId?: number
  departmentId?: number
  status?: PurchaseRequestStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface PurchaseRequestLinePayload {
  productId: number
  quantity: number
  notes?: string
}

export interface PurchaseRequestPayload {
  companyId: number
  departmentId: number
  requestDate: string
  requiredDate?: string
  notes?: string
  lines: PurchaseRequestLinePayload[]
}

export function usePurchaseRequests() {
  const api = useApi()

  function list(filter: PurchaseRequestFilter = {}) {
    return api<PageEnvelope<PurchaseRequest>>('/api/admin/purchase-requests', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<PurchaseRequest>>(`/api/admin/purchase-requests/${id}`)
    return res.data
  }

  async function create(payload: PurchaseRequestPayload) {
    const res = await api<ApiEnvelope<PurchaseRequest>>('/api/admin/purchase-requests', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: Omit<PurchaseRequestPayload, 'companyId'>) {
    const res = await api<ApiEnvelope<PurchaseRequest>>(`/api/admin/purchase-requests/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function submit(id: number) {
    const res = await api<ApiEnvelope<PurchaseRequest>>(`/api/admin/purchase-requests/${id}/submit`, { method: 'POST' })
    return res.data
  }

  async function approve(id: number) {
    const res = await api<ApiEnvelope<PurchaseRequest>>(`/api/admin/purchase-requests/${id}/approve`, { method: 'POST' })
    return res.data
  }

  async function reject(id: number, reason?: string) {
    const res = await api<ApiEnvelope<PurchaseRequest>>(`/api/admin/purchase-requests/${id}/reject`, { method: 'POST', body: { reason } })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/purchase-requests/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, submit, approve, reject, remove }
}
