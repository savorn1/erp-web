// Wraps the backend's admin-only PosSaleController (/api/admin/pos-sales/**).
// checkout() is atomic: cart lines + tenders go in, a completed sale (with
// stock already decremented and, if PostingRule is mapped, the GL already
// posted) comes back — no draft state, unlike every other document in this
// app.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type PosSaleStatus = 'COMPLETED' | 'VOIDED'
export type PosTenderMethod = 'CASH' | 'BANK_TRANSFER' | 'PAYMENT_GATEWAY' | 'CARD'

export interface PosSaleLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  unitPrice: number
  discountPercent: number
  taxRate: number
  lineTotal: number
  returnedQuantity: number
}

export interface PosPaymentLine {
  id: number
  method: PosTenderMethod
  amount: number
  reference: string | null
}

export interface PosSale {
  id: number
  companyId: number
  warehouseId: number
  warehouseName: string | null
  registerId: number
  registerName: string | null
  posSessionId: number
  customerId: number
  customerName: string | null
  saleNumber: string
  saleDate: string
  subtotal: number
  discountAmount: number
  taxAmount: number
  totalAmount: number
  status: PosSaleStatus
  voidedBy: string | null
  voidedAt: string | null
  voidReason: string | null
  createdBy: string | null
  lines: PosSaleLine[]
  payments: PosPaymentLine[]
  changeDue: number | null
}

export interface PosSaleFilter {
  saleNumber?: string
  companyId?: number
  registerId?: number
  posSessionId?: number
  status?: PosSaleStatus
  // Inclusive range over saleDate's date component, e.g. "2026-09-15" for
  // both — used by the POS dashboard's "today" view.
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface PosCheckoutLinePayload {
  productId: number
  quantity: number
  discountPercent?: number
}

export interface PosTenderPayload {
  method: PosTenderMethod
  amount: number
  reference?: string
}

export interface PosCheckoutPayload {
  posSessionId: number
  customerId?: number
  lines: PosCheckoutLinePayload[]
  tenders: PosTenderPayload[]
}

export function usePosSales() {
  const api = useApi()

  function list(filter: PosSaleFilter = {}) {
    return api<PageEnvelope<PosSale>>('/api/admin/pos-sales', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<PosSale>>(`/api/admin/pos-sales/${id}`)
    return res.data
  }

  async function checkout(payload: PosCheckoutPayload) {
    const res = await api<ApiEnvelope<PosSale>>('/api/admin/pos-sales/checkout', { method: 'POST', body: payload })
    return res.data
  }

  async function voidSale(id: number, reason?: string) {
    const res = await api<ApiEnvelope<PosSale>>(`/api/admin/pos-sales/${id}/void`, { method: 'POST', body: { reason } })
    return res.data
  }

  return { list, get, checkout, voidSale }
}
