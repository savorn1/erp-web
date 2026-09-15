// Wraps the backend's admin-only FixedAssetController
// (/api/admin/fixed-assets/**, requires ROLE_ADMIN). Creating an asset
// auto-posts an acquisition journal entry (Dr Fixed Assets / Cr Accounts
// Payable); running depreciation and disposing an asset auto-post too — see
// PostingRuleServiceImpl's "Fixed assets" section for the account mapping
// these depend on.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type DepreciationMethod = 'STRAIGHT_LINE' | 'DECLINING_BALANCE'
export type FixedAssetStatus = 'ACTIVE' | 'FULLY_DEPRECIATED' | 'DISPOSED'

export interface FixedAsset {
  id: number
  companyId: number
  companyName: string | null
  assetCode: string
  name: string
  description: string | null
  category: string | null
  acquisitionDate: string
  acquisitionCost: number
  salvageValue: number
  usefulLifeMonths: number
  depreciationMethod: DepreciationMethod
  decliningBalanceRate: number | null
  accumulatedDepreciation: number
  bookValue: number
  status: FixedAssetStatus
  disposalDate: string | null
  disposalProceeds: number | null
}

export interface FixedAssetFilter {
  assetCode?: string
  companyId?: number
  status?: FixedAssetStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface FixedAssetPayload {
  companyId: number
  assetCode: string
  name: string
  description?: string
  category?: string
  acquisitionDate: string
  acquisitionCost: number
  salvageValue?: number
  usefulLifeMonths: number
  depreciationMethod: DepreciationMethod
  decliningBalanceRate?: number
}

export interface DisposeFixedAssetPayload {
  disposalDate: string
  proceeds: number
}

export interface DepreciationEntry {
  id: number
  depreciationRunId: number
  runDate: string
  accountingPeriodId: number
  accountingPeriodName: string | null
  assetId: number
  assetCode: string | null
  assetName: string | null
  amount: number
  accumulatedAfter: number
}

export interface DepreciationEntryFilter {
  companyId?: number
  assetId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface DepreciationRunResult {
  id: number
  companyId: number
  accountingPeriodId: number
  accountingPeriodName: string | null
  runDate: string
  journalEntryId: number | null
  journalNumber: string | null
  totalAmount: number
  assetCount: number
  createdBy: string | null
  entries: DepreciationEntry[]
}

export function useFixedAssets() {
  const api = useApi()

  function list(filter: FixedAssetFilter = {}) {
    return api<PageEnvelope<FixedAsset>>('/api/admin/fixed-assets', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<FixedAsset>>(`/api/admin/fixed-assets/${id}`)
    return res.data
  }

  async function create(payload: FixedAssetPayload) {
    const res = await api<ApiEnvelope<FixedAsset>>('/api/admin/fixed-assets', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: FixedAssetPayload) {
    const res = await api<ApiEnvelope<FixedAsset>>(`/api/admin/fixed-assets/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/fixed-assets/${id}`, { method: 'DELETE' })
  }

  async function dispose(id: number, payload: DisposeFixedAssetPayload) {
    const res = await api<ApiEnvelope<FixedAsset>>(`/api/admin/fixed-assets/${id}/dispose`, { method: 'POST', body: payload })
    return res.data
  }

  async function runDepreciation(companyId: number, accountingPeriodId: number) {
    const res = await api<ApiEnvelope<DepreciationRunResult>>('/api/admin/fixed-assets/depreciation-runs', {
      method: 'POST',
      body: { companyId, accountingPeriodId }
    })
    return res.data
  }

  function listDepreciationEntries(filter: DepreciationEntryFilter = {}) {
    return api<PageEnvelope<DepreciationEntry>>('/api/admin/fixed-assets/depreciation-entries', { query: filter })
  }

  return { list, get, create, update, remove, dispose, runDepreciation, listDepreciationEntries }
}
