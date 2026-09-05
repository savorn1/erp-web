// Wraps the backend's admin-only DeliveryController
// (/api/admin/deliveries/**, requires ROLE_ADMIN). Posting a delivery
// decreases stock immediately — there's no update/delete, a posted delivery
// is an immutable ledger entry.

export interface DeliveryLine {
  id: number
  salesOrderLineId: number
  productId: number
  productName: string | null
  productSku: string | null
  quantityDelivered: number
  binId: number | null
  binName: string | null
  batchId: number | null
  batchNumber: string | null
  serialNumbers: string[]
}

export interface Delivery {
  id: number
  companyId: number
  salesOrderId: number
  soNumber: string | null
  warehouseId: number
  warehouseName: string | null
  deliveryNumber: string
  deliveryDate: string
  notes: string | null
  createdBy: string | null
  lines: DeliveryLine[] | null
}

export interface DeliveryFilter {
  deliveryNumber?: string
  companyId?: number
  salesOrderId?: number
  warehouseId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface DeliveryLinePayload {
  salesOrderLineId: number
  quantityDelivered: number
  binId?: number
  // Required when the product is BATCH-tracked — must reference a batch
  // that already exists.
  batchNumber?: string
  // Required when the product is SERIAL-tracked — must have exactly
  // quantityDelivered entries, each currently IN_STOCK.
  serialNumbers?: string[]
}

export interface DeliveryPayload {
  salesOrderId: number
  deliveryDate: string
  notes?: string
  lines: DeliveryLinePayload[]
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

export function useDeliveries() {
  const api = useApi()

  function list(filter: DeliveryFilter = {}) {
    return api<PageEnvelope<Delivery>>('/api/admin/deliveries', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<Delivery>>(`/api/admin/deliveries/${id}`)
    return res.data
  }

  async function create(payload: DeliveryPayload) {
    const res = await api<ApiEnvelope<Delivery>>('/api/admin/deliveries', { method: 'POST', body: payload })
    return res.data
  }

  return { list, get, create }
}
