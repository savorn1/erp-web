// Wraps the backend's admin-only FinancialReportController
// (/api/admin/financial-reports/**, requires ROLE_ADMIN). Trial balance /
// general ledger / balance sheet / profit & loss are derived strictly from
// POSTED Journal Entry lines — see JournalEntry's own comment — so they only
// reflect what's actually been manually journaled (nothing else in this
// system posts to the general ledger automatically yet). Cash flow is built
// from real BankTransaction activity instead.

import type { ApiEnvelope } from '#shared/types'

export interface TrialBalanceFilter {
  companyId?: number
  asOfDate?: string
}

export interface TrialBalanceRow {
  accountId: number
  accountCode: string
  accountName: string
  accountType: string
  debitBalance: number
  creditBalance: number
}

export interface TrialBalance {
  asOfDate: string
  rows: TrialBalanceRow[]
  debitTotal: number
  creditTotal: number
}

export interface GeneralLedgerFilter {
  accountId: number
  dateFrom?: string
  dateTo?: string
}

export interface GeneralLedgerLine {
  journalEntryId: number
  journalNumber: string
  entryDate: string
  description: string | null
  debit: number
  credit: number
  runningBalance: number
}

export interface GeneralLedger {
  accountId: number
  accountCode: string
  accountName: string
  accountType: string
  dateFrom: string | null
  dateTo: string | null
  openingBalance: number
  lines: GeneralLedgerLine[]
  closingBalance: number
}

export interface BalanceSheetFilter {
  companyId?: number
  asOfDate?: string
}

export interface FinancialStatementLine {
  accountId: number | null
  accountCode: string | null
  accountName: string
  amount: number
}

export interface BalanceSheet {
  asOfDate: string
  assets: FinancialStatementLine[]
  assetsTotal: number
  liabilities: FinancialStatementLine[]
  liabilitiesTotal: number
  equity: FinancialStatementLine[]
  equityTotal: number
  liabilitiesAndEquityTotal: number
  balanced: boolean
}

export interface ProfitAndLossFilter {
  companyId?: number
  dateFrom?: string
  dateTo?: string
}

export interface ProfitAndLoss {
  dateFrom: string | null
  dateTo: string | null
  revenue: FinancialStatementLine[]
  revenueTotal: number
  expenses: FinancialStatementLine[]
  expenseTotal: number
  netIncome: number
}

export interface CashFlowFilter {
  companyId?: number
  dateFrom?: string
  dateTo?: string
}

export interface CashFlowAccountRow {
  bankAccountId: number
  bankAccountName: string
  openingBalance: number
  inflow: number
  outflow: number
  netChange: number
  closingBalance: number
}

export interface CashFlow {
  dateFrom: string | null
  dateTo: string | null
  accounts: CashFlowAccountRow[]
  totalOpeningBalance: number
  totalInflow: number
  totalOutflow: number
  totalNetChange: number
  totalClosingBalance: number
}

export function useFinancialReports() {
  const api = useApi()

  async function trialBalance(filter: TrialBalanceFilter = {}) {
    const res = await api<ApiEnvelope<TrialBalance>>('/api/admin/financial-reports/trial-balance', { query: filter })
    return res.data
  }

  async function generalLedger(filter: GeneralLedgerFilter) {
    const res = await api<ApiEnvelope<GeneralLedger>>('/api/admin/financial-reports/general-ledger', { query: filter })
    return res.data
  }

  async function balanceSheet(filter: BalanceSheetFilter = {}) {
    const res = await api<ApiEnvelope<BalanceSheet>>('/api/admin/financial-reports/balance-sheet', { query: filter })
    return res.data
  }

  async function profitAndLoss(filter: ProfitAndLossFilter = {}) {
    const res = await api<ApiEnvelope<ProfitAndLoss>>('/api/admin/financial-reports/profit-and-loss', { query: filter })
    return res.data
  }

  async function cashFlow(filter: CashFlowFilter = {}) {
    const res = await api<ApiEnvelope<CashFlow>>('/api/admin/financial-reports/cash-flow', { query: filter })
    return res.data
  }

  return { trialBalance, generalLedger, balanceSheet, profitAndLoss, cashFlow }
}
