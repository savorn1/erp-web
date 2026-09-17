// Wraps the backend's admin-only PosExchangeController
// (/api/admin/pos-exchanges/**). A partial-line return from a completed
// PosSale, optionally bundled with new item(s), netted into a single signed
// settlement — see PosExchangeServiceImpl for the accounting.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'
import type { PosCheckoutLinePayload, PosTenderMethod } from '~/composables/usePosSales'

export interface PosExchangeReturnLine {
  id: number
  originalPosSaleLineId: number
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  unitPrice: number
  discountPercent: number
  taxRate: number
  lineValue: number
}

export interface PosExchangeNewLine {
  id: number
  productId: number
  productName: string | null
  productSku: string | null
  quantity: number
  unitPrice: number
  discountPercent: number
  taxRate: number
  lineTotal: number
}

export interface PosExchange {
  id: number
  companyId: number
  warehouseId: number
  registerId: number
  registerName: string | null
  posSessionId: number
  originalPosSaleId: number
  originalSaleNumber: string | null
  exchangeNumber: string
  exchangeDate: string
  returnValue: number
  returnTaxValue: number
  newValue: number
  newTaxValue: number
  netAmount: number
  settlementMethod: PosTenderMethod | null
  settlementAmount: number | null
  settlementReference: string | null
  createdBy: string | null
  returnLines: PosExchangeReturnLine[]
  newLines: PosExchangeNewLine[]
  changeDue: number | null
}

export interface PosExchangeFilter {
  exchangeNumber?: string
  companyId?: number
  registerId?: number
  originalPosSaleId?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface PosExchangeReturnLinePayload {
  posSaleLineId: number
  quantity: number
}

export interface PosExchangePayload {
  posSessionId: number
  originalPosSaleId: number
  returnLines: PosExchangeReturnLinePayload[]
  newLines: PosCheckoutLinePayload[]
  settlementMethod?: PosTenderMethod
  settlementReference?: string
  cashTendered?: number
}

export function usePosExchanges() {
  const api = useApi()

  function list(filter: PosExchangeFilter = {}) {
    return api<PageEnvelope<PosExchange>>('/api/admin/pos-exchanges', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<PosExchange>>(`/api/admin/pos-exchanges/${id}`)
    return res.data
  }

  async function create(payload: PosExchangePayload) {
    const res = await api<ApiEnvelope<PosExchange>>('/api/admin/pos-exchanges', { method: 'POST', body: payload })
    return res.data
  }

  return { list, get, create }
}
