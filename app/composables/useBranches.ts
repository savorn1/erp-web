// Wraps the backend's admin-only BranchController (/api/admin/branches/**,
// requires ROLE_ADMIN). Single-item endpoints wrap their payload in
// ApiResponse<T>; list wraps in PageResponse<T>. Each branch belongs to a
// Company (see useCompanies) and may have a User assigned as its manager
// (see useUsers) — both are resolved server-side into companyName/managerUsername.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface Branch {
  id: number
  companyId: number
  companyName: string | null
  name: string
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  managerId: number | null
  managerUsername: string | null
  phone: string | null
  email: string | null
  timezone: string | null
  active: boolean
}

export interface BranchFilter {
  name?: string
  companyId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface BranchPayload {
  companyId: number
  name: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  managerId?: number
  phone?: string
  email?: string
  timezone?: string
}

export function useBranches() {
  const api = useApi()

  function list(filter: BranchFilter = {}) {
    return api<PageEnvelope<Branch>>('/api/admin/branches', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Branch>>(`/api/admin/branches/${id}`)
    return res.data
  }

  async function create(payload: BranchPayload) {
    const res = await api<ApiEnvelope<Branch>>('/api/admin/branches', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: BranchPayload) {
    const res = await api<ApiEnvelope<Branch>>(`/api/admin/branches/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function updateStatus(id: number, active: boolean) {
    const res = await api<ApiEnvelope<Branch>>(`/api/admin/branches/${id}/status`, {
      method: 'PUT',
      body: { active }
    })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/branches/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, updateStatus, remove }
}
