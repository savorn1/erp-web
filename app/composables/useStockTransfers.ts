// Wraps the backend's admin-only StockTransferController
// (/api/admin/stock-transfers/**, requires ROLE_ADMIN). Moves through a
// four-stage workflow via dedicated actions — request (create) -> approve ->
// ship -> receive — plus reject/cancel/delete escape hatches. The backend
// enforces which transitions are legal from which status.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type StockTransferStatus = 'REQUESTED' | 'APPROVED' | 'SHIPPED' | 'RECEIVED' | 'REJECTED' | 'CANCELLED'

export interface StockTransferLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  quantityRequested: number
  sourceBinId: number | null
  sourceBinName: string | null
  destinationBinId: number | null
  destinationBinName: string | null
  batchId: number | null
  batchNumber: string | null
  quantityShipped: number | null
  quantityReceived: number | null
  serialNumbers: string[]
}

export interface StockTransfer {
  id: number
  companyId: number
  sourceWarehouseId: number
  sourceWarehouseName: string | null
  destinationWarehouseId: number
  destinationWarehouseName: string | null
  transferNumber: string
  requestDate: string
  shipDate: string | null
  receiveDate: string | null
  status: StockTransferStatus
  notes: string | null
  requestedBy: string | null
  approvedBy: string | null
  shippedBy: string | null
  receivedBy: string | null
  lines: StockTransferLine[] | null
}

export interface StockTransferFilter {
  transferNumber?: string
  companyId?: number
  sourceWarehouseId?: number
  destinationWarehouseId?: number
  status?: StockTransferStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface StockTransferLinePayload {
  productId: number
  quantityRequested: number
  sourceBinId?: number
  destinationBinId?: number
  // Required when the product is BATCH- or SERIAL-tracked — must reference
  // a batch that already exists at the source warehouse.
  batchNumber?: string
}

export interface StockTransferPayload {
  companyId: number
  sourceWarehouseId: number
  destinationWarehouseId: number
  requestDate: string
  notes?: string
  lines: StockTransferLinePayload[]
}

export interface ShipStockTransferLinePayload {
  stockTransferLineId: number
  // Required when the line's product is SERIAL-tracked — must contain
  // exactly quantityRequested serial numbers.
  serialNumbers?: string[]
}

export function useStockTransfers() {
  const api = useApi()

  function list(filter: StockTransferFilter = {}) {
    return api<PageEnvelope<StockTransfer>>('/api/admin/stock-transfers', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<StockTransfer>>(`/api/admin/stock-transfers/${id}`)
    return res.data
  }

  async function create(payload: StockTransferPayload) {
    const res = await api<ApiEnvelope<StockTransfer>>('/api/admin/stock-transfers', { method: 'POST', body: payload })
    return res.data
  }

  async function approve(id: number) {
    const res = await api<ApiEnvelope<StockTransfer>>(`/api/admin/stock-transfers/${id}/approve`, { method: 'POST' })
    return res.data
  }

  async function reject(id: number) {
    const res = await api<ApiEnvelope<StockTransfer>>(`/api/admin/stock-transfers/${id}/reject`, { method: 'POST' })
    return res.data
  }

  async function ship(id: number, lines?: ShipStockTransferLinePayload[]) {
    const res = await api<ApiEnvelope<StockTransfer>>(`/api/admin/stock-transfers/${id}/ship`, { method: 'POST', body: { lines } })
    return res.data
  }

  async function receive(id: number) {
    const res = await api<ApiEnvelope<StockTransfer>>(`/api/admin/stock-transfers/${id}/receive`, { method: 'POST' })
    return res.data
  }

  async function cancel(id: number) {
    const res = await api<ApiEnvelope<StockTransfer>>(`/api/admin/stock-transfers/${id}/cancel`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/stock-transfers/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, approve, reject, ship, receive, cancel, remove }
}
