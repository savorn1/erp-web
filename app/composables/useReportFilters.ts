import type { SalesOrderStatus } from '~/composables/useSalesOrders'
import type { PurchaseOrderStatus } from '~/composables/usePurchaseOrders'
import type { StockMovementType } from '~/composables/useStockMovements'

function firstOfMonth() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
}

// Filter state (company/warehouse/date range/etc.) shared across every report
// page via `useState`, so it survives navigating from one report to another
// — each report is now its own route/page instance, and re-picking the
// company on every single one would be tedious.
export function useReportFilters() {
  const companyId = useState<number | undefined>('reports-companyId', () => undefined)
  const warehouseId = useState<number | undefined>('reports-warehouseId', () => undefined)
  const dateFrom = useState<string>('reports-dateFrom', firstOfMonth)
  const dateTo = useState<string>('reports-dateTo', () => new Date().toISOString().slice(0, 10))
  const asOfDate = useState<string>('reports-asOfDate', () => new Date().toISOString().slice(0, 10))
  const accountId = useState<number | undefined>('reports-accountId', () => undefined)
  const salesStatus = useState<SalesOrderStatus | undefined>('reports-salesStatus', () => undefined)
  const purchaseStatus = useState<PurchaseOrderStatus | undefined>('reports-purchaseStatus', () => undefined)
  const movementType = useState<StockMovementType | undefined>('reports-movementType', () => undefined)

  const companies = useState<{ id: number; name: string; active: boolean }[]>('reports-companies', () => [])
  const warehouses = useState<{ id: number; name: string; companyId: number }[]>('reports-warehouses', () => [])
  const glAccounts = useState<{ id: number; accountCode: string; name: string; companyId: number }[]>('reports-glAccounts', () => [])
  const loaded = useState('reports-filters-loaded', () => false)

  const { list: listCompanies } = useCompanies()
  const { list: listWarehouses } = useWarehouses()
  const { list: listAccounts } = useAccounts()

  // Only fetched once per session, not once per report page.
  async function ensureLoaded() {
    if (loaded.value) return
    const [c, w, a] = await Promise.all([listCompanies({ size: 200 }), listWarehouses({ size: 200 }), listAccounts({ size: 1000 })])
    companies.value = c.data
    warehouses.value = w.data
    glAccounts.value = a.data
    loaded.value = true
  }

  const activeCompanyOptions = computed(() => [
    { label: 'All companies', value: undefined },
    ...companies.value.filter((c) => c.active).map((c) => ({ label: c.name, value: c.id }))
  ])
  const warehouseFilterOptions = computed(() => [
    { label: 'All warehouses', value: undefined },
    ...warehouses.value.filter((w) => companyId.value === undefined || w.companyId === companyId.value).map((w) => ({ label: w.name, value: w.id }))
  ])
  const accountOptions = computed(() =>
    glAccounts.value
      .filter((a) => companyId.value === undefined || a.companyId === companyId.value)
      .map((a) => ({ label: `${a.accountCode} — ${a.name}`, value: a.id }))
  )

  const salesStatusOptions = [
    { label: 'All except cancelled', value: undefined },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Submitted', value: 'SUBMITTED' },
    { label: 'Confirmed', value: 'CONFIRMED' },
    { label: 'Partially delivered', value: 'PARTIALLY_DELIVERED' },
    { label: 'Delivered', value: 'DELIVERED' },
    { label: 'Cancelled', value: 'CANCELLED' }
  ]
  const purchaseStatusOptions = [
    { label: 'All except cancelled', value: undefined },
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Submitted', value: 'SUBMITTED' },
    { label: 'Approved', value: 'APPROVED' },
    { label: 'Sent', value: 'SENT' },
    { label: 'Partially received', value: 'PARTIALLY_RECEIVED' },
    { label: 'Received', value: 'RECEIVED' },
    { label: 'Cancelled', value: 'CANCELLED' }
  ]
  const movementTypeOptions = [
    { label: 'All types', value: undefined },
    { label: 'Receipt', value: 'RECEIPT' },
    { label: 'Issue', value: 'ISSUE' },
    { label: 'Transfer out', value: 'TRANSFER_OUT' },
    { label: 'Transfer in', value: 'TRANSFER_IN' },
    { label: 'Adjustment', value: 'ADJUSTMENT' }
  ]

  return {
    companyId,
    warehouseId,
    dateFrom,
    dateTo,
    asOfDate,
    accountId,
    salesStatus,
    purchaseStatus,
    movementType,
    activeCompanyOptions,
    warehouseFilterOptions,
    accountOptions,
    salesStatusOptions,
    purchaseStatusOptions,
    movementTypeOptions,
    ensureLoaded
  }
}
