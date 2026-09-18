// Wraps the backend's admin-only ApprovalRuleController
// (/api/admin/approval-rules/**). Configuring a rule for a document type
// makes SalesOrderServiceImpl/PurchaseOrderServiceImpl require that many
// DISTINCT people to approve before the document actually finalizes — see
// each entity's SalesOrder/PurchaseOrder approvalsRequired/approvalsRecorded
// fields. With no active rule matching a document's amount, approval stays
// single-click, exactly as before this feature existed.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type ApprovalDocumentType = 'SALES_ORDER' | 'PURCHASE_ORDER'

export interface ApprovalRule {
  id: number
  companyId: number
  companyName: string | null
  documentType: ApprovalDocumentType
  minAmount: number | null
  requiredApprovals: number
  active: boolean
}

export interface ApprovalRuleFilter {
  companyId?: number
  documentType?: ApprovalDocumentType
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface ApprovalRulePayload {
  companyId: number
  documentType: ApprovalDocumentType
  minAmount?: number
  requiredApprovals: number
  active: boolean
}

export function useApprovalRules() {
  const api = useApi()

  function list(filter: ApprovalRuleFilter = {}) {
    return api<PageEnvelope<ApprovalRule>>('/api/admin/approval-rules', { query: filter })
  }

  async function create(payload: ApprovalRulePayload) {
    const res = await api<ApiEnvelope<ApprovalRule>>('/api/admin/approval-rules', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: ApprovalRulePayload) {
    const res = await api<ApiEnvelope<ApprovalRule>>(`/api/admin/approval-rules/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/approval-rules/${id}`, { method: 'DELETE' })
  }

  return { list, create, update, remove }
}
