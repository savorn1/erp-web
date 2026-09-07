// Wraps the backend's admin-only UomCategoryController
// (/api/admin/uom-categories/**, requires ROLE_ADMIN). Groups compatible
// units of measure (e.g. "Weight": kg/g/lb) so they can be converted through
// UomConversion rows anchored on baseUnitId — see useUomConversions.

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export interface UomCategory {
  id: number
  code: string | null
  name: string
  description: string | null
  active: boolean
  // The UnitOfMeasure flagged as this category's base unit, if any.
  baseUnitId: number | null
  baseUnitName: string | null
  baseUnitAbbreviation: string | null
}

export interface UomCategoryFilter {
  name?: string
  active?: boolean
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface UomCategoryPayload {
  code: string
  name: string
  description?: string
  active: boolean
}

export function useUomCategories() {
  const api = useApi()

  function list(filter: UomCategoryFilter = {}) {
    return api<PageEnvelope<UomCategory>>('/api/admin/uom-categories', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<UomCategory>>(`/api/admin/uom-categories/${id}`)
    return res.data
  }

  async function create(payload: UomCategoryPayload) {
    const res = await api<ApiEnvelope<UomCategory>>('/api/admin/uom-categories', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: UomCategoryPayload) {
    const res = await api<ApiEnvelope<UomCategory>>(`/api/admin/uom-categories/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/uom-categories/${id}`, { method: 'DELETE' })
  }

  // Idempotent — creates the standard QUANTITY (PCS base, Box/Carton),
  // WEIGHT (KG base, Gram/Ton), VOLUME (L base, Milliliter), LENGTH (M base,
  // Centimeter), and AREA (M2 base) categories, skipping any category code
  // or unit name that already exists.
  async function seedStandard() {
    const res = await api<ApiEnvelope<UomCategory[]>>('/api/admin/uom-categories/seed-standard', { method: 'POST' })
    return res.data
  }

  return { list, get, create, update, remove, seedStandard }
}
