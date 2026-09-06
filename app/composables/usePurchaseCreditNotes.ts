// Wraps the backend's admin-only PurchaseCreditNoteController
// (/api/admin/purchase-credit-notes/**, requires ROLE_ADMIN) — read-only;
// created via usePurchaseInvoices' sibling endpoint
// (POST /api/admin/purchase-invoices/{id}/credit-notes). Mirrors
// useCreditNotes on the accounts-receivable side.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface PurchaseCreditNote {
  id: number
  companyId: number
  purchaseInvoiceId: number
  invoiceNumber: string | null
  supplierId: number
  supplierName: string | null
  creditNoteNumber: string
  creditNoteDate: string
  reason: string | null
  amount: number
  createdBy: string | null
}

export interface PurchaseCreditNoteFilter {
  creditNoteNumber?: string
  companyId?: number
  purchaseInvoiceId?: number
  supplierId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CreatePurchaseCreditNotePayload {
  creditNoteDate: string
  reason?: string
  amount: number
}

export function usePurchaseCreditNotes() {
  const api = useApi()

  function list(filter: PurchaseCreditNoteFilter = {}) {
    return api<PageEnvelope<PurchaseCreditNote>>('/api/admin/purchase-credit-notes', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<PurchaseCreditNote>>(`/api/admin/purchase-credit-notes/${id}`)
    return res.data
  }

  async function create(purchaseInvoiceId: number, payload: CreatePurchaseCreditNotePayload) {
    const res = await api<ApiEnvelope<PurchaseCreditNote>>(`/api/admin/purchase-invoices/${purchaseInvoiceId}/credit-notes`, {
      method: 'POST',
      body: payload
    })
    return res.data
  }

  return { list, get, create }
}
