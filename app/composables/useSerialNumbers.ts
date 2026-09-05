// Wraps the backend's admin-only SerialNumberController
// (/api/admin/serial-numbers/**, requires ROLE_ADMIN). Read-only — serial
// numbers are only ever created by goods receipt posting for SERIAL-tracked
// products (see useGoodsReceipts). IN_TRANSIT/ISSUED are set by deliveries
// and stock transfers (see useDeliveries/useStockTransfers).

export type SerialNumberStatus = 'IN_STOCK' | 'IN_TRANSIT' | 'ISSUED'

export interface SerialNumber {
  id: number
  companyId: number
  productId: number
  productName: string | null
  productSku: string | null
  warehouseId: number
  warehouseName: string | null
  binId: number | null
  binName: string | null
  batchNumber: string | null
  expirationDate: string | null
  serialNumber: string
  status: SerialNumberStatus
  createdAt: string
}

export interface SerialNumberFilter {
  serialNumber?: string
  companyId?: number
  productId?: number
  warehouseId?: number
  status?: SerialNumberStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

interface PageEnvelope<T> {
  traceId: string
  statusCode: number
  message: string
  data: T[]
  metadata: { hasNext: boolean; hasPrev: boolean; totalPage: number; currentPage: number; limit: number; totalCount: number }
}

export function useSerialNumbers() {
  const api = useApi()

  function list(filter: SerialNumberFilter = {}) {
    return api<PageEnvelope<SerialNumber>>('/api/admin/serial-numbers', { query: filter })
  }

  return { list }
}
