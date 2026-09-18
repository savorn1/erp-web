// Wraps the backend's admin-only SalesOrderController
// (/api/admin/sales-orders/**, requires ROLE_ADMIN). Status moves through
// dedicated actions (submit/approve/cancel) rather than a generic setter —
// approve is where stock availability is actually checked and the order
// becomes eligible for delivery ("Order confirmation").

import type { ApiEnvelope, PageEnvelope, SendDocumentEmailPayload } from '#shared/types'

export type SalesOrderStatus = 'DRAFT' | 'SUBMITTED' | 'CONFIRMED' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'CANCELLED'

export interface SalesOrderLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  quantityOrdered: number
  unitPrice: number
  discountPercent: number
  discountAmount: number
  taxRate: number
  taxAmount: number
  quantityDelivered: number
  lineTotal: number
}

export interface SalesOrder {
  id: number
  companyId: number
  companyName: string | null
  customerId: number
  customerName: string | null
  // Set when this order was converted from an accepted Quotation.
  quotationId: number | null
  warehouseId: number
  warehouseName: string | null
  soNumber: string
  orderDate: string
  expectedDate: string | null
  status: SalesOrderStatus
  notes: string | null
  createdBy: string | null
  // The salesperson credited on this order for commission purposes — see
  // useCommissions. Null means no commission is tracked for this order.
  salesRepUserId: number | null
  salesRepName: string | null
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  // Reference-only — see SalesOrderPayload's own comment.
  foreignCurrency: string | null
  exchangeRate: number | null
  foreignTotalAmount: number | null
  // Only set while status === 'SUBMITTED' — see ApprovalRule. Null once
  // finalized (or if no rule ever applied).
  approvalsRequired: number | null
  approvalsRecorded: number | null
  lines: SalesOrderLine[] | null
}

export interface SalesOrderFilter {
  soNumber?: string
  companyId?: number
  customerId?: number
  warehouseId?: number
  status?: SalesOrderStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface SalesOrderLinePayload {
  productId: number
  quantityOrdered: number
  // Omit to default to the product's own selling price.
  unitPrice?: number
  discountPercent?: number
  // Omit to default to the product's own tax rate.
  taxRate?: number
}

export interface SalesOrderPayload {
  companyId: number
  customerId: number
  warehouseId: number
  orderDate: string
  expectedDate?: string
  notes?: string
  // Optional — see SalesOrder.salesRepUserId.
  salesRepUserId?: number
  // Optional reference-only foreign currency, for display/printing only —
  // never affects totals, GL postings, or payments. Both or neither.
  foreignCurrency?: string
  exchangeRate?: number
  lines: SalesOrderLinePayload[]
}

export function useSalesOrders() {
  const api = useApi()

  function list(filter: SalesOrderFilter = {}) {
    return api<PageEnvelope<SalesOrder>>('/api/admin/sales-orders', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<SalesOrder>>(`/api/admin/sales-orders/${id}`)
    return res.data
  }

  async function create(payload: SalesOrderPayload) {
    const res = await api<ApiEnvelope<SalesOrder>>('/api/admin/sales-orders', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: SalesOrderPayload) {
    const res = await api<ApiEnvelope<SalesOrder>>(`/api/admin/sales-orders/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function submit(id: number) {
    const res = await api<ApiEnvelope<SalesOrder>>(`/api/admin/sales-orders/${id}/submit`, { method: 'POST' })
    return res.data
  }

  async function approve(id: number) {
    const res = await api<ApiEnvelope<SalesOrder>>(`/api/admin/sales-orders/${id}/approve`, { method: 'POST' })
    return res.data
  }

  async function cancel(id: number) {
    const res = await api<ApiEnvelope<SalesOrder>>(`/api/admin/sales-orders/${id}/cancel`, { method: 'POST' })
    return res.data
  }

  // Cancels only the undelivered remainder of one line — only meaningful on
  // a CONFIRMED order. The rest of the order is unaffected.
  async function cancelLine(id: number, lineId: number) {
    const res = await api<ApiEnvelope<SalesOrder>>(`/api/admin/sales-orders/${id}/lines/${lineId}/cancel`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/sales-orders/${id}`, { method: 'DELETE' })
  }

  async function emailDocument(id: number, payload: SendDocumentEmailPayload = {}) {
    await api(`/api/admin/sales-orders/${id}/email`, { method: 'POST', body: payload })
  }

  return { list, get, create, update, submit, approve, cancel, cancelLine, remove, emailDocument }
}
