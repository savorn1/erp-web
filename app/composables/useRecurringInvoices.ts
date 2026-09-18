// Wraps the backend's admin-only RecurringInvoiceController
// (/api/admin/recurring-invoices/**). A template generates a real
// SalesOrder -> Invoice every time it's due — there's no background job
// anywhere in this app, so nothing happens until someone clicks
// "Generate due invoices" (generateDue()).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type RecurringInvoiceFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'YEARLY'

export interface RecurringInvoiceTemplateLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  unitPrice: number | null
  discountPercent: number | null
  taxRate: number | null
}

export interface RecurringInvoiceTemplate {
  id: number
  companyId: number
  companyName: string | null
  customerId: number
  customerName: string | null
  warehouseId: number
  warehouseName: string | null
  name: string
  frequency: RecurringInvoiceFrequency
  startDate: string
  nextRunDate: string
  lastGeneratedDate: string | null
  endDate: string | null
  active: boolean
  autoApproveInvoice: boolean
  autoEmailInvoice: boolean
  notes: string | null
  createdBy: string | null
  lines: RecurringInvoiceTemplateLine[] | null
}

export interface RecurringInvoiceTemplateFilter {
  companyId?: number
  customerId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface RecurringInvoiceTemplateLinePayload {
  productId: number
  quantity: number
  unitPrice?: number
  discountPercent?: number
  taxRate?: number
}

export interface CreateRecurringInvoiceTemplatePayload {
  companyId: number
  customerId: number
  warehouseId: number
  name: string
  frequency: RecurringInvoiceFrequency
  startDate: string
  endDate?: string
  autoApproveInvoice?: boolean
  autoEmailInvoice?: boolean
  notes?: string
  lines: RecurringInvoiceTemplateLinePayload[]
}

export interface UpdateRecurringInvoiceTemplatePayload {
  customerId: number
  warehouseId: number
  name: string
  frequency: RecurringInvoiceFrequency
  nextRunDate: string
  endDate?: string
  active: boolean
  autoApproveInvoice: boolean
  autoEmailInvoice: boolean
  notes?: string
  lines: RecurringInvoiceTemplateLinePayload[]
}

export interface GenerateDueInvoicesResult {
  templateId: number
  templateName: string
  success: boolean
  invoiceNumber: string | null
  errorMessage: string | null
}

export interface GenerateDueInvoicesResponse {
  processedCount: number
  successCount: number
  failureCount: number
  results: GenerateDueInvoicesResult[]
}

export function useRecurringInvoices() {
  const api = useApi()

  function list(filter: RecurringInvoiceTemplateFilter = {}) {
    return api<PageEnvelope<RecurringInvoiceTemplate>>('/api/admin/recurring-invoices', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<RecurringInvoiceTemplate>>(`/api/admin/recurring-invoices/${id}`)
    return res.data
  }

  async function create(payload: CreateRecurringInvoiceTemplatePayload) {
    const res = await api<ApiEnvelope<RecurringInvoiceTemplate>>('/api/admin/recurring-invoices', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: UpdateRecurringInvoiceTemplatePayload) {
    const res = await api<ApiEnvelope<RecurringInvoiceTemplate>>(`/api/admin/recurring-invoices/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/recurring-invoices/${id}`, { method: 'DELETE' })
  }

  async function generateDue(companyId?: number) {
    const res = await api<ApiEnvelope<GenerateDueInvoicesResponse>>('/api/admin/recurring-invoices/generate-due', {
      method: 'POST',
      query: companyId ? { companyId } : {}
    })
    return res.data
  }

  return { list, get, create, update, remove, generateDue }
}
