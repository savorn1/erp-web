// Wraps the backend's admin-only AuditLogController (/api/admin/audit-logs/**,
// read-only). Entries are written server-side by AuditLogFilter (approvals,
// plus users/custom-roles writes) and AuthServiceImpl (login/logout) — there
// is no create/update/delete here on purpose.

import type { PageEnvelope } from '#shared/types'

export type AuditLogAction = 'APPROVE' | 'WRITE' | 'LOGIN' | 'LOGOUT'

export interface AuditLogEntry {
  id: number
  companyId: number | null
  companyName: string | null
  module: string | null
  action: AuditLogAction
  httpMethod: string | null
  path: string | null
  sourceId: number | null
  actingUsername: string | null
  statusCode: number | null
  description: string | null
  createdAt: string
}

export interface AuditLogFilter {
  companyId?: number
  module?: string
  action?: AuditLogAction
  actingUsername?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export function useAuditLogs() {
  const api = useApi()

  function list(filter: AuditLogFilter = {}) {
    return api<PageEnvelope<AuditLogEntry>>('/api/admin/audit-logs', { query: filter })
  }

  return { list }
}
