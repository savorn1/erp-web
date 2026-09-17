// Wraps the backend's admin-only RegisterController (/api/admin/registers/**).
// A Register is a POS till, tied to one warehouse — that warehouse's stock is
// what a sale at this register decrements (see useDisplayUnit-style pattern:
// this codebase has no separate "store" concept, a warehouse row can just as
// well represent a retail location).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface Register {
  id: number
  companyId: number
  companyName: string | null
  warehouseId: number
  warehouseName: string | null
  code: string
  name: string
  active: boolean
  hasOpenSession: boolean
  openPosSessionId: number | null
}

export interface RegisterFilter {
  code?: string
  companyId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface RegisterPayload {
  companyId: number
  warehouseId: number
  code: string
  name: string
  active: boolean
}

export function useRegisters() {
  const api = useApi()

  function list(filter: RegisterFilter = {}) {
    return api<PageEnvelope<Register>>('/api/admin/registers', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Register>>(`/api/admin/registers/${id}`)
    return res.data
  }

  async function create(payload: RegisterPayload) {
    const res = await api<ApiEnvelope<Register>>('/api/admin/registers', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: RegisterPayload) {
    const res = await api<ApiEnvelope<Register>>(`/api/admin/registers/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/registers/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, remove }
}
