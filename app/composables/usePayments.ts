// Wraps the backend's admin-only PaymentController (/api/admin/payments/**,
// requires ROLE_ADMIN). Recording a payment (or issuing a refund) is an
// immutable ledger entry — no update/delete — and immediately adjusts the
// customer's balance. A payment's own detail (get()) doubles as its receipt.

export type PaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'PAYMENT_GATEWAY'
export type PaymentType = 'PAYMENT' | 'REFUND'

export interface PaymentAllocation {
  id: number
  invoiceId: number
  invoiceNumber: string | null
  // Signed — positive for a payment, negative for a refund.
  amount: number
}

export interface Payment {
  id: number
  companyId: number
  companyName: string | null
  customerId: number
  customerName: string | null
  paymentNumber: string
  paymentDate: string
  type: PaymentType
  method: PaymentMethod
  amount: number
  reference: string | null
  notes: string | null
  createdBy: string | null
  relatedPaymentId: number | null
  relatedPaymentNumber: string | null
  refundedAmount: number | null
  allocations: PaymentAllocation[] | null
}

export interface PaymentFilter {
  paymentNumber?: string
  companyId?: number
  customerId?: number
  method?: PaymentMethod
  type?: PaymentType
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface PaymentAllocationPayload {
  invoiceId: number
  amount: number
}

export interface RecordPaymentPayload {
  companyId: number
  customerId: number
  paymentDate: string
  method: PaymentMethod
  reference?: string
  notes?: string
  allocations: PaymentAllocationPayload[]
}

export interface RefundPaymentPayload {
  refundDate: string
  amount: number
  reason?: string
}

interface ApiEnvelope<T> {
  traceId: string
  statusCode: number
  message: string
  data: T
}

interface PageEnvelope<T> {
  traceId: string
  statusCode: number
  message: string
  data: T[]
  metadata: { hasNext: boolean; hasPrev: boolean; totalPage: number; currentPage: number; limit: number; totalCount: number }
}

export function usePayments() {
  const api = useApi()

  function list(filter: PaymentFilter = {}) {
    return api<PageEnvelope<Payment>>('/api/admin/payments', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Payment>>(`/api/admin/payments/${id}`)
    return res.data
  }

  async function record(payload: RecordPaymentPayload) {
    const res = await api<ApiEnvelope<Payment>>('/api/admin/payments', { method: 'POST', body: payload })
    return res.data
  }

  async function refund(id: number, payload: RefundPaymentPayload) {
    const res = await api<ApiEnvelope<Payment>>(`/api/admin/payments/${id}/refund`, { method: 'POST', body: payload })
    return res.data
  }

  return { list, get, record, refund }
}
