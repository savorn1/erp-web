// Wraps the backend's admin-only BillOfMaterialController
// (/api/admin/bill-of-materials/**, requires ROLE_ADMIN). A BOM is master
// data (a recipe), not a workflow document — it just toggles
// active/inactive; only an ACTIVE BOM can be used to create a
// ManufacturingOrder (see useManufacturingOrders).

import type { ApiEnvelope, PageEnvelope } from '#shared/types'

export type BillOfMaterialStatus = 'ACTIVE' | 'INACTIVE'

export interface BillOfMaterialLine {
  id: number
  componentProductId: number
  componentProductName: string | null
  componentProductSku: string | null
  unitOfMeasureId: number | null
  unitOfMeasureAbbreviation: string | null
  quantity: number
  scrapPercent: number
}

export interface BillOfMaterial {
  id: number
  companyId: number
  companyName: string | null
  productId: number
  productName: string | null
  productSku: string | null
  bomNumber: string
  name: string
  outputQuantity: number
  unitOfMeasureId: number | null
  unitOfMeasureAbbreviation: string | null
  status: BillOfMaterialStatus
  notes: string | null
  createdBy: string | null
  createdAt: string
  lines: BillOfMaterialLine[] | null
}

export interface BillOfMaterialFilter {
  bomNumber?: string
  companyId?: number
  productId?: number
  status?: BillOfMaterialStatus
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  page?: number
  size?: number
}

export interface BillOfMaterialLinePayload {
  componentProductId: number
  quantity: number
  scrapPercent?: number
}

export interface BillOfMaterialPayload {
  companyId: number
  productId: number
  name: string
  outputQuantity: number
  notes?: string
  lines: BillOfMaterialLinePayload[]
}

export function useBillOfMaterials() {
  const api = useApi()

  function list(filter: BillOfMaterialFilter = {}) {
    return api<PageEnvelope<BillOfMaterial>>('/api/admin/bill-of-materials', { query: filter })
  }

  async function get(id: number) {
    const res = await api<ApiEnvelope<BillOfMaterial>>(`/api/admin/bill-of-materials/${id}`)
    return res.data
  }

  async function create(payload: BillOfMaterialPayload) {
    const res = await api<ApiEnvelope<BillOfMaterial>>('/api/admin/bill-of-materials', { method: 'POST', body: payload })
    return res.data
  }

  async function update(id: number, payload: Omit<BillOfMaterialPayload, 'companyId' | 'productId'>) {
    const res = await api<ApiEnvelope<BillOfMaterial>>(`/api/admin/bill-of-materials/${id}`, { method: 'PUT', body: payload })
    return res.data
  }

  async function activate(id: number) {
    const res = await api<ApiEnvelope<BillOfMaterial>>(`/api/admin/bill-of-materials/${id}/activate`, { method: 'POST' })
    return res.data
  }

  async function deactivate(id: number) {
    const res = await api<ApiEnvelope<BillOfMaterial>>(`/api/admin/bill-of-materials/${id}/deactivate`, { method: 'POST' })
    return res.data
  }

  async function remove(id: number) {
    await api(`/api/admin/bill-of-materials/${id}`, { method: 'DELETE' })
  }

  return { list, get, create, update, activate, deactivate, remove }
}
