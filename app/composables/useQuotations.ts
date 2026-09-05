// Wraps the backend's admin-only QuotationController (/api/admin/quotations/**,
// requires ROLE_ADMIN). Normally created via useOpportunities().convertToQuotation
// rather than create() directly. DRAFT -> SENT -> ACCEPTED/REJECTED; only a
// DRAFT quotation can be edited or deleted.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type QuotationStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED'

export interface QuotationLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface Quotation {
  id: number
  companyId: number
  companyName: string | null
  opportunityId: number | null
  opportunityName: string | null
  customerId: number | null
  customerName: string | null
  quotationNumber: string
  quotationDate: string
  validUntil: string | null
  status: QuotationStatus
  notes: string | null
  createdBy: string | null
  totalAmount: number
  lines: QuotationLine[] | null
}

export interface QuotationFilter {
  quotationNumber?: string
  companyId?: number
  opportunityId?: number
  customerId?: number
  status?: QuotationStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface QuotationLinePayload {
  productId: number
  quantity: number
  unitPrice: number
}

export interface QuotationPayload {
  companyId: number
  customerId?: number
  quotationDate: string
  validUntil?: string
  notes?: string
  lines: QuotationLinePayload[]
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

  return { list, get, create, update, send, accept, reject, remove }
}
