// Wraps the backend's admin-only GoodsReceiptController
// (/api/admin/goods-receipts/**, requires ROLE_ADMIN). Posting a receipt
// reserves the lines PENDING quality check — stock only moves, and the
// receipt reaches COMPLETED, once every line is passed or failed via
// qualityCheck(). There's no update/delete, a posted receipt is an
// immutable ledger entry.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type GoodsReceiptStatus = 'PENDING_QC' | 'COMPLETED'
export type QualityCheckStatus = 'PENDING' | 'PASSED' | 'FAILED'

export interface GoodsReceiptLine {
  id: number
  purchaseOrderLineId: number
  productId: number
  productName: string | null
  productSku: string | null
  quantityReceived: number
  binId: number | null
  binName: string | null
  batchId: number | null
  batchNumber: string | null
  expirationDate: string | null
  serialNumbers: string[]
  qualityStatus: QualityCheckStatus
  qualityNotes: string | null
  qualityCheckedBy: string | null
  qualityCheckedAt: string | null
}

export interface GoodsReceipt {
  id: number
  companyId: number
  purchaseOrderId: number
  poNumber: string | null
  warehouseId: number
  warehouseName: string | null
  receiptNumber: string
  receiptDate: string
  status: GoodsReceiptStatus
  notes: string | null
  createdBy: string | null
  lines: GoodsReceiptLine[] | null
}

export interface GoodsReceiptFilter {
  receiptNumber?: string
  companyId?: number
  purchaseOrderId?: number
  warehouseId?: number
  status?: GoodsReceiptStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface GoodsReceiptLinePayload {
  purchaseOrderLineId: number
  quantityReceived: number
  binId?: number
  // Required when the product is BATCH-tracked.
  batchNumber?: string
  expirationDate?: string
  // Required when the product is SERIAL-tracked — must have exactly
  // quantityReceived entries.
  serialNumbers?: string[]
}

export interface GoodsReceiptPayload {
  purchaseOrderId: number
  receiptDate: string
  notes?: string
  lines: GoodsReceiptLinePayload[]
}

export interface QualityCheckPayload {
  // Must be PASSED or FAILED.
  status: Exclude<QualityCheckStatus, 'PENDING'>
  notes?: string
}

export function useGoodsReceipts() {
  const api = useApi()

  function list(filter: GoodsReceiptFilter = {}) {
    return api<PageEnvelope<GoodsReceipt>>('/api/admin/goods-receipts', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<GoodsReceipt>>(`/api/admin/goods-receipts/${id}`)
    return res.data
  }

  async function create(payload: GoodsReceiptPayload) {
    const res = await api<ApiEnvelope<GoodsReceipt>>('/api/admin/goods-receipts', { method: 'POST', body: payload })
    return res.data
  }

  async function qualityCheck(receiptId: number, lineId: number, payload: QualityCheckPayload) {
    const res = await api<ApiEnvelope<GoodsReceipt>>(`/api/admin/goods-receipts/${receiptId}/lines/${lineId}/quality-check`, {
      method: 'POST',
      body: payload
    })
    return res.data
  }

  return { list, get, create, qualityCheck }
}
