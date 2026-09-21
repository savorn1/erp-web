// Wraps the backend's admin-only SerialNumberController
// (/api/admin/serial-numbers/**, requires ROLE_ADMIN). Read-only here — a unit
// is only ever created, and its status only ever changed, by the documents that
// move it:
//
//   goods receipt posted      -> PENDING_QC, then IN_STOCK or QC_REJECTED
//                                once the quality check is recorded
//   stock adjustment approved -> IN_STOCK (STOCK_INCREASE creates units and
//                                skips QC) or ADJUSTED_OUT (removes them)
//   delivery shipped          -> ISSUED
//   stock transfer            -> IN_TRANSIT while in flight, IN_STOCK on receipt
//   RMA resolved              -> back to IN_STOCK for REFUND/REPLACEMENT;
//                                REPAIR leaves it ISSUED
//
// See useGoodsReceipts / useStockAdjustments / useDeliveries / useStockTransfers
// / useRmas for each.

import type { PageEnvelope } from '#shared/types'

// Mirrors the backend SerialNumberStatus enum — all six values. ISSUED,
// ADJUSTED_OUT and QC_REJECTED are terminal; only IN_TRANSIT and PENDING_QC
// are transitional.
export type SerialNumberStatus = 'PENDING_QC' | 'IN_STOCK' | 'IN_TRANSIT' | 'ISSUED' | 'ADJUSTED_OUT' | 'QC_REJECTED'

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

export function useSerialNumbers() {
  const api = useApi()

  function list(filter: SerialNumberFilter = {}) {
    return api<PageEnvelope<SerialNumber>>('/api/admin/serial-numbers', { query: filter })
  }

  return { list }
}
