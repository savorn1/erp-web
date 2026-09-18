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
  // Only consumed by supplierPerformance() — filters which row is returned,
  // not which orders feed its cross-supplier price benchmark.
  supplierId?: number
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

export interface PurchaseDetailRow {
  orderId: number
  poNumber: string | null
  orderDate: string
  status: string
  supplierId: number
  supplierName: string | null
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

export interface PurchaseDetail {
  dateFrom: string | null
  dateTo: string | null
  rows: PurchaseDetailRow[]
  truncated: boolean
  totalQuantity: number
  totalAmount: number
}

export interface PurchaseByDateRow {
  date: string
  orderCount: number
  amount: number
}

export interface PurchaseByDate {
  dateFrom: string | null
  dateTo: string | null
  rows: PurchaseByDateRow[]
  totalAmount: number
}

export interface PurchaseByCategoryRow {
  categoryId: number | null
  categoryName: string | null
  quantity: number
  amount: number
}

export interface PurchaseByCategory {
  dateFrom: string | null
  dateTo: string | null
  rows: PurchaseByCategoryRow[]
  totalQuantity: number
  totalAmount: number
}

export interface PurchaseByBrandRow {
  brandId: number | null
  brandName: string | null
  quantity: number
  amount: number
}

export interface PurchaseByBrand {
  dateFrom: string | null
  dateTo: string | null
  rows: PurchaseByBrandRow[]
  totalQuantity: number
  totalAmount: number
}

export interface PurchaseByUomRow {
  uomId: number | null
  uomName: string | null
  quantity: number
  amount: number
}

export interface PurchaseByUom {
  dateFrom: string | null
  dateTo: string | null
  rows: PurchaseByUomRow[]
  totalAmount: number
}

export interface PurchaseBySupplierTypeRow {
  supplierTypeId: number | null
  supplierTypeName: string | null
  orderCount: number
  amount: number
}

export interface PurchaseBySupplierType {
  dateFrom: string | null
  dateTo: string | null
  rows: PurchaseBySupplierTypeRow[]
  totalAmount: number
}

export interface PurchaseByWarehouseRow {
  warehouseId: number
  warehouseName: string | null
  orderCount: number
  amount: number
}

export interface PurchaseByWarehouse {
  dateFrom: string | null
  dateTo: string | null
  rows: PurchaseByWarehouseRow[]
  totalAmount: number
}

export interface PurchasePendingOrderRow {
  orderId: number
  poNumber: string | null
  orderDate: string
  status: string
  supplierId: number
  supplierName: string | null
  amount: number
}

export interface PurchasePendingOrders {
  rows: PurchasePendingOrderRow[]
  orderCount: number
  totalAmount: number
}

export interface PurchasePendingGoodsReceiptRow {
  receiptId: number
  receiptNumber: string | null
  receiptDate: string
  purchaseOrderId: number
  poNumber: string | null
  supplierId: number | null
  supplierName: string | null
  warehouseId: number
  warehouseName: string | null
  lineCount: number
}

export interface PurchasePendingGoodsReceipts {
  rows: PurchasePendingGoodsReceiptRow[]
  receiptCount: number
}

export interface PurchaseOutstandingInvoiceRow {
  invoiceId: number
  invoiceNumber: string | null
  invoiceDate: string
  dueDate: string | null
  daysOverdue: number
  supplierId: number
  supplierName: string | null
  totalAmount: number
  outstandingAmount: number
}

export interface PurchaseOutstandingInvoices {
  rows: PurchaseOutstandingInvoiceRow[]
  invoiceCount: number
  totalOutstanding: number
}

export interface PurchaseCancellationRow {
  orderId: number
  poNumber: string | null
  orderDate: string
  supplierId: number
  supplierName: string | null
  amount: number
}

export interface PurchaseCancellation {
  dateFrom: string | null
  dateTo: string | null
  rows: PurchaseCancellationRow[]
  orderCount: number
  totalAmount: number
}

export interface PurchaseDiscountRow {
  orderId: number
  poNumber: string | null
  orderDate: string
  supplierId: number
  supplierName: string | null
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  unitCost: number
  discountPercent: number
  discountAmount: number
}

export interface PurchaseDiscount {
  dateFrom: string | null
  dateTo: string | null
  rows: PurchaseDiscountRow[]
  totalDiscountAmount: number
}

export interface PurchaseByPeriodRow {
  period: string
  orderCount: number
  amount: number
}

export interface PurchaseByPeriod {
  dateFrom: string | null
  dateTo: string | null
  rows: PurchaseByPeriodRow[]
  totalAmount: number
}

export interface SupplierPriceHistoryRow {
  orderDate: string
  poNumber: string | null
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  unitCost: number
}

export interface SupplierPriceHistory {
  supplierId: number | null
  supplierName: string | null
  dateFrom: string | null
  dateTo: string | null
  rows: SupplierPriceHistoryRow[]
}

export interface ProductPurchasePriceHistoryRow {
  orderDate: string
  poNumber: string | null
  supplierId: number
  supplierName: string | null
  quantity: number
  unitCost: number
}

export interface ProductPurchasePriceHistory {
  productId: number | null
  productName: string | null
  productSku: string | null
  dateFrom: string | null
  dateTo: string | null
  rows: ProductPurchasePriceHistoryRow[]
}

export interface SupplierPerformanceRow {
  supplierId: number
  supplierName: string | null
  orderCount: number
  measurableOrderCount: number
  onTimeOrderCount: number
  onTimePercent: number | null
  averageDelayDays: number | null
  // PASSED / (PASSED + FAILED) across this supplier's quality-checked
  // goods-receipt lines. Null when none have been checked yet.
  qualityPassPercent: number | null
  // Quantity-weighted average % deviation from the cross-supplier price
  // benchmark, across only products shared with another supplier in the
  // filtered period. Positive = above market average. Null when no
  // comparable products exist.
  priceVariancePercent: number | null
}

export interface SupplierPerformance {
  dateFrom: string | null
  dateTo: string | null
  rows: SupplierPerformanceRow[]
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

