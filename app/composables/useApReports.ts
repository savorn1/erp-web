// Wraps the backend's admin-only ApReportController (/api/admin/ap-reports/**,
// requires ROLE_ADMIN). Computed fresh from PurchaseInvoice/PurchaseInvoiceLine/
// PurchaseCreditNote/SupplierPaymentAllocation — the same source
// usePurchaseInvoices().agingReport() uses — rather than the maintained-but-
// separate Supplier.currentBalance cache. Mirrors useArReports.ts exactly,
// for the payables side.

import type { ApiEnvelope } from '#shared/types'

export interface ApReportFilter {
  companyId?: number
  supplierId?: number
  asOfDate?: string
  dateFrom?: string
  dateTo?: string
}

export interface ApSummary {
  asOfDate: string
  totalOutstanding: number
  totalOverdue: number
  invoiceCount: number
  supplierCount: number
  overdueInvoiceCount: number
  overdueSupplierCount: number
  oldestOverdueDays: number
}

export interface ApDetailRow {
  invoiceId: number
  invoiceNumber: string | null
  invoiceDate: string
  dueDate: string | null
  daysOverdue: number
  supplierId: number
  supplierName: string | null
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  unitCost: number
  lineTotal: number
  invoiceOutstanding: number
}

export interface ApDetail {
  asOfDate: string
  rows: ApDetailRow[]
  totalOutstanding: number
}

export interface SupplierBalanceRow {
  supplierId: number
  supplierName: string | null
  invoiceCount: number
  outstandingAmount: number
  oldestDueDate: string | null
}

export interface SupplierBalance {
  asOfDate: string
  rows: SupplierBalanceRow[]
  totalOutstanding: number
}

export interface SupplierStatementLine {
  date: string
  type: string
  reference: string | null
  debit: number
  credit: number
  runningBalance: number
}

export interface SupplierStatement {
  supplierId: number
  supplierName: string | null
  dateFrom: string | null
  dateTo: string | null
  openingBalance: number
  lines: SupplierStatementLine[]
  closingBalance: number
}

export interface ApPaymentRow {
  paymentId: number
  paymentNumber: string | null
  paymentDate: string
  supplierId: number
  supplierName: string | null
  method: string | null
  amount: number
}

export interface ApPayment {
  dateFrom: string | null
  dateTo: string | null
  rows: ApPaymentRow[]
  totalPaid: number
}

export function useApReports() {
  const api = useApi()

  async function summary(filter: ApReportFilter = {}) {
    const res = await api<ApiEnvelope<ApSummary>>('/api/admin/ap-reports/summary', { query: filter })
    return res.data
  }

  async function detail(filter: ApReportFilter = {}) {
    const res = await api<ApiEnvelope<ApDetail>>('/api/admin/ap-reports/detail', { query: filter })
    return res.data
  }

  async function supplierBalance(filter: ApReportFilter = {}) {
    const res = await api<ApiEnvelope<SupplierBalance>>('/api/admin/ap-reports/supplier-balance', { query: filter })
    return res.data
  }

  async function supplierStatement(filter: ApReportFilter & { supplierId: number }) {
    const res = await api<ApiEnvelope<SupplierStatement>>('/api/admin/ap-reports/supplier-statement', { query: filter })
    return res.data
  }

  async function payments(filter: ApReportFilter = {}) {
    const res = await api<ApiEnvelope<ApPayment>>('/api/admin/ap-reports/payments', { query: filter })
    return res.data
  }

  return { summary, detail, supplierBalance, supplierStatement, payments }
}
