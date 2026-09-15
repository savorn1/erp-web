// Wraps the backend's admin-only PostingRuleController
// (/api/admin/posting-rules/**, requires ROLE_ADMIN). One row per company —
// the "Auto-Posting Accounts" AutoPostingServiceImpl reads before building a
// journal entry for an approved Invoice/PurchaseInvoice/Payment/
// SupplierPayment/CreditNote/PurchaseCreditNote. Every field is optional;
// leaving one unset just means that document type's auto-posting is skipped
// (the underlying business action still succeeds either way).

import type { ApiEnvelope } from '#shared/types'

export interface PostingRule {
  id: number | null
  companyId: number
  companyName: string | null
  accountsReceivableAccountId: number | null
  accountsReceivableAccountLabel: string | null
  accountsPayableAccountId: number | null
  accountsPayableAccountLabel: string | null
  salesRevenueAccountId: number | null
  salesRevenueAccountLabel: string | null
  salesReturnsAccountId: number | null
  salesReturnsAccountLabel: string | null
  purchaseExpenseAccountId: number | null
  purchaseExpenseAccountLabel: string | null
  purchaseReturnsAccountId: number | null
  purchaseReturnsAccountLabel: string | null
  taxPayableAccountId: number | null
  taxPayableAccountLabel: string | null
  taxReceivableAccountId: number | null
  taxReceivableAccountLabel: string | null
  defaultCashAccountId: number | null
  defaultCashAccountLabel: string | null
  defaultBankAccountId: number | null
  defaultBankAccountLabel: string | null
  fixedAssetCostAccountId: number | null
  fixedAssetCostAccountLabel: string | null
  depreciationExpenseAccountId: number | null
  depreciationExpenseAccountLabel: string | null
  accumulatedDepreciationAccountId: number | null
  accumulatedDepreciationAccountLabel: string | null
  assetDisposalGainLossAccountId: number | null
  assetDisposalGainLossAccountLabel: string | null
}

export interface PostingRulePayload {
  companyId: number
  accountsReceivableAccountId?: number
  accountsPayableAccountId?: number
  salesRevenueAccountId?: number
  salesReturnsAccountId?: number
  purchaseExpenseAccountId?: number
  purchaseReturnsAccountId?: number
  taxPayableAccountId?: number
  taxReceivableAccountId?: number
  defaultCashAccountId?: number
  defaultBankAccountId?: number
  fixedAssetCostAccountId?: number
  depreciationExpenseAccountId?: number
  accumulatedDepreciationAccountId?: number
  assetDisposalGainLossAccountId?: number
}

export function usePostingRules() {
  const api = useApi()

  async function getForCompany(companyId: number) {
    const res = await api<ApiEnvelope<PostingRule>>(`/api/admin/posting-rules/${companyId}`)
    return res.data
  }

  async function upsert(payload: PostingRulePayload) {
    const res = await api<ApiEnvelope<PostingRule>>('/api/admin/posting-rules', { method: 'PUT', body: payload })
    return res.data
  }

  // Seeds the company's standard chart of accounts if needed, then fills in
  // one default account per module (Sales, Purchasing, Cash & bank) for
  // every field not already mapped — anything already set is left alone.
  async function seed(companyId: number) {
    const res = await api<ApiEnvelope<PostingRule>>(`/api/admin/posting-rules/seed/${companyId}`, { method: 'POST' })
    return res.data
  }

  return { getForCompany, upsert, seed }
}