  async function detail(filter: PurchaseReportFilter = {}) {
    const res = await api<ApiEnvelope<PurchaseDetail>>('/api/admin/purchase-reports/detail', { query: filter })
    return res.data
  }

  async function byDate(filter: PurchaseReportFilter = {}) {
    const res = await api<ApiEnvelope<PurchaseByDate>>('/api/admin/purchase-reports/by-date', { query: filter })
    return res.data
  }

  async function byCategory(filter: PurchaseReportFilter = {}) {
    const res = await api<ApiEnvelope<PurchaseByCategory>>('/api/admin/purchase-reports/by-category', { query: filter })
    return res.data
  }

  async function byBrand(filter: PurchaseReportFilter = {}) {
    const res = await api<ApiEnvelope<PurchaseByBrand>>('/api/admin/purchase-reports/by-brand', { query: filter })
    return res.data
  }

  async function byUom(filter: PurchaseReportFilter = {}) {
    const res = await api<ApiEnvelope<PurchaseByUom>>('/api/admin/purchase-reports/by-uom', { query: filter })
    return res.data
  }

  async function bySupplierType(filter: PurchaseReportFilter = {}) {
    const res = await api<ApiEnvelope<PurchaseBySupplierType>>('/api/admin/purchase-reports/by-supplier-type', { query: filter })
    return res.data
  }

  async function byWarehouse(filter: PurchaseReportFilter = {}) {
    const res = await api<ApiEnvelope<PurchaseByWarehouse>>('/api/admin/purchase-reports/by-warehouse', { query: filter })
    return res.data
  }

  async function pendingOrders(filter: PurchaseReportFilter = {}) {
    const res = await api<ApiEnvelope<PurchasePendingOrders>>('/api/admin/purchase-reports/pending-orders', { query: filter })
    return res.data
  }

  async function pendingGoodsReceipts(filter: Pick<PurchaseReportFilter, 'companyId' | 'dateFrom' | 'dateTo'> = {}) {
    const res = await api<ApiEnvelope<PurchasePendingGoodsReceipts>>('/api/admin/purchase-reports/pending-goods-receipts', { query: filter })
    return res.data
  }

  async function outstandingInvoices(filter: Pick<PurchaseReportFilter, 'companyId' | 'dateFrom' | 'dateTo'> = {}) {
    const res = await api<ApiEnvelope<PurchaseOutstandingInvoices>>('/api/admin/purchase-reports/outstanding-invoices', { query: filter })
    return res.data
  }

  async function cancellations(filter: Pick<PurchaseReportFilter, 'companyId' | 'dateFrom' | 'dateTo'> = {}) {
    const res = await api<ApiEnvelope<PurchaseCancellation>>('/api/admin/purchase-reports/cancellations', { query: filter })
    return res.data
  }

  async function discounts(filter: PurchaseReportFilter = {}) {
    const res = await api<ApiEnvelope<PurchaseDiscount>>('/api/admin/purchase-reports/discounts', { query: filter })
    return res.data
  }

  async function monthly(filter: PurchaseReportFilter = {}) {
    const res = await api<ApiEnvelope<PurchaseByPeriod>>('/api/admin/purchase-reports/monthly', { query: filter })
    return res.data
  }

  async function yearly(filter: PurchaseReportFilter = {}) {
    const res = await api<ApiEnvelope<PurchaseByPeriod>>('/api/admin/purchase-reports/yearly', { query: filter })
    return res.data
  }

  async function supplierPriceHistory(filter: { companyId?: number; supplierId?: number; dateFrom?: string; dateTo?: string } = {}) {
    const res = await api<ApiEnvelope<SupplierPriceHistory>>('/api/admin/purchase-reports/supplier-price-history', { query: filter })
    return res.data
  }

  async function productPriceHistory(filter: { companyId?: number; productId?: number; dateFrom?: string; dateTo?: string } = {}) {
    const res = await api<ApiEnvelope<ProductPurchasePriceHistory>>('/api/admin/purchase-reports/product-price-history', { query: filter })
    return res.data
  }

  async function supplierPerformance(filter: PurchaseReportFilter = {}) {
    const res = await api<ApiEnvelope<SupplierPerformance>>('/api/admin/purchase-reports/supplier-performance', { query: filter })
    return res.data
  }

  return {
    summary,
    bySupplier,
    byProduct,
    detail,
    byDate,
    byCategory,
    byBrand,
    byUom,
    bySupplierType,
    byWarehouse,
    pendingOrders,
    pendingGoodsReceipts,
    outstandingInvoices,
    cancellations,
    discounts,
    monthly,
    yearly,
    supplierPriceHistory,
    productPriceHistory,
    supplierPerformance
  }
}
