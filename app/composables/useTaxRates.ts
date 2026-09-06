// Wraps the backend's admin-only TaxRateController (/api/admin/tax-rates/**,
// requires ROLE_ADMIN). Reference data only — a named rate a company uses.
// Not wired into Sales/Purchase order or invoice lines, which still carry
// their own free-typed tax percent; see useTaxReport for the report that
// groups those lines by the raw percent typed on them.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type TaxType = 'VAT' | 'WITHHOLDING' | 'OTHER'

export interface TaxRate {
  id: number
  companyId: number
  companyName: string | null
  code: string
  name: string
  type: TaxType
  ratePercent: number
  active: boolean
}

export interface TaxRateFilter {
  search?: string
  companyId?: number
  type?: TaxType
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface TaxRatePayload {
  companyId: number
  code: string
  name: string
  type: TaxType
  ratePercent: number
  active: boolean
}

export function useTaxRates() {
  const api = useApi()

  function list(filter: TaxRateFilter = {}) {
    return api<PageEnvelope<TaxRate>>('/api/admin/tax-rates', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<TaxRate>>(`/api/admin/tax-rates/${id}`)
    return res.data
  }

  async function create(payload: TaxRatePayload) {
    const res = await api<ApiEnvelope<TaxRate>>('/api/admin/tax-rates', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: TaxRatePayload) {
    const res = await api<ApiEnvelope<TaxRate>>(`/api/admin/tax-rates/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/tax-rates/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, remove }
}
