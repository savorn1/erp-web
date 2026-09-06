// Wraps the backend's admin-only TaxReportController
// (/api/admin/tax-report/**, requires ROLE_ADMIN). Groups approved Invoice
// (output tax) and PurchaseInvoice (input tax) lines by their raw taxRate
// percent — see TaxReportServiceImpl's own comment on why this can't
// distinguish VAT from withholding.

import type { ApiEnvelope } from '#shared/types'

export interface TaxReportFilter {
  companyId?: number
  dateFrom?: string
  dateTo?: string
}

export interface TaxReportRateRow {
  taxRatePercent: number
  taxableAmount: number
  taxAmount: number
}

export interface TaxReport {
  dateFrom: string | null
  dateTo: string | null
  outputTax: TaxReportRateRow[]
  outputTaxTotal: number
  inputTax: TaxReportRateRow[]
  inputTaxTotal: number
  netTaxPayable: number
}

export function useTaxReport() {
  const api = useApi()

  async function generate(filter: TaxReportFilter = {}) {
    const res = await api<ApiEnvelope<TaxReport>>('/api/admin/tax-report', { query: filter })
    return res.data
  }

  return { generate }
}
