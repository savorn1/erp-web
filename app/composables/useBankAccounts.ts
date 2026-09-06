// Wraps the backend's admin-only BankAccountController
// (/api/admin/bank-accounts/**, requires ROLE_ADMIN). A cash drawer or bank
// account this company actually holds money in — standalone from Chart of
// Accounts / Journal Entry for now (accountId is just an optional reference
// link; nothing auto-posts to the general ledger). currentBalance only
// changes through deposit/withdraw/transfer.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type BankAccountType = 'CASH' | 'BANK'
export type BankTransactionType = 'DEPOSIT' | 'WITHDRAWAL' | 'TRANSFER_IN' | 'TRANSFER_OUT'

export interface BankAccount {
  id: number
  companyId: number
  companyName: string | null
  accountId: number | null
  accountCode: string | null
  accountName: string | null
  name: string
  type: BankAccountType
  bankName: string | null
  accountNumber: string | null
  currency: string
  openingBalance: number
  currentBalance: number
  active: boolean
}

export interface BankAccountFilter {
  search?: string
  companyId?: number
  type?: BankAccountType
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface BankAccountPayload {
  companyId: number
  accountId?: number
  name: string
  type: BankAccountType
  bankName?: string
  accountNumber?: string
  currency: string
  openingBalance: number
  active: boolean
}

export interface BankTransaction {
  id: number
  companyId: number
  bankAccountId: number
  bankAccountName: string | null
  transactionNumber: string
  transactionDate: string
  type: BankTransactionType
  amount: number
  reference: string | null
  description: string | null
  relatedTransactionId: number | null
  relatedTransactionNumber: string | null
  relatedBankAccountName: string | null
  reconciled: boolean
  reconciledDate: string | null
  createdBy: string | null
}

export interface BankTransactionFilter {
  companyId?: number
  bankAccountId?: number
  type?: BankTransactionType
  reconciled?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface BankTransactionPayload {
  transactionDate: string
  amount: number
  reference?: string
  description?: string
}

export interface BankTransferPayload {
  toBankAccountId: number
  transactionDate: string
  amount: number
  reference?: string
  description?: string
}

export interface ReconcileTransactionsPayload {
  transactionIds: number[]
  statementDate: string
  statementBalance: number
}

export interface BankReconciliation {
  statementDate: string
  statementBalance: number
  reconciledBalance: number
  difference: number
  reconciledTransactions: BankTransaction[]
}

export function useBankAccounts() {
  const api = useApi()

  function list(filter: BankAccountFilter = {}) {
    return api<PageEnvelope<BankAccount>>('/api/admin/bank-accounts', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<BankAccount>>(`/api/admin/bank-accounts/${id}`)
    return res.data
  }

  async function create(payload: BankAccountPayload) {
    const res = await api<ApiEnvelope<BankAccount>>('/api/admin/bank-accounts', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: BankAccountPayload) {
    const res = await api<ApiEnvelope<BankAccount>>(`/api/admin/bank-accounts/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/bank-accounts/${id}`, { method: 'DELETE' })
  }

  function listTransactions(filter: BankTransactionFilter = {}) {
    return api<PageEnvelope<BankTransaction>>('/api/admin/bank-accounts/transactions', { query: filter })
  }

  async function deposit(bankAccountId: number, payload: BankTransactionPayload) {
    const res = await api<ApiEnvelope<BankTransaction>>(`/api/admin/bank-accounts/${bankAccountId}/deposit`, { method: 'POST', body: payload })
    return res.data
  }

  async function withdraw(bankAccountId: number, payload: BankTransactionPayload) {
    const res = await api<ApiEnvelope<BankTransaction>>(`/api/admin/bank-accounts/${bankAccountId}/withdraw`, { method: 'POST', body: payload })
    return res.data
  }

  async function transfer(fromBankAccountId: number, payload: BankTransferPayload) {
    const res = await api<ApiEnvelope<BankTransaction>>(`/api/admin/bank-accounts/${fromBankAccountId}/transfer`, { method: 'POST', body: payload })
    return res.data
  }

  async function reconcile(bankAccountId: number, payload: ReconcileTransactionsPayload) {
    const res = await api<ApiEnvelope<BankReconciliation>>(`/api/admin/bank-accounts/${bankAccountId}/reconcile`, { method: 'POST', body: payload })
    return res.data
  }

  return { list, get, create, update, remove, listTransactions, deposit, withdraw, transfer, reconcile }
}
