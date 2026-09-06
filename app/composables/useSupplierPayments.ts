// Wraps the backend's admin-only SupplierPaymentController
// (/api/admin/supplier-payments/**, requires ROLE_ADMIN). Recording a payment
// (or issuing a refund) is an immutable ledger entry — no update/delete —
// and immediately adjusts the supplier's balance. A payment's own detail
// (get()) doubles as its receipt. Mirrors usePayments on the
// accounts-receivable side.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type SupplierPaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'PAYMENT_GATEWAY'
export type SupplierPaymentType = 'PAYMENT' | 'REFUND'

export interface SupplierPaymentAllocation {
  id: number
  purchaseInvoiceId: number
  invoiceNumber: string | null
  // Signed — positive for a payment, negative for a refund.
  amount: number
}

export interface SupplierPayment {
  id: number
  companyId: number
  companyName: string | null
  supplierId: number
  supplierName: string | null
  paymentNumber: string
  paymentDate: string
  type: SupplierPaymentType
  method: SupplierPaymentMethod
  amount: number
  reference: string | null
  notes: string | null
  createdBy: string | null
  relatedPaymentId: number | null
  relatedPaymentNumber: string | null
  refundedAmount: number | null
  allocations: SupplierPaymentAllocation[] | null
}

export interface SupplierPaymentFilter {
  paymentNumber?: string
  companyId?: number
  supplierId?: number
  method?: SupplierPaymentMethod
  type?: SupplierPaymentType
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface SupplierPaymentAllocationPayload {
  purchaseInvoiceId: number
  amount: number
}

export interface RecordSupplierPaymentPayload {
  companyId: number
  supplierId: number
  paymentDate: string
  method: SupplierPaymentMethod
  reference?: string
  notes?: string
  allocations: SupplierPaymentAllocationPayload[]
}

export interface RefundSupplierPaymentPayload {
  refundDate: string
  amount: number
  reason?: string
}

export function useSupplierPayments() {
  const api = useApi()

  function list(filter: SupplierPaymentFilter = {}) {
    return api<PageEnvelope<SupplierPayment>>('/api/admin/supplier-payments', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<SupplierPayment>>(`/api/admin/supplier-payments/${id}`)
    return res.data
  }

  async function record(payload: RecordSupplierPaymentPayload) {
    const res = await api<ApiEnvelope<SupplierPayment>>('/api/admin/supplier-payments', { method: 'POST', body: payload })
    return res.data
  }

  async function refund(id: number, payload: RefundSupplierPaymentPayload) {
    const res = await api<ApiEnvelope<SupplierPayment>>(`/api/admin/supplier-payments/${id}/refund`, { method: 'POST', body: payload })
    return res.data
  }

  return { list, get, record, refund }
}
