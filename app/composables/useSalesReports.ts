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

export interface SalesDetailRow {
  orderId: number
  soNumber: string | null
  orderDate: string
  status: string
  customerId: number
  customerName: string | null
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

export interface SalesDetail {
  dateFrom: string | null
  dateTo: string | null
  rows: SalesDetailRow[]
  truncated: boolean
  totalQuantity: number
  totalAmount: number
}

export interface SalesByDateRow {
  date: string
  orderCount: number
  revenue: number
}

export interface SalesByDate {
  dateFrom: string | null
  dateTo: string | null
  rows: SalesByDateRow[]
  totalRevenue: number
}

export interface SalesByCategoryRow {
  categoryId: number | null
  categoryName: string | null
  quantity: number
  revenue: number
}

export interface SalesByCategory {
  dateFrom: string | null
  dateTo: string | null
  rows: SalesByCategoryRow[]
  totalQuantity: number
  totalRevenue: number
}

export interface SalesByCustomerGroupRow {
  customerGroupId: number | null
  customerGroupName: string | null
  orderCount: number
  revenue: number
}

export interface SalesByCustomerGroup {
  dateFrom: string | null
  dateTo: string | null
  rows: SalesByCustomerGroupRow[]
  totalRevenue: number
}

export interface SalesByWarehouseRow {
  warehouseId: number
  warehouseName: string | null
  orderCount: number
  revenue: number
}

export interface SalesByWarehouse {
  dateFrom: string | null
  dateTo: string | null
  rows: SalesByWarehouseRow[]
  totalRevenue: number
}

export interface SalesCancellationRow {
  orderId: number
  soNumber: string | null
  orderDate: string
  customerId: number
  customerName: string | null
  amount: number
}

export interface SalesCancellation {
  dateFrom: string | null
  dateTo: string | null
  rows: SalesCancellationRow[]
  orderCount: number
  totalAmount: number
}

export interface SalesDiscountRow {
  orderId: number
  soNumber: string | null
  orderDate: string
  customerId: number
  customerName: string | null
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  unitPrice: number
  discountPercent: number
  discountAmount: number
}

export interface SalesDiscount {
  dateFrom: string | null
  dateTo: string | null
  rows: SalesDiscountRow[]
  totalDiscountAmount: number
}

export interface SalesOutstandingRow {
  orderId: number
  soNumber: string | null
  orderDate: string
  expectedDate: string | null
  status: string
  customerId: number
  customerName: string | null
  outstandingQuantity: number
  outstandingValue: number
}

export interface SalesOutstanding {
  rows: SalesOutstandingRow[]
  orderCount: number
  totalOutstandingValue: number
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

  async function detail(filter: SalesReportFilter = {}) {
    const res = await api<ApiEnvelope<SalesDetail>>('/api/admin/sales-reports/detail', { query: filter })
    return res.data
  }

  async function byDate(filter: SalesReportFilter = {}) {
    const res = await api<ApiEnvelope<SalesByDate>>('/api/admin/sales-reports/by-date', { query: filter })
    return res.data
  }

  async function byCategory(filter: SalesReportFilter = {}) {
    const res = await api<ApiEnvelope<SalesByCategory>>('/api/admin/sales-reports/by-category', { query: filter })
    return res.data
  }

  async function byCustomerGroup(filter: SalesReportFilter = {}) {
    const res = await api<ApiEnvelope<SalesByCustomerGroup>>('/api/admin/sales-reports/by-customer-group', { query: filter })
    return res.data
  }

  async function byWarehouse(filter: SalesReportFilter = {}) {
    const res = await api<ApiEnvelope<SalesByWarehouse>>('/api/admin/sales-reports/by-warehouse', { query: filter })
    return res.data
  }

  async function cancellations(filter: SalesReportFilter = {}) {
    const res = await api<ApiEnvelope<SalesCancellation>>('/api/admin/sales-reports/cancellations', { query: filter })
    return res.data
  }

  async function discounts(filter: SalesReportFilter = {}) {
    const res = await api<ApiEnvelope<SalesDiscount>>('/api/admin/sales-reports/discounts', { query: filter })
    return res.data
  }

  async function outstanding(filter: Pick<SalesReportFilter, 'companyId'> = {}) {
    const res = await api<ApiEnvelope<SalesOutstanding>>('/api/admin/sales-reports/outstanding', { query: filter })
    return res.data
  }

  return {
    summary,
    byProduct,
    byCustomer,
    bySalesperson,
    detail,
    byDate,
    byCategory,
    byCustomerGroup,
    byWarehouse,
    cancellations,
    discounts,
    outstanding
  }
}
