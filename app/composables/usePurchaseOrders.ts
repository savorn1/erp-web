// Wraps the backend's admin-only PurchaseOrderController
// (/api/admin/purchase-orders/**, requires ROLE_ADMIN). Status moves through
// dedicated actions (submit/cancel) rather than a generic setter — the
// backend enforces which transitions are legal.

export type PurchaseOrderStatus = 'DRAFT' | 'SUBMITTED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'CANCELLED'

export interface PurchaseOrderLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  quantityOrdered: number
  unitCost: number
  quantityReceived: number
  lineTotal: number
}

export interface PurchaseOrder {
  id: number
  companyId: number
  companyName: string | null
  supplierId: number
  supplierName: string | null
  warehouseId: number
  warehouseName: string | null
  poNumber: string
  orderDate: string
  expectedDate: string | null
  status: PurchaseOrderStatus
  notes: string | null
  createdBy: string | null
  totalAmount: number
  lines: PurchaseOrderLine[] | null
}

export interface PurchaseOrderFilter {
  poNumber?: string
  companyId?: number
  supplierId?: number
  warehouseId?: number
  status?: PurchaseOrderStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface PurchaseOrderLinePayload {
  productId: number
  quantityOrdered: number
  unitCost: number
}

export interface PurchaseOrderPayload {
  companyId: number
  supplierId: number
  warehouseId: number
  orderDate: string
  expectedDate?: string
  notes?: string
  lines: PurchaseOrderLinePayload[]
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

export function usePurchaseOrders() {
  const api = useApi()

  function list(filter: PurchaseOrderFilter = {}) {
    return api<PageEnvelope<PurchaseOrder>>('/api/admin/purchase-orders', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<PurchaseOrder>>(`/api/admin/purchase-orders/${id}`)
    return res.data
  }

  async function create(payload: PurchaseOrderPayload) {
    const res = await api<ApiEnvelope<PurchaseOrder>>('/api/admin/purchase-orders', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: PurchaseOrderPayload) {
    const res = await api<ApiEnvelope<PurchaseOrder>>(`/api/admin/purchase-orders/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function submit(id: number) {
    const res = await api<ApiEnvelope<PurchaseOrder>>(`/api/admin/purchase-orders/${id}/submit`, { method: 'POST' })
    return res.data
  }

  async function cancel(id: number) {
    const res = await api<ApiEnvelope<PurchaseOrder>>(`/api/admin/purchase-orders/${id}/cancel`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/purchase-orders/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, submit, cancel, remove }
}
