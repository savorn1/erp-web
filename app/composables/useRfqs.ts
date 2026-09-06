// Wraps the backend's admin-only RfqController (/api/admin/rfqs/**, requires
// ROLE_ADMIN). A request for quotation sent to one or more suppliers for the
// same set of products — each invited supplier's quoted prices are recorded
// manually (there's no supplier-facing portal) and can then be compared
// side by side. Selecting a winning supplier drafts a DRAFT PurchaseOrder
// from their quoted lines. DRAFT -> SENT -> CLOSED (awarded); only a DRAFT
// RFQ can be edited or deleted; DRAFT/SENT can be cancelled.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type RfqStatus = 'DRAFT' | 'SENT' | 'CLOSED' | 'CANCELLED'
export type RfqSupplierStatus = 'PENDING' | 'QUOTED'

export interface RfqLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
}

export interface RfqQuotationLine {
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  // Null until this supplier has quoted this product.
  unitPrice: number | null
  lineTotal: number | null
}

export interface RfqSupplierQuote {
  supplierId: number
  supplierName: string | null
  status: RfqSupplierStatus
  // Null until every line has been quoted.
  quotedTotal: number | null
  lines: RfqQuotationLine[]
}

export interface Rfq {
  id: number
  companyId: number
  companyName: string | null
  warehouseId: number
  warehouseName: string | null
  purchaseRequestId: number | null
  purchaseRequestNumber: string | null
  rfqNumber: string
  issueDate: string
  status: RfqStatus
  notes: string | null
  createdBy: string | null
  awardedSupplierId: number | null
  awardedSupplierName: string | null
  awardedPurchaseOrderId: number | null
  awardedPurchaseOrderNumber: string | null
  lines: RfqLine[] | null
  suppliers: RfqSupplierQuote[] | null
}

export interface RfqFilter {
  rfqNumber?: string
  companyId?: number
  warehouseId?: number
  status?: RfqStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface RfqLinePayload {
  productId: number
  quantity: number
}

export interface RfqPayload {
  companyId: number
  warehouseId: number
  purchaseRequestId?: number
  issueDate: string
  notes?: string
  supplierIds: number[]
  lines: RfqLinePayload[]
}

export interface RfqQuotationLinePayload {
  productId: number
  unitPrice: number
}

export function useRfqs() {
  const api = useApi()

  function list(filter: RfqFilter = {}) {
    return api<PageEnvelope<Rfq>>('/api/admin/rfqs', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Rfq>>(`/api/admin/rfqs/${id}`)
    return res.data
  }

  async function create(payload: RfqPayload) {
    const res = await api<ApiEnvelope<Rfq>>('/api/admin/rfqs', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: Omit<RfqPayload, 'companyId' | 'purchaseRequestId'>) {
    const res = await api<ApiEnvelope<Rfq>>(`/api/admin/rfqs/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function send(id: number) {
    const res = await api<ApiEnvelope<Rfq>>(`/api/admin/rfqs/${id}/send`, { method: 'POST' })
    return res.data
  }

  async function recordQuotation(id: number, supplierId: number, lines: RfqQuotationLinePayload[]) {
    const res = await api<ApiEnvelope<Rfq>>(`/api/admin/rfqs/${id}/suppliers/${supplierId}/quotation`, { method: 'POST', body: { lines } })
    return res.data
  }

  async function selectSupplier(id: number, supplierId: number) {
    const res = await api<ApiEnvelope<Rfq>>(`/api/admin/rfqs/${id}/suppliers/${supplierId}/select`, { method: 'POST' })
    return res.data
  }

  async function cancel(id: number) {
    const res = await api<ApiEnvelope<Rfq>>(`/api/admin/rfqs/${id}/cancel`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/rfqs/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, send, recordQuotation, selectSupplier, cancel, remove }
}
