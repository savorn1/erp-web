// Wraps the backend's admin-only PosSessionController
// (/api/admin/pos-sessions/**). One row per open/close cycle (shift) for a
// Register — at most one OPEN session per register at a time.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type PosSessionStatus = 'OPEN' | 'CLOSED'

export interface PosSession {
  id: number
  registerId: number
  registerName: string | null
  companyId: number
  openedBy: string | null
  openedAt: string
  openingFloat: number
  status: PosSessionStatus
  closedBy: string | null
  closedAt: string | null
  countedCash: number | null
  expectedCash: number | null
  cashVariance: number | null
  salesTotalSoFar: number
}

export interface PosSessionFilter {
  companyId?: number
  registerId?: number
  status?: PosSessionStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export function usePosSessions() {
  const api = useApi()

  function list(filter: PosSessionFilter = {}) {
    return api<PageEnvelope<PosSession>>('/api/admin/pos-sessions', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<PosSession>>(`/api/admin/pos-sessions/${id}`)
    return res.data
  }

  async function open(registerId: number, openingFloat: number) {
    const res = await api<ApiEnvelope<PosSession>>('/api/admin/pos-sessions', { method: 'POST', body: { registerId, openingFloat } })
    return res.data
  }

  async function close(id: number, countedCash: number) {
    const res = await api<ApiEnvelope<PosSession>>(`/api/admin/pos-sessions/${id}/close`, { method: 'POST', body: { countedCash } })
    return res.data
  }

  return { list, get, open, close }
}
