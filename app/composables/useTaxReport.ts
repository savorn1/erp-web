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

export interface TaxDetailRow {
  type: 'Output' | 'Input'
  date: string
  reference: string | null
  partyId: number | null
  partyName: string | null
  taxableAmount: number
  taxRatePercent: number
  taxAmount: number
}

export interface TaxDetail {
  dateFrom: string | null
  dateTo: string | null
  rows: TaxDetailRow[]
  totalOutputTax: number
  totalInputTax: number
}

export interface TaxByCustomerRow {
  customerId: number
  customerName: string | null
  taxableAmount: number
  taxAmount: number
}

export interface TaxByCustomer {
  dateFrom: string | null
  dateTo: string | null
  rows: TaxByCustomerRow[]
  totalTaxAmount: number
}

export interface TaxBySupplierRow {
  supplierId: number
  supplierName: string | null
  taxableAmount: number
  taxAmount: number
}

export interface TaxBySupplier {
  dateFrom: string | null
  dateTo: string | null
  rows: TaxBySupplierRow[]
  totalTaxAmount: number
}

export interface TaxByProductRow {
  productId: number
  productName: string | null
  productSku: string | null
  outputTaxAmount: number
  inputTaxAmount: number
}

export interface TaxByProduct {
  dateFrom: string | null
  dateTo: string | null
  rows: TaxByProductRow[]
  totalOutputTax: number
  totalInputTax: number
}

export function useTaxReport() {
  const api = useApi()

  async function generate(filter: TaxReportFilter = {}) {
    const res = await api<ApiEnvelope<TaxReport>>('/api/admin/tax-report', { query: filter })
    return res.data
  }

  async function detail(filter: TaxReportFilter = {}) {
    const res = await api<ApiEnvelope<TaxDetail>>('/api/admin/tax-report/detail', { query: filter })
    return res.data
  }

  async function byCustomer(filter: TaxReportFilter = {}) {
    const res = await api<ApiEnvelope<TaxByCustomer>>('/api/admin/tax-report/by-customer', { query: filter })
    return res.data
  }

  async function bySupplier(filter: TaxReportFilter = {}) {
    const res = await api<ApiEnvelope<TaxBySupplier>>('/api/admin/tax-report/by-supplier', { query: filter })
    return res.data
  }

  async function byProduct(filter: TaxReportFilter = {}) {
    const res = await api<ApiEnvelope<TaxByProduct>>('/api/admin/tax-report/by-product', { query: filter })
    return res.data
  }

  return { generate, detail, byCustomer, bySupplier, byProduct }
}
