// Wraps the backend's admin-only PurchaseInvoiceController
// (/api/admin/purchase-invoices/**, requires ROLE_ADMIN). A supplier bill —
// generated either from a PurchaseOrder (bills the full ordered quantity, a
// 2-way match) or from a GoodsReceipt (bills only what passed quality check
// on that receipt, a 3-way match) — never created with manual line items.
// Approving charges the supplier's balance; a purchase credit note against an
// approved invoice credits it back (usePurchaseCreditNotes), and a supplier
// payment against it pays it down (useSupplierPayments).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type PurchaseInvoiceStatus = 'DRAFT' | 'APPROVED' | 'CANCELLED'

export interface PurchaseInvoiceLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  unitCost: number
  discountPercent: number
  discountAmount: number
  taxRate: number
  taxAmount: number
  lineTotal: number
}

export interface PurchaseInvoice {
  id: number
  companyId: number
  companyName: string | null
  supplierId: number
  supplierName: string | null
  purchaseOrderId: number
  poNumber: string | null
  goodsReceiptId: number | null
  receiptNumber: string | null
  invoiceNumber: string
  invoiceDate: string
  dueDate: string | null
  status: PurchaseInvoiceStatus
  notes: string | null
  createdBy: string | null
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  creditedAmount: number
  paidAmount: number
  outstandingAmount: number
  paymentStatus: 'UNPAID' | 'PARTIALLY_PAID' | 'PAID'
  // True once dueDate has passed and outstandingAmount is still > 0.
  overdue: boolean
  // Days past dueDate (0 when not overdue or dueDate is unset).
  daysOverdue: number
  lines: PurchaseInvoiceLine[] | null
}

export interface PurchaseInvoiceFilter {
  invoiceNumber?: string
  companyId?: number
  supplierId?: number
  purchaseOrderId?: number
  goodsReceiptId?: number
  status?: PurchaseInvoiceStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CreatePurchaseInvoicePayload {
  invoiceDate: string
  dueDate?: string
  notes?: string
}

export interface PurchaseInvoiceAgingFilter {
  companyId?: number
  supplierId?: number
  // Defaults to today when omitted.
  asOfDate?: string
}

export interface PurchaseInvoiceAgingRow {
  // Null on the report's grand-total row.
  supplierId: number | null
  supplierName: string | null
  current: number
  days1To30: number
  days31To60: number
  days61To90: number
  days90Plus: number
  total: number
}

export interface PurchaseInvoiceAgingReport {
  asOfDate: string
  rows: PurchaseInvoiceAgingRow[]
  totals: PurchaseInvoiceAgingRow
}

export function usePurchaseInvoices() {
  const api = useApi()

  function list(filter: PurchaseInvoiceFilter = {}) {
    return api<PageEnvelope<PurchaseInvoice>>('/api/admin/purchase-invoices', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<PurchaseInvoice>>(`/api/admin/purchase-invoices/${id}`)
    return res.data
  }

  async function createFromPurchaseOrder(purchaseOrderId: number, payload: CreatePurchaseInvoicePayload) {
    const res = await api<ApiEnvelope<PurchaseInvoice>>(`/api/admin/purchase-invoices/from-purchase-order/${purchaseOrderId}`, {
      method: 'POST',
      body: payload
    })
    return res.data
  }

  async function createFromGoodsReceipt(goodsReceiptId: number, payload: CreatePurchaseInvoicePayload) {
    const res = await api<ApiEnvelope<PurchaseInvoice>>(`/api/admin/purchase-invoices/from-goods-receipt/${goodsReceiptId}`, {
      method: 'POST',
      body: payload
    })
    return res.data
  }

  async function approve(id: number) {
    const res = await api<ApiEnvelope<PurchaseInvoice>>(`/api/admin/purchase-invoices/${id}/approve`, { method: 'POST' })
    return res.data
  }

  async function cancel(id: number) {
    const res = await api<ApiEnvelope<PurchaseInvoice>>(`/api/admin/purchase-invoices/${id}/cancel`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/purchase-invoices/${id}`, { method: 'DELETE' })
  }

  async function agingReport(filter: PurchaseInvoiceAgingFilter = {}) {
    const res = await api<ApiEnvelope<PurchaseInvoiceAgingReport>>('/api/admin/purchase-invoices/aging', { query: filter })
    return res.data
  }

  return { list, get, createFromPurchaseOrder, createFromGoodsReceipt, approve, cancel, remove, agingReport }
}
