// Wraps the backend's admin-only ArReportController (/api/admin/ar-reports/**,
// requires ROLE_ADMIN). Computed fresh from Invoice/InvoiceLine/CreditNote/
// PaymentAllocation — the same source useInvoices().agingReport() uses —
// rather than the maintained-but-separate Customer.currentBalance cache.

import type { ApiEnvelope } from '#shared/types'

export interface ArReportFilter {
  companyId?: number
  customerId?: number
  asOfDate?: string
  dateFrom?: string
  dateTo?: string
  thresholdDays?: number
}

export interface ArSummary {
  asOfDate: string
  totalOutstanding: number
  totalOverdue: number
  invoiceCount: number
  customerCount: number
  overdueInvoiceCount: number
  overdueCustomerCount: number
  oldestOverdueDays: number
}

export interface ArDetailRow {
  invoiceId: number
  invoiceNumber: string | null
  invoiceDate: string
  dueDate: string | null
  daysOverdue: number
  customerId: number
  customerName: string | null
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  unitPrice: number
  lineTotal: number
  invoiceOutstanding: number
}

export interface ArDetail {
  asOfDate: string
  rows: ArDetailRow[]
  totalOutstanding: number
}

export interface CustomerBalanceRow {
  customerId: number
  customerName: string | null
  invoiceCount: number
  outstandingAmount: number
  oldestDueDate: string | null
}

export interface CustomerBalance {
  asOfDate: string
  rows: CustomerBalanceRow[]
  totalOutstanding: number
}

export interface CustomerStatementLine {
  date: string
  type: string
  reference: string | null
  debit: number
  credit: number
  runningBalance: number
}

export interface CustomerStatement {
  customerId: number
  customerName: string | null
  dateFrom: string | null
  dateTo: string | null
  openingBalance: number
  lines: CustomerStatementLine[]
  closingBalance: number
}

export interface ArCollectionRow {
  paymentId: number
  paymentNumber: string | null
  paymentDate: string
  customerId: number
  customerName: string | null
  method: string | null
  amount: number
}

export interface ArCollection {
  dateFrom: string | null
  dateTo: string | null
  rows: ArCollectionRow[]
  totalCollected: number
}

export interface ArBadDebtRow {
  invoiceId: number
  invoiceNumber: string | null
  invoiceDate: string
  dueDate: string | null
  daysOverdue: number
  customerId: number
  customerName: string | null
  outstandingAmount: number
}

export interface ArBadDebt {
  asOfDate: string
  thresholdDays: number
  rows: ArBadDebtRow[]
  invoiceCount: number
  totalAmount: number
}

export function useArReports() {
  const api = useApi()

  async function summary(filter: ArReportFilter = {}) {
    const res = await api<ApiEnvelope<ArSummary>>('/api/admin/ar-reports/summary', { query: filter })
    return res.data
  }

  async function detail(filter: ArReportFilter = {}) {
    const res = await api<ApiEnvelope<ArDetail>>('/api/admin/ar-reports/detail', { query: filter })
    return res.data
  }

  async function customerBalance(filter: ArReportFilter = {}) {
    const res = await api<ApiEnvelope<CustomerBalance>>('/api/admin/ar-reports/customer-balance', { query: filter })
    return res.data
  }

  async function customerStatement(filter: ArReportFilter & { customerId: number }) {
    const res = await api<ApiEnvelope<CustomerStatement>>('/api/admin/ar-reports/customer-statement', { query: filter })
    return res.data
  }

  async function collections(filter: ArReportFilter = {}) {
    const res = await api<ApiEnvelope<ArCollection>>('/api/admin/ar-reports/collections', { query: filter })
    return res.data
  }

  async function badDebt(filter: ArReportFilter = {}) {
    const res = await api<ApiEnvelope<ArBadDebt>>('/api/admin/ar-reports/bad-debt', { query: filter })
    return res.data
  }

  return { summary, detail, customerBalance, customerStatement, collections, badDebt }
}
