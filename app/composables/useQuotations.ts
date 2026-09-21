// Wraps the backend's admin-only QuotationController (/api/admin/quotations/**,
// requires ROLE_ADMIN). Normally created via useLeads().convertToQuotation
// rather than create() directly. DRAFT -> SENT -> ACCEPTED/REJECTED; only a
// DRAFT quotation can be edited or deleted.

import type { ApiEnvelope, PageEnvelope, SendDocumentEmailPayload } from '#shared/types'
import type { SalesOrder } from '~/composables/useSalesOrders'

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED'

export interface QuotationLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  unitOfMeasureId: number | null
  unitOfMeasureAbbreviation: string | null
  conversionFactor: number
  quantity: number
  // quantity restated in the product's inventory unit.
  baseQuantity: number
  unitPrice: number
  lineTotal: number
}

export interface Quotation {
  id: number
  companyId: number
  companyName: string | null
  // Legacy — predates the Lead/Opportunity merge. leadId is the live linkage.
  opportunityId: number | null
  opportunityName: string | null
  leadId: number | null
  leadName: string | null
  customerId: number | null
  customerName: string | null
  quotationNumber: string
  quotationDate: string
  validUntil: string | null
  status: QuotationStatus
  notes: string | null
  createdBy: string | null
  totalAmount: number
  // Reference-only — see QuotationPayload's own comment.
  foreignCurrency: string | null
  exchangeRate: number | null
  foreignTotalAmount: number | null
  lines: QuotationLine[] | null
}

export interface QuotationFilter {
  quotationNumber?: string
  companyId?: number
  opportunityId?: number
  leadId?: number
  customerId?: number
  status?: QuotationStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface QuotationLinePayload {
  productId: number
  // Omit for the product's own base unit; any other value must already be
  // registered as a sales-allowed ProductUom for this product.
  unitOfMeasureId?: number
  quantity: number
  unitPrice: number
}

export interface QuotationPayload {
  companyId: number
  customerId?: number
  quotationDate: string
  validUntil?: string
  notes?: string
  // Optional reference-only foreign currency, for display/printing only —
  // never affects totals, GL postings, or payments. Both or neither.
  foreignCurrency?: string
  exchangeRate?: number
  lines: QuotationLinePayload[]
}

export interface ConvertQuotationToSalesOrderPayload {
  // Quotation has no warehouse of its own — the sales order needs one.
  warehouseId: number
  orderDate: string
  expectedDate?: string
}

export function useQuotations() {
  const api = useApi()

  function list(filter: QuotationFilter = {}) {
    return api<PageEnvelope<Quotation>>('/api/admin/quotations', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Quotation>>(`/api/admin/quotations/${id}`)
    return res.data
  }

  async function create(payload: QuotationPayload) {
    const res = await api<ApiEnvelope<Quotation>>('/api/admin/quotations', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: Omit<QuotationPayload, 'companyId'>) {
    const res = await api<ApiEnvelope<Quotation>>(`/api/admin/quotations/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function send(id: number) {
    const res = await api<ApiEnvelope<Quotation>>(`/api/admin/quotations/${id}/send`, { method: 'POST' })
    return res.data
  }

  async function accept(id: number) {
    const res = await api<ApiEnvelope<Quotation>>(`/api/admin/quotations/${id}/accept`, { method: 'POST' })
    return res.data
  }

  async function reject(id: number) {
    const res = await api<ApiEnvelope<Quotation>>(`/api/admin/quotations/${id}/reject`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/quotations/${id}`, { method: 'DELETE' })
  }

  async function emailDocument(id: number, payload: SendDocumentEmailPayload = {}) {
    await api(`/api/admin/quotations/${id}/email`, { method: 'POST', body: payload })
  }

  async function convertToSalesOrder(id: number, payload: ConvertQuotationToSalesOrderPayload) {
    const res = await api<ApiEnvelope<SalesOrder>>(`/api/admin/quotations/${id}/convert-to-sales-order`, { method: 'POST', body: payload })
    return res.data
  }

  return { list, get, create, update, send, accept, reject, remove, emailDocument, convertToSalesOrder }
}
