// Wraps the backend's admin-only CompanyController (/api/admin/companies/**,
// requires ROLE_ADMIN). Single-item endpoints wrap their payload in
// ApiResponse<T>; list wraps in PageResponse<T>.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface Company {
  id: number
  name: string
  logoUrl: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  taxId: string | null
  currency: string
  fiscalYearStartMonth: number
  active: boolean
}

export interface CompanyFilter {
  name?: string
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CompanyPayload {
  name: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  taxId?: string
  currency: string
  fiscalYearStartMonth: number
}

export function useCompanies() {
  const api = useApi()

  function list(filter: CompanyFilter = {}) {
    return api<PageEnvelope<Company>>('/api/admin/companies', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Company>>(`/api/admin/companies/${id}`)
    return res.data
  }

  async function create(payload: CompanyPayload) {
    const res = await api<ApiEnvelope<Company>>('/api/admin/companies', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: CompanyPayload) {
    const res = await api<ApiEnvelope<Company>>(`/api/admin/companies/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function updateStatus(id: number, active: boolean) {
    const res = await api<ApiEnvelope<Company>>(`/api/admin/companies/${id}/status`, {
      method: 'PUT',
      body: { active }
    })
    return res.data
  }

  async function uploadLogo(id: number, file: File) {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api<ApiEnvelope<Company>>(`/api/admin/companies/${id}/logo`, {
      method: 'POST',
      body: formData
    })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/companies/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, updateStatus, uploadLogo, remove }
}
