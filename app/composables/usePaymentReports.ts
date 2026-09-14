// Wraps the backend's admin-only PaymentReportController
// (/api/admin/payment-reports/**, requires ROLE_ADMIN). Cross-ledger cuts
// over customer payments, supplier payments, and bank transactions — the
// per-ledger views live in useArReports (collections) and useApReports
// (payments).

import type { ApiEnvelope } from '#shared/types'

export type PaymentReportMethod = 'CASH' | 'BANK_TRANSFER' | 'PAYMENT_GATEWAY'
export type PaymentReportType = 'PAYMENT' | 'REFUND'
export type PaymentReportParty = 'CUSTOMER' | 'SUPPLIER'

export interface PaymentReportFilter {
  companyId?: number
  customerId?: number
  supplierId?: number
  dateFrom?: string
  dateTo?: string
  method?: PaymentReportMethod
  type?: PaymentReportType
  party?: PaymentReportParty
}

export interface PaymentSummary {
  dateFrom: string | null
  dateTo: string | null
  customerPaymentCount: number
  customerReceived: number
  customerRefunded: number
  customerNet: number
  supplierPaymentCount: number
  supplierPaid: number
  supplierRefunded: number
  supplierNet: number
  netCashFlow: number
}

export interface PaymentDetailRow {
  party: PaymentReportParty
  paymentId: number
  paymentNumber: string | null
  paymentDate: string
  partyId: number
  partyName: string | null
  type: PaymentReportType
  method: PaymentReportMethod
  amount: number
  reference: string | null
  createdBy: string | null
}

export interface PaymentDetail {
  dateFrom: string | null
  dateTo: string | null
  rows: PaymentDetailRow[]
  totalReceived: number
  totalPaid: number
}

export interface PaymentByMethodRow {
  method: PaymentReportMethod
  customerCount: number
  customerNet: number
  supplierCount: number
  supplierNet: number
}

export interface PaymentByMethod {
  dateFrom: string | null
  dateTo: string | null
  rows: PaymentByMethodRow[]
  totalCustomerNet: number
  totalSupplierNet: number
}

export interface PaymentByBranchRow {
  branchId: number | null
  branchName: string
  customerCount: number
  customerNet: number
  supplierCount: number
  supplierNet: number
}

export interface PaymentByBranch {
  dateFrom: string | null
  dateTo: string | null
  rows: PaymentByBranchRow[]
}

export interface RefundRow {
  party: PaymentReportParty
  refundId: number
  refundNumber: string | null
  refundDate: string
  partyId: number
  partyName: string | null
  method: PaymentReportMethod
  amount: number
  originalPaymentNumber: string | null
  notes: string | null
}

export interface RefundReport {
  dateFrom: string | null
  dateTo: string | null
  rows: RefundRow[]
  totalCustomerRefunds: number
  totalSupplierRefunds: number
}

export interface TransferRow {
  transactionId: number
  transactionNumber: string | null
  transactionDate: string
  fromAccountId: number
  fromAccountName: string | null
  toAccountId: number | null
  toAccountName: string | null
  amount: number
  reference: string | null
  description: string | null
}

export interface TransferReport {
  dateFrom: string | null
  dateTo: string | null
  rows: TransferRow[]
  totalTransferred: number
}

export interface CollectionByCustomerRow {
  customerId: number
  customerName: string | null
  paymentCount: number
  received: number
  refunded: number
  net: number
}

export interface CollectionByCustomer {
  dateFrom: string | null
  dateTo: string | null
  rows: CollectionByCustomerRow[]
  totalNet: number
}

export interface CollectionBySalespersonRow {
  salesperson: string
  invoiceCount: number
  allocatedAmount: number
}

export interface CollectionBySalesperson {
  dateFrom: string | null
  dateTo: string | null
  rows: CollectionBySalespersonRow[]
  totalAllocated: number
}

export interface PaymentReconciliationRow {
  bankAccountId: number
  bankAccountName: string | null
  accountType: string | null
  deposits: number
  withdrawals: number
  reconciledCount: number
  reconciledAmount: number
  unreconciledCount: number
  unreconciledAmount: number
}

export interface PaymentReconciliation {
  dateFrom: string | null
  dateTo: string | null
  rows: PaymentReconciliationRow[]
  customerBankReceipts: number
  totalDeposits: number
  receiptsVariance: number
  supplierBankPayments: number
  totalWithdrawals: number
  paymentsVariance: number
}

export function usePaymentReports() {
  const api = useApi()
  const base = '/api/admin/payment-reports'

  async function summary(filter: PaymentReportFilter = {}) {
    const res = await api<ApiEnvelope<PaymentSummary>>(`${base}/summary`, { query: filter })
    return res.data
  }

  async function detail(filter: PaymentReportFilter = {}) {
    const res = await api<ApiEnvelope<PaymentDetail>>(`${base}/detail`, { query: filter })
    return res.data
  }

  async function byMethod(filter: PaymentReportFilter = {}) {
    const res = await api<ApiEnvelope<PaymentByMethod>>(`${base}/by-method`, { query: filter })
    return res.data
  }

  async function byBranch(filter: PaymentReportFilter = {}) {
    const res = await api<ApiEnvelope<PaymentByBranch>>(`${base}/by-branch`, { query: filter })
    return res.data
  }

  async function refunds(filter: PaymentReportFilter = {}) {
    const res = await api<ApiEnvelope<RefundReport>>(`${base}/refunds`, { query: filter })
    return res.data
  }

  async function transfers(filter: PaymentReportFilter = {}) {
    const res = await api<ApiEnvelope<TransferReport>>(`${base}/transfers`, { query: filter })
    return res.data
  }

  async function collectionByCustomer(filter: PaymentReportFilter = {}) {
    const res = await api<ApiEnvelope<CollectionByCustomer>>(`${base}/collection-by-customer`, { query: filter })
    return res.data
  }

  async function collectionBySalesperson(filter: PaymentReportFilter = {}) {
    const res = await api<ApiEnvelope<CollectionBySalesperson>>(`${base}/collection-by-salesperson`, { query: filter })
    return res.data
  }

  async function reconciliation(filter: PaymentReportFilter = {}) {
    const res = await api<ApiEnvelope<PaymentReconciliation>>(`${base}/reconciliation`, { query: filter })
    return res.data
  }

  return { summary, detail, byMethod, byBranch, refunds, transfers, collectionByCustomer, collectionBySalesperson, reconciliation }
}
