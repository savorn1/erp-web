// Wraps the backend's admin-only AccountController (/api/admin/accounts/**,
// requires ROLE_ADMIN). A company's chart of accounts — parentAccountId
// builds an arbitrary-depth tree (e.g. "1000 Assets" -> "1100 Cash"); a
// "group" isn't a separate thing, it's just an account other accounts point
// to as their parent (see hasChildren). A child's accountType must match its
// parent's — the backend enforces this.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'

export interface Account {
  id: number
  companyId: number
  companyName: string | null
  accountCode: string
  name: string
  accountType: AccountType
  parentAccountId: number | null
  parentAccountCode: string | null
  parentAccountName: string | null
  description: string | null
  active: boolean
  hasChildren: boolean
}

export interface AccountFilter {
  search?: string
  companyId?: number
  accountType?: AccountType
  parentAccountId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface AccountPayload {
  companyId: number
  accountCode: string
  name: string
  accountType: AccountType
  parentAccountId?: number
  description?: string
  active: boolean
}

export function useAccounts() {
  const api = useApi()

  function list(filter: AccountFilter = {}) {
    return api<PageEnvelope<Account>>('/api/admin/accounts', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Account>>(`/api/admin/accounts/${id}`)
    return res.data
  }

  async function create(payload: AccountPayload) {
    const res = await api<ApiEnvelope<Account>>('/api/admin/accounts', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: AccountPayload) {
    const res = await api<ApiEnvelope<Account>>(`/api/admin/accounts/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/accounts/${id}`, { method: 'DELETE' })
  }

  async function seedSample(companyId: number) {
    const res = await api<ApiEnvelope<Account[]>>(`/api/admin/accounts/seed-sample/${companyId}`, { method: 'POST' })
    return res.data
  }

  return { list, get, create, update, remove, seedSample }
}
