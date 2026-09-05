// Wraps the backend's admin-only LeadController (/api/admin/leads/**,
// requires ROLE_ADMIN). Status changes, assignment, follow-ups, and
// conversion are logged as LeadActivity entries (GET .../{id}/activities —
// "Lead follow-up" history). Converting a qualified lead creates an
// Opportunity (see useOpportunities) — not a Customer directly — and moves
// status to CONVERTED, which is terminal. The Opportunity becomes a
// Customer only once it's won.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFIED' | 'PROPOSAL' | 'NEGOTIATION' | 'CONVERTED' | 'LOST'
export type LeadSource = 'WEBSITE' | 'REFERRAL' | 'COLD_CALL' | 'SOCIAL_MEDIA' | 'ADVERTISEMENT' | 'TRADE_SHOW' | 'EMAIL_CAMPAIGN' | 'OTHER'
export type LeadActivityType = 'CREATED' | 'STATUS_CHANGE' | 'ASSIGNED' | 'FOLLOW_UP' | 'CONVERTED' | 'NOTE'

export interface Lead {
  id: number
  companyId: number
  companyName: string | null
  contactName: string
  organizationName: string | null
  email: string | null
  phone: string | null
  source: LeadSource
  status: LeadStatus
  assignedToUserId: number | null
  assignedToUsername: string | null
  estimatedValue: number | null
  notes: string | null
  convertedOpportunityId: number | null
  convertedOpportunityName: string | null
  convertedAt: string | null
  createdBy: string | null
}

export interface LeadActivity {
  id: number
  leadId: number
  type: LeadActivityType
  description: string
  createdBy: string | null
  createdAt: string
}

export interface LeadFilter {
  search?: string
  companyId?: number
  status?: LeadStatus
  source?: LeadSource
  assignedToUserId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface LeadPayload {
  companyId: number
  contactName: string
  organizationName?: string
  email?: string
  phone?: string
  source: LeadSource
  assignedToUserId?: number
  estimatedValue?: number
  notes?: string
}

export function useLeads() {
  const api = useApi()

  function list(filter: LeadFilter = {}) {
    return api<PageEnvelope<Lead>>('/api/admin/leads', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Lead>>(`/api/admin/leads/${id}`)
    return res.data
  }

  async function create(payload: LeadPayload) {
    const res = await api<ApiEnvelope<Lead>>('/api/admin/leads', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: Omit<LeadPayload, 'assignedToUserId'>) {
    const res = await api<ApiEnvelope<Lead>>(`/api/admin/leads/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function updateStatus(id: number, status: LeadStatus) {
    const res = await api<ApiEnvelope<Lead>>(`/api/admin/leads/${id}/status`, { method: 'PUT', body: { status } })
    return res.data
  }

  async function assign(id: number, assignedToUserId: number | undefined) {
    const res = await api<ApiEnvelope<Lead>>(`/api/admin/leads/${id}/assign`, { method: 'PUT', body: { assignedToUserId } })
    return res.data
  }

  async function convert(id: number) {
    const res = await api<ApiEnvelope<Lead>>(`/api/admin/leads/${id}/convert`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/leads/${id}`, { method: 'DELETE' })
  }

  function listActivities(id: number, page = 1, size = 20) {
    return api<PageEnvelope<LeadActivity>>(`/api/admin/leads/${id}/activities`, { query: { page, size } })
  }

  async function addFollowUp(id: number, description: string) {
    const res = await api<ApiEnvelope<LeadActivity>>(`/api/admin/leads/${id}/activities`, { method: 'POST', body: { description } })
    return res.data
  }

  return { list, get, create, update, updateStatus, assign, convert, remove, listActivities, addFollowUp }
}
