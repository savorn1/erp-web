// Wraps the backend's admin-only PurchaseReportController
// (/api/admin/purchase-reports/**, requires ROLE_ADMIN). Built from
// PurchaseOrder (booked order-level activity), excluding CANCELLED unless a
// status is explicitly requested — distinct from Accounting's Expense, which
// is invoiced PurchaseInvoice totals.

import type { ApiEnvelope } from '#shared/types'
import type { PurchaseOrderStatus } from '~/composables/usePurchaseOrders'

export interface PurchaseReportFilter {
  companyId?: number
  dateFrom?: string
  dateTo?: string
  status?: PurchaseOrderStatus
}

export interface PurchaseStatusBreakdown {
  status: string
  orderCount: number
  totalAmount: number
}

export interface PurchaseSummary {
  dateFrom: string | null
  dateTo: string | null
  orderCount: number
  totalQuantity: number
  subtotal: number
  discountTotal: number
  taxTotal: number
  totalAmount: number
  averageOrderValue: number
  byStatus: PurchaseStatusBreakdown[]
}

export interface PurchaseBySupplierRow {
  supplierId: number
  supplierName: string | null
  orderCount: number
  amount: number
}

export interface PurchaseBySupplier {
  dateFrom: string | null
  dateTo: string | null
  rows: PurchaseBySupplierRow[]
  totalAmount: number
}

export interface PurchaseByProductRow {
  productId: number
  productSku: string | null
  productName: string | null
  quantity: number
  amount: number
}

export interface PurchaseByProduct {
  dateFrom: string | null
  dateTo: string | null
  rows: PurchaseByProductRow[]
  totalQuantity: number
  totalAmount: number
}

export function usePurchaseReports() {
  const api = useApi()

  async function summary(filter: PurchaseReportFilter = {}) {
    const res = await api<ApiEnvelope<PurchaseSummary>>('/api/admin/purchase-reports/summary', { query: filter })
    return res.data
  }

  async function bySupplier(filter: PurchaseReportFilter = {}) {
    const res = await api<ApiEnvelope<PurchaseBySupplier>>('/api/admin/purchase-reports/by-supplier', { query: filter })
    return res.data
  }

  async function byProduct(filter: PurchaseReportFilter = {}) {
    const res = await api<ApiEnvelope<PurchaseByProduct>>('/api/admin/purchase-reports/by-product', { query: filter })
    return res.data
  }

  return { summary, bySupplier, byProduct }
}
