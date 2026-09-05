// Wraps the backend's admin-only CreditNoteController
// (/api/admin/credit-notes/**, read-only) plus the create action which lives
// on InvoiceController (POST /api/admin/invoices/{id}/credit-notes) since a
// credit note always corrects a specific invoice. Issuing one immediately
// credits the customer's balance — no draft/approve step, same "create =
// immediate effect" reasoning as GoodsReceipt/Delivery.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface CreditNote {
  id: number
  companyId: number
  invoiceId: number
  invoiceNumber: string | null
  customerId: number
  customerName: string | null
  creditNoteNumber: string
  creditNoteDate: string
  reason: string | null
  amount: number
  createdBy: string | null
}

export interface CreditNoteFilter {
  creditNoteNumber?: string
  companyId?: number
  invoiceId?: number
  customerId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CreateCreditNotePayload {
  creditNoteDate: string
  reason?: string
  amount: number
}

export function useCreditNotes() {
  const api = useApi()

  function list(filter: CreditNoteFilter = {}) {
    return api<PageEnvelope<CreditNote>>('/api/admin/credit-notes', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<CreditNote>>(`/api/admin/credit-notes/${id}`)
    return res.data
  }

  async function create(invoiceId: number, payload: CreateCreditNotePayload) {
    const res = await api<ApiEnvelope<CreditNote>>(`/api/admin/invoices/${invoiceId}/credit-notes`, { method: 'POST', body: payload })
    return res.data
  }

  return { list, get, create }
}
