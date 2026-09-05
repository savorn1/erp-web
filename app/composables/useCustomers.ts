// Wraps the backend's admin-only CustomerController (/api/admin/customers/**,
// requires ROLE_ADMIN). Customer type/group are resolved server-side into
// display names. currentBalance only ever changes via adjustBalance — the
// general update endpoint doesn't accept it.

export type CustomerStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
export type CustomerPaymentTerms = 'DUE_ON_RECEIPT' | 'NET_15' | 'NET_30' | 'NET_45' | 'NET_60' | 'COD'
export type CustomerBalanceAdjustmentType = 'CHARGE' | 'PAYMENT'
export type CustomerActivityType = 'CREATED' | 'STATUS_CHANGE' | 'BALANCE_ADJUSTMENT' | 'NOTE'

export interface Customer {
  id: number
  companyId: number
  companyName: string | null
  customerTypeId: number | null
  customerTypeName: string | null
  customerGroupId: number | null
  customerGroupName: string | null
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  billingAddressLine1: string | null
  billingAddressLine2: string | null
  billingCity: string | null
  billingState: string | null
  billingPostalCode: string | null
  billingCountry: string | null
  shippingAddressLine1: string | null
  shippingAddressLine2: string | null
  shippingCity: string | null
  shippingState: string | null
  shippingPostalCode: string | null
  shippingCountry: string | null
  creditLimit: number
  paymentTerms: CustomerPaymentTerms
  status: CustomerStatus
  currentBalance: number
}

export interface CustomerActivity {
  id: number
  customerId: number
  type: CustomerActivityType
  description: string
  amount: number | null
  createdBy: string | null
  createdAt: string
}

export interface CustomerFilter {
  name?: string
  companyId?: number
  customerTypeId?: number
  customerGroupId?: number
  status?: CustomerStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface CustomerPayload {
  companyId: number
  customerTypeId?: number
  customerGroupId?: number
  name: string
  contactName?: string
  phone?: string
  email?: string
  billingAddressLine1?: string
  billingAddressLine2?: string
  billingCity?: string
  billingState?: string
  billingPostalCode?: string
  billingCountry?: string
  shippingAddressLine1?: string
  shippingAddressLine2?: string
  shippingCity?: string
  shippingState?: string
  shippingPostalCode?: string
  shippingCountry?: string
  creditLimit: number
  paymentTerms: CustomerPaymentTerms
}

interface ApiEnvelope<T> {
  traceId: string
  statusCode: number
  message: string
  data: T
}

interface PageEnvelope<T> {
  traceId: string
  statusCode: number
  message: string
  data: T[]
  metadata: { hasNext: boolean; hasPrev: boolean; totalPage: number; currentPage: number; limit: number; totalCount: number }
}

export function useCustomers() {
  const api = useApi()

  function list(filter: CustomerFilter = {}) {
    return api<PageEnvelope<Customer>>('/api/admin/customers', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Customer>>(`/api/admin/customers/${id}`)
    return res.data
  }

  async function create(payload: CustomerPayload) {
    const res = await api<ApiEnvelope<Customer>>('/api/admin/customers', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: CustomerPayload) {
    const res = await api<ApiEnvelope<Customer>>(`/api/admin/customers/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function updateStatus(id: number, status: CustomerStatus) {
    const res = await api<ApiEnvelope<Customer>>(`/api/admin/customers/${id}/status`, { method: 'PUT', body: { status } })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/customers/${id}`, { method: 'DELETE' })
  }

  async function adjustBalance(id: number, type: CustomerBalanceAdjustmentType, amount: number, note?: string) {
    const res = await api<ApiEnvelope<Customer>>(`/api/admin/customers/${id}/balance-adjustments`, {
      method: 'POST',
      body: { type, amount, note }
    })
    return res.data
  }

  function listActivities(id: number, page = 1, size = 20) {
    return api<PageEnvelope<CustomerActivity>>(`/api/admin/customers/${id}/activities`, { query: { page, size } })
  }

  async function addNote(id: number, description: string) {
    const res = await api<ApiEnvelope<CustomerActivity>>(`/api/admin/customers/${id}/activities`, {
      method: 'POST',
      body: { description }
    })
    return res.data
  }

  return { list, get, create, update, updateStatus, remove, adjustBalance, listActivities, addNote }
}
