// Wraps the backend's admin-only SalesOrderController
// (/api/admin/sales-orders/**, requires ROLE_ADMIN). Status moves through
// dedicated actions (submit/cancel) rather than a generic setter — the
// backend enforces which transitions are legal.

export type SalesOrderStatus = 'DRAFT' | 'SUBMITTED' | 'PARTIALLY_DELIVERED' | 'DELIVERED' | 'CANCELLED'

export interface SalesOrderLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  quantityOrdered: number
  unitPrice: number
  quantityDelivered: number
  lineTotal: number
}

export interface SalesOrder {
  id: number
  companyId: number
  companyName: string | null
  customerId: number
  customerName: string | null
  warehouseId: number
  warehouseName: string | null
  soNumber: string
  orderDate: string
  expectedDate: string | null
  status: SalesOrderStatus
  notes: string | null
  createdBy: string | null
  totalAmount: number
  lines: SalesOrderLine[] | null
}

export interface SalesOrderFilter {
  soNumber?: string
  companyId?: number
  customerId?: number
  warehouseId?: number
  status?: SalesOrderStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface SalesOrderLinePayload {
  productId: number
  quantityOrdered: number
  unitPrice: number
}

export interface SalesOrderPayload {
  companyId: number
  customerId: number
  warehouseId: number
  orderDate: string
  expectedDate?: string
  notes?: string
  lines: SalesOrderLinePayload[]
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

export function useSalesOrders() {
  const api = useApi()

  function list(filter: SalesOrderFilter = {}) {
    return api<PageEnvelope<SalesOrder>>('/api/admin/sales-orders', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<SalesOrder>>(`/api/admin/sales-orders/${id}`)
    return res.data
  }

  async function create(payload: SalesOrderPayload) {
    const res = await api<ApiEnvelope<SalesOrder>>('/api/admin/sales-orders', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: SalesOrderPayload) {
    const res = await api<ApiEnvelope<SalesOrder>>(`/api/admin/sales-orders/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function submit(id: number) {
    const res = await api<ApiEnvelope<SalesOrder>>(`/api/admin/sales-orders/${id}/submit`, { method: 'POST' })
    return res.data
  }

  async function cancel(id: number) {
    const res = await api<ApiEnvelope<SalesOrder>>(`/api/admin/sales-orders/${id}/cancel`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/sales-orders/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, submit, cancel, remove }
}
