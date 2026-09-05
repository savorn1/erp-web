// Wraps the backend's admin-only OpportunityController
// (/api/admin/opportunities/**, requires ROLE_ADMIN). Sits between a
// qualified Lead and a won Customer: Lead -> (qualified) -> convert ->
// Opportunity -> win -> Customer (see useLeads.convert). CLOSED_WON/
// CLOSED_LOST are terminal and reached only via win()/lose(), never
// updateStage().

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type OpportunityStage = 'QUALIFICATION' | 'NEEDS_ANALYSIS' | 'PROPOSAL' | 'NEGOTIATION' | 'CLOSED_WON' | 'CLOSED_LOST'
export type OpportunityActivityType = 'CREATED' | 'STAGE_CHANGE' | 'WON' | 'LOST' | 'NOTE' | 'FOLLOW_UP' | 'QUOTATION_CREATED'

export interface Opportunity {
  id: number
  companyId: number
  companyName: string | null
  leadId: number | null
  leadContactName: string | null
  customerId: number | null
  customerName: string | null
  name: string
  amount: number | null
  stage: OpportunityStage
  probability: number | null
  expectedCloseDate: string | null
  assignedToUserId: number | null
  assignedToUsername: string | null
  notes: string | null
  closedAt: string | null
  createdBy: string | null
}

export interface OpportunityActivity {
  id: number
  opportunityId: number
  type: OpportunityActivityType
  description: string
  createdBy: string | null
  createdAt: string
}

export interface OpportunityFilter {
  search?: string
  companyId?: number
  stage?: OpportunityStage
  leadId?: number
  customerId?: number
  assignedToUserId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface OpportunityPayload {
  companyId: number
  leadId?: number
  customerId?: number
  name: string
  amount?: number
  probability?: number
  expectedCloseDate?: string
  assignedToUserId?: number
  notes?: string
}

export function useOpportunities() {
  const api = useApi()

  function list(filter: OpportunityFilter = {}) {
    return api<PageEnvelope<Opportunity>>('/api/admin/opportunities', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Opportunity>>(`/api/admin/opportunities/${id}`)
    return res.data
  }

  async function create(payload: OpportunityPayload) {
    const res = await api<ApiEnvelope<Opportunity>>('/api/admin/opportunities', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: Omit<OpportunityPayload, 'leadId' | 'customerId'>) {
    const res = await api<ApiEnvelope<Opportunity>>(`/api/admin/opportunities/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function updateStage(id: number, stage: OpportunityStage) {
    const res = await api<ApiEnvelope<Opportunity>>(`/api/admin/opportunities/${id}/stage`, { method: 'PUT', body: { stage } })
    return res.data
  }

  async function win(id: number) {
    const res = await api<ApiEnvelope<Opportunity>>(`/api/admin/opportunities/${id}/win`, { method: 'POST' })
    return res.data
  }

  async function lose(id: number, reason?: string) {
    const res = await api<ApiEnvelope<Opportunity>>(`/api/admin/opportunities/${id}/lose`, { method: 'POST', body: { reason } })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/opportunities/${id}`, { method: 'DELETE' })
  }

  function listActivities(id: number, page = 1, size = 20) {
    return api<PageEnvelope<OpportunityActivity>>(`/api/admin/opportunities/${id}/activities`, { query: { page, size } })
  }

  async function addNote(id: number, description: string) {
    const res = await api<ApiEnvelope<OpportunityActivity>>(`/api/admin/opportunities/${id}/activities`, {
      method: 'POST',
      body: { description }
    })
    return res.data
  }

  async function addFollowUp(id: number, description: string) {
    const res = await api<ApiEnvelope<OpportunityActivity>>(`/api/admin/opportunities/${id}/follow-ups`, {
      method: 'POST',
      body: { description }
    })
    return res.data
  }

  async function convertToQuotation(
    id: number,
    payload: {
      quotationDate: string
      validUntil?: string
      notes?: string
      lines: { productId: number; quantity: number; unitPrice: number }[]
    }
  ) {
    const res = await api<ApiEnvelope<import('./useQuotations').Quotation>>(`/api/admin/opportunities/${id}/convert-to-quotation`, {
      method: 'POST',
      body: payload
    })
    return res.data
  }

  return { list, get, create, update, updateStage, win, lose, remove, listActivities, addNote, addFollowUp, convertToQuotation }
}
