// Wraps the backend's admin-only GoodsReceiptController
// (/api/admin/goods-receipts/**, requires ROLE_ADMIN). Posting a receipt
// increases stock immediately — there's no update/delete, a posted receipt
// is an immutable ledger entry.

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
  notes: string | null
  createdBy: string | null
  lines: GoodsReceiptLine[] | null
}

export interface GoodsReceiptFilter {
  receiptNumber?: string
  companyId?: number
  purchaseOrderId?: number
  warehouseId?: number
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

  return { list, get, create }
}
