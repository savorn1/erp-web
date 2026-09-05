// Wraps the backend's admin-only DeliveryController
// (/api/admin/deliveries/**, requires ROLE_ADMIN). Moves through a
// pick -> pack -> ship -> deliver workflow — stock only actually decreases
// at ship() (see DeliveryServiceImpl.shipDelivery); everything before that
// is just planning, so a pending/picked/packed delivery can still be
// cancelled with zero stock effect.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type DeliveryStatus = 'PENDING' | 'PICKED' | 'PACKED' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED'

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
  status: DeliveryStatus
  notes: string | null
  createdBy: string | null
  pickedBy: string | null
  pickedAt: string | null
  packedBy: string | null
  packedAt: string | null
  shippedBy: string | null
  shippedAt: string | null
  deliveredBy: string | null
  deliveredAt: string | null
  lines: DeliveryLine[] | null
}

export interface DeliveryFilter {
  deliveryNumber?: string
  companyId?: number
  salesOrderId?: number
  warehouseId?: number
  status?: DeliveryStatus
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
  // that already exists. Not validated for existence until ship().
  batchNumber?: string
  // Required when the product is SERIAL-tracked — must have exactly
  // quantityDelivered entries. Not validated for existence until ship().
  serialNumbers?: string[]
}

export interface DeliveryPayload {
  salesOrderId: number
  deliveryDate: string
  notes?: string
  lines: DeliveryLinePayload[]
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

  async function pick(id: number) {
    const res = await api<ApiEnvelope<Delivery>>(`/api/admin/deliveries/${id}/pick`, { method: 'POST' })
    return res.data
  }

  async function pack(id: number) {
    const res = await api<ApiEnvelope<Delivery>>(`/api/admin/deliveries/${id}/pack`, { method: 'POST' })
    return res.data
  }

  async function ship(id: number) {
    const res = await api<ApiEnvelope<Delivery>>(`/api/admin/deliveries/${id}/ship`, { method: 'POST' })
    return res.data
  }

  async function complete(id: number) {
    const res = await api<ApiEnvelope<Delivery>>(`/api/admin/deliveries/${id}/complete`, { method: 'POST' })
    return res.data
  }

  async function cancel(id: number) {
    const res = await api<ApiEnvelope<Delivery>>(`/api/admin/deliveries/${id}/cancel`, { method: 'POST' })
    return res.data
  }

  return { list, get, create, pick, pack, ship, complete, cancel }
}
