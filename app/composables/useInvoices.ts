// Wraps the backend's admin-only InvoiceController (/api/admin/invoices/**,
// requires ROLE_ADMIN). Always generated from a source — either a SalesOrder
// (bills the full ordered quantity) or a Delivery (bills only what actually
// shipped) — never created with manual line items. Approving charges the
// customer's balance; cancelling an approved invoice reverses that charge.
// A credit note against an approved invoice credits it back (useCreditNotes).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type InvoiceStatus = 'DRAFT' | 'APPROVED' | 'CANCELLED'
export type InvoicePaymentStatus = 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'

export interface InvoiceLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  unitPrice: number
  discountPercent: number
  discountAmount: number
  taxRate: number
  taxAmount: number
  lineTotal: number
}

export interface Invoice {
  id: number
  companyId: number
  companyName: string | null
  customerId: number
  customerName: string | null
  salesOrderId: number | null
  soNumber: string | null
  deliveryId: number | null
  deliveryNumber: string | null
  invoiceNumber: string
  invoiceDate: string
  dueDate: string | null
  status: InvoiceStatus
  notes: string | null
  createdBy: string | null
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  creditedAmount: number
  paidAmount: number
  outstandingAmount: number
  paymentStatus: InvoicePaymentStatus
  // True once dueDate has passed and outstandingAmount is still > 0.
  overdue: boolean
  // Days past dueDate (0 when not overdue or dueDate is unset).
  daysOverdue: number
  lines: InvoiceLine[] | null
}

export interface InvoiceFilter {
  invoiceNumber?: string
  companyId?: number
  customerId?: number
  salesOrderId?: number
  deliveryId?: number
  status?: InvoiceStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CreateInvoicePayload {
  invoiceDate: string
  dueDate?: string
  notes?: string
}

export interface InvoiceAgingFilter {
  companyId?: number
  customerId?: number
  // Defaults to today when omitted.
  asOfDate?: string
}

export interface InvoiceAgingRow {
  // Null on the report's grand-total row.
  customerId: number | null
  customerName: string | null
  current: number
  days1To30: number
  days31To60: number
  days61To90: number
  days90Plus: number
  total: number
}

export interface InvoiceAgingReport {
  asOfDate: string
  rows: InvoiceAgingRow[]
  totals: InvoiceAgingRow
}

export function useInvoices() {
  const api = useApi()

  function list(filter: InvoiceFilter = {}) {
    return api<PageEnvelope<Invoice>>('/api/admin/invoices', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Invoice>>(`/api/admin/invoices/${id}`)
    return res.data
  }

  async function createFromSalesOrder(salesOrderId: number, payload: CreateInvoicePayload) {
    const res = await api<ApiEnvelope<Invoice>>(`/api/admin/invoices/from-sales-order/${salesOrderId}`, { method: 'POST', body: payload })
    return res.data
  }

  async function createFromDelivery(deliveryId: number, payload: CreateInvoicePayload) {
    const res = await api<ApiEnvelope<Invoice>>(`/api/admin/invoices/from-delivery/${deliveryId}`, { method: 'POST', body: payload })
    return res.data
  }

  async function approve(id: number) {
    const res = await api<ApiEnvelope<Invoice>>(`/api/admin/invoices/${id}/approve`, { method: 'POST' })
    return res.data
  }

  async function cancel(id: number) {
    const res = await api<ApiEnvelope<Invoice>>(`/api/admin/invoices/${id}/cancel`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/invoices/${id}`, { method: 'DELETE' })
  }

  async function agingReport(filter: InvoiceAgingFilter = {}) {
    const res = await api<ApiEnvelope<InvoiceAgingReport>>('/api/admin/invoices/aging', { query: filter })
    return res.data
  }

  return { list, get, createFromSalesOrder, createFromDelivery, approve, cancel, remove, agingReport }
}
