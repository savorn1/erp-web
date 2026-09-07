// Wraps the backend's admin-only SalesReportController
// (/api/admin/sales-reports/**, requires ROLE_ADMIN). Built from SalesOrder
// (booked order-level activity), excluding CANCELLED unless a status is
// explicitly requested — distinct from Accounting's Revenue, which is
// invoiced Invoice totals. "Salesperson" is whoever created the order
// (SalesOrder.createdBy) — there's no dedicated sales-rep assignment
// anywhere in the schema.

import type { ApiEnvelope } from '#shared/types'
import type { SalesOrderStatus } from '~/composables/useSalesOrders'

export interface SalesReportFilter {
  companyId?: number
  dateFrom?: string
  dateTo?: string
  status?: SalesOrderStatus
}

export interface SalesStatusBreakdown {
  status: string
  orderCount: number
  totalAmount: number
}

export interface SalesSummary {
  dateFrom: string | null
  dateTo: string | null
  orderCount: number
  totalQuantity: number
  subtotal: number
  discountTotal: number
  taxTotal: number
  totalAmount: number
  averageOrderValue: number
  byStatus: SalesStatusBreakdown[]
}

export interface SalesByProductRow {
  productId: number
  productSku: string | null
  productName: string | null
  quantity: number
  revenue: number
}

export interface SalesByProduct {
  dateFrom: string | null
  dateTo: string | null
  rows: SalesByProductRow[]
  totalQuantity: number
  totalRevenue: number
}

export interface SalesByCustomerRow {
  customerId: number
  customerName: string | null
  orderCount: number
  revenue: number
}

export interface SalesByCustomer {
  dateFrom: string | null
  dateTo: string | null
  rows: SalesByCustomerRow[]
  totalRevenue: number
}

export interface SalesBySalespersonRow {
  salesperson: string
  orderCount: number
  revenue: number
}

export interface SalesBySalesperson {
  dateFrom: string | null
  dateTo: string | null
  rows: SalesBySalespersonRow[]
  totalRevenue: number
}

export function useSalesReports() {
  const api = useApi()

  async function summary(filter: SalesReportFilter = {}) {
    const res = await api<ApiEnvelope<SalesSummary>>('/api/admin/sales-reports/summary', { query: filter })
    return res.data
  }

  async function byProduct(filter: SalesReportFilter = {}) {
    const res = await api<ApiEnvelope<SalesByProduct>>('/api/admin/sales-reports/by-product', { query: filter })
    return res.data
  }

  async function byCustomer(filter: SalesReportFilter = {}) {
    const res = await api<ApiEnvelope<SalesByCustomer>>('/api/admin/sales-reports/by-customer', { query: filter })
    return res.data
  }

  async function bySalesperson(filter: SalesReportFilter = {}) {
    const res = await api<ApiEnvelope<SalesBySalesperson>>('/api/admin/sales-reports/by-salesperson', { query: filter })
    return res.data
  }

  return { summary, byProduct, byCustomer, bySalesperson }
}
