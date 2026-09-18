// Wraps the backend's admin-only TicketController (/api/admin/tickets/**).
// Unlike RMA/CreditNote/PettyCashEntry ("create = immediate effect, then
// append-only"), a ticket is a long-lived mutable record — editable while
// OPEN/IN_PROGRESS via update(), walked through start -> resolve -> close,
// reopenable from resolved/closed back to open. Comments are the
// append-only part (an internal note vs. a customer-visible reply).
// `overdue`/`daysOpen` are computed server-side from a fixed priority ->
// target-days map, not stored — there's no DB-level "overdue" filter, the
// list page filters the already-loaded page client-side instead.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
export type TicketPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'

export interface TicketComment {
  id: number
  authorUsername: string | null
  body: string
  internal: boolean
  createdAt: string
}

export interface Ticket {
  id: number
  companyId: number
  customerId: number
  customerName: string | null
  productId: number | null
  productName: string | null
  ticketNumber: string
  subject: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  assignedToUserId: number | null
  assignedToUsername: string | null
  createdBy: string | null
  createdAt: string
  resolvedAt: string | null
  closedAt: string | null
  daysOpen: number
  overdue: boolean
  comments: TicketComment[] | null
}

export interface TicketFilter {
  companyId?: number
  customerId?: number
  status?: TicketStatus
  priority?: TicketPriority
  assignedToUserId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CreateTicketPayload {
  companyId: number
  customerId: number
  productId?: number
  subject: string
  description: string
  priority?: TicketPriority
  assignedToUserId?: number
}

export interface UpdateTicketPayload {
  subject: string
  description: string
  priority: TicketPriority
  productId?: number
  assignedToUserId?: number
}

export interface AddTicketCommentPayload {
  body: string
  internal?: boolean
}

export function useTickets() {
  const api = useApi()

  function list(filter: TicketFilter = {}) {
    return api<PageEnvelope<Ticket>>('/api/admin/tickets', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Ticket>>(`/api/admin/tickets/${id}`)
    return res.data
  }

  async function create(payload: CreateTicketPayload) {
    const res = await api<ApiEnvelope<Ticket>>('/api/admin/tickets', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: UpdateTicketPayload) {
    const res = await api<ApiEnvelope<Ticket>>(`/api/admin/tickets/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function addComment(id: number, payload: AddTicketCommentPayload) {
    const res = await api<ApiEnvelope<Ticket>>(`/api/admin/tickets/${id}/comments`, { method: 'POST', body: payload })
    return res.data
  }

  async function start(id: number) {
    const res = await api<ApiEnvelope<Ticket>>(`/api/admin/tickets/${id}/start`, { method: 'POST' })
    return res.data
  }

  async function resolve(id: number) {
    const res = await api<ApiEnvelope<Ticket>>(`/api/admin/tickets/${id}/resolve`, { method: 'POST' })
    return res.data
  }

  async function close(id: number) {
    const res = await api<ApiEnvelope<Ticket>>(`/api/admin/tickets/${id}/close`, { method: 'POST' })
    return res.data
  }

  async function reopen(id: number) {
    const res = await api<ApiEnvelope<Ticket>>(`/api/admin/tickets/${id}/reopen`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/tickets/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, addComment, start, resolve, close, reopen, remove }
}
