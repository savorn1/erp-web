// Wraps the backend's admin-only InventorySettingsController
// (/api/admin/inventory-settings/**). One row per company — consulted by
// StockAvailabilityService before POS checkout/exchange and Sales Order
// confirmation/delivery (see the entity's own comment for exactly which
// flows). Stock Transfers, Stock Adjustments, and Manufacturing Orders never
// consult this — those keep their own unconditional hard "insufficient
// stock" blocks.

import type { ApiEnvelope } from '#shared/types'

export interface InventorySettings {
  companyId: number
  allowOverselling: boolean
  allowNegativeStock: boolean
  showAvailableStock: boolean
  reserveStock: boolean
  backorderEnabled: boolean
  oversellingApprovalRequired: boolean
  stockWarningEnabled: boolean
}

export function useInventorySettings() {
  const api = useApi()

  async function getForCompany(companyId: number) {
    const res = await api<ApiEnvelope<InventorySettings>>(`/api/admin/inventory-settings/${companyId}`)
    return res.data
  }

  async function upsert(payload: InventorySettings) {
    const res = await api<ApiEnvelope<InventorySettings>>('/api/admin/inventory-settings', { method: 'PUT', body: payload })
    return res.data
  }

  return { getForCompany, upsert }
}
