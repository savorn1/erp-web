// Wraps the backend's admin-only UomConversionController
// (/api/admin/uom-conversions/**, requires ROLE_ADMIN). Each row is a
// directed conversion edge between two units in the same UOM category — see
// useUnitsOfMeasure for the per-unit "conversion factor to base" field,
// which is backed by these same rows under the hood.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface UomConversion {
  id: number
  companyId: number
  companyName: string | null
  fromUnitOfMeasureId: number
  fromUnitOfMeasureName: string | null
  fromUnitOfMeasureAbbreviation: string | null
  toUnitOfMeasureId: number
  toUnitOfMeasureName: string | null
  toUnitOfMeasureAbbreviation: string | null
  conversionFactor: number
  active: boolean
}

export interface UomConversionFilter {
  companyId?: number
  unitOfMeasureId?: number
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface UomConversionPayload {
  companyId: number
  fromUnitOfMeasureId: number
  toUnitOfMeasureId: number
  conversionFactor: number
  active: boolean
}

export interface ConvertUnitsPayload {
  companyId: number
  fromUnitOfMeasureId: number
  toUnitOfMeasureId: number
  quantity: number
}

export interface ConvertUnitsResult {
  fromUnitOfMeasureId: number
  quantity: number
  toUnitOfMeasureId: number
  convertedQuantity: number
}

export function useUomConversions() {
  const api = useApi()

  function list(filter: UomConversionFilter = {}) {
    return api<PageEnvelope<UomConversion>>('/api/admin/uom-conversions', { query: filter })
  }

  async function create(payload: UomConversionPayload) {
    const res = await api<ApiEnvelope<UomConversion>>('/api/admin/uom-conversions', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: UomConversionPayload) {
    const res = await api<ApiEnvelope<UomConversion>>(`/api/admin/uom-conversions/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/uom-conversions/${id}`, { method: 'DELETE' })
  }

  async function convert(payload: ConvertUnitsPayload) {
    const res = await api<ApiEnvelope<ConvertUnitsResult>>('/api/admin/uom-conversions/convert', { query: payload })
    return res.data
  }

  return { list, create, update, remove, convert }
}
