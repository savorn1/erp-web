// Wraps the backend's admin-only SupplierController (/api/admin/suppliers/**,
// requires ROLE_ADMIN). Supplier type is resolved server-side into a display
// name. currentBalance only ever changes via adjustBalance — the general
// update endpoint doesn't accept it. Mirrors useCustomers.

export type SupplierStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED'
export type SupplierPaymentTerms = 'DUE_ON_RECEIPT' | 'NET_15' | 'NET_30' | 'NET_45' | 'NET_60' | 'COD'
export type SupplierBalanceAdjustmentType = 'CHARGE' | 'PAYMENT'
export type SupplierActivityType = 'CREATED' | 'STATUS_CHANGE' | 'BALANCE_ADJUSTMENT' | 'NOTE'

export interface Supplier {
  id: number
  companyId: number
  companyName: string | null
  supplierTypeId: number | null
  supplierTypeName: string | null
  name: string
  contactName: string | null
  phone: string | null
  email: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  paymentTerms: SupplierPaymentTerms
  creditLimit: number
  status: SupplierStatus
  currentBalance: number
}

export interface SupplierActivity {
  id: number
  supplierId: number
  type: SupplierActivityType
  description: string
  amount: number | null
  createdBy: string | null
  createdAt: string
}

export interface SupplierFilter {
  name?: string
  companyId?: number
  supplierTypeId?: number
  status?: SupplierStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface SupplierPayload {
  companyId: number
  supplierTypeId?: number
  name: string
  contactName?: string
  phone?: string
  email?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  postalCode?: string
  country?: string
  paymentTerms: SupplierPaymentTerms
  creditLimit: number
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

export function useSuppliers() {
  const api = useApi()

  function list(filter: SupplierFilter = {}) {
    return api<PageEnvelope<Supplier>>('/api/admin/suppliers', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Supplier>>(`/api/admin/suppliers/${id}`)
    return res.data
  }

  async function create(payload: SupplierPayload) {
    const res = await api<ApiEnvelope<Supplier>>('/api/admin/suppliers', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: SupplierPayload) {
    const res = await api<ApiEnvelope<Supplier>>(`/api/admin/suppliers/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function updateStatus(id: number, status: SupplierStatus) {
    const res = await api<ApiEnvelope<Supplier>>(`/api/admin/suppliers/${id}/status`, { method: 'PUT', body: { status } })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/suppliers/${id}`, { method: 'DELETE' })
  }

  async function adjustBalance(id: number, type: SupplierBalanceAdjustmentType, amount: number, note?: string) {
    const res = await api<ApiEnvelope<Supplier>>(`/api/admin/suppliers/${id}/balance-adjustments`, {
      method: 'POST',
      body: { type, amount, note }
    })
    return res.data
  }

  function listActivities(id: number, page = 1, size = 20) {
    return api<PageEnvelope<SupplierActivity>>(`/api/admin/suppliers/${id}/activities`, { query: { page, size } })
  }

  async function addNote(id: number, description: string) {
    const res = await api<ApiEnvelope<SupplierActivity>>(`/api/admin/suppliers/${id}/activities`, {
      method: 'POST',
      body: { description }
    })
    return res.data
  }

  return { list, get, create, update, updateStatus, remove, adjustBalance, listActivities, addNote }
}
