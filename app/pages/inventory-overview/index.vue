<template>
  <div>
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Inventory overview</h1>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search product name / SKU" icon="i-lucide-search" class="w-56" @update:model-value="onSearchInput" />
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.warehouseId" :items="warehouseFilterOptions" placeholder="Warehouse" class="w-44" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
      </div>
    </UCard>

    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
      <StatTile
        label="Total on hand"
        :value="quantityTotal(totals.current)"
        :sublabel="mixedUnitsNote"
        icon="i-lucide-boxes"
        color="primary"
        :loading="loading"
      />
      <StatTile
        label="Total available"
        :value="quantityTotal(totals.available)"
        :sublabel="mixedUnitsNote"
        icon="i-lucide-check-circle"
        color="success"
        :loading="loading"
      />
      <StatTile
        label="Total incoming"
        :value="quantityTotal(totals.incoming)"
        :sublabel="mixedUnitsNote"
        icon="i-lucide-truck"
        color="info"
        :loading="loading"
      />
      <StatTile label="Total valuation" :value="formatCurrency(totals.valuation)" icon="i-lucide-circle-dollar-sign" color="neutral" :loading="loading" />
    </div>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />

    <UCard>
      <DataTable
        v-model:sort="sort"
        :rows="rows"
        :columns="columns"
        :loading="loading"
        refreshable
        numbered
        exportable
        export-filename="inventory-overview"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #empty-state>
          <EmptyState icon="i-lucide-boxes" title="No stock to show" description="Nothing matches your filters yet." />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { InventoryOverviewRow } from '~/composables/useInventoryOverview'

definePageMeta({ middleware: 'admin' })

const { get } = useInventoryOverview()
const { list: listCompanies } = useCompanies()
const { list: listWarehouses } = useWarehouses()

const rows = ref<InventoryOverviewRow[]>([])
const loading = ref(false)
const error = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const companies = ref<{ id: number; name: string }[]>([])
const warehouses = ref<{ id: number; name: string; companyId: number }[]>([])

async function loadLookups() {
  const [c, w] = await Promise.all([listCompanies({ size: 200 }), listWarehouses({ size: 200 })])
  companies.value = c.data
  warehouses.value = w.data
}

const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const warehouseFilterOptions = computed(() => [{ label: 'All warehouses', value: undefined }, ...warehouses.value.map((w) => ({ label: w.name, value: w.id }))])

const search = ref('')
const filter = reactive<{ companyId: number | undefined; warehouseId: number | undefined }>({ companyId: undefined, warehouseId: undefined })
const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'productName', direction: 'asc' })

const totals = reactive({ current: 0, available: 0, incoming: 0, valuation: 0 })

// These three tiles add quantities across every row, which is only a real
// number when the rows share a unit — otherwise it is bottles plus kilograms
// plus pallets. Say which unit when there is one, and say so plainly when
// there isn't, rather than presenting a meaningless figure as a headline.
// (Total valuation is money, so it aggregates fine either way.)
const uniformUnit = computed(() => {
  const units = new Set(rows.value.map((r) => r.unitOfMeasureAbbreviation ?? ''))
  return units.size === 1 ? [...units][0] || null : null
})
const mixedUnitsNote = computed(() => (rows.value.length === 0 || uniformUnit.value ? undefined : 'across mixed units — not a real total'))
function quantityTotal(value: number) {
  return uniformUnit.value ? `${formatNumber(value)} ${uniformUnit.value}` : formatNumber(value)
}

// Current and Available are the two numbers people read and act on, so they
// carry the unit inline as well as in the Unit column. Reserved/incoming/
// outgoing are the same dimension and read off that column, which keeps the
// grid from repeating the same token five times per row.
function unitSuffix(row: InventoryOverviewRow) {
  return row.unitOfMeasureAbbreviation ? ` ${row.unitOfMeasureAbbreviation}` : ''
}

const columns: ColumnDef<InventoryOverviewRow>[] = [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})`, sortable: true },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—', sortable: true },
  { key: 'unitOfMeasureAbbreviation', label: 'Unit', value: (row) => row.unitOfMeasureAbbreviation ?? '—' },
  { key: 'currentStock', label: 'Current', type: 'number', sortable: true, suffix: (row) => unitSuffix(row) },
  { key: 'reservedStock', label: 'Reserved', type: 'number' },
  { key: 'availableStock', label: 'Available', type: 'number', suffix: (row) => unitSuffix(row) },
  { key: 'incomingStock', label: 'Incoming', type: 'number' },
  { key: 'outgoingStock', label: 'Outgoing', type: 'number' },
  { key: 'unitCost', label: 'Unit cost', type: 'currency' },
  { key: 'valuationValue', label: 'Valuation', type: 'currency', sortable: true }
]

let searchTimeout: ReturnType<typeof setTimeout> | undefined
function onSearchInput() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(load, 300)
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await get({
      companyId: filter.companyId,
      warehouseId: filter.warehouseId,
      search: search.value || undefined,
      sortBy: sort.value?.column,
      sortOrder: sort.value?.direction,
      page: page.value,
      size: pageSize.value
    })
    rows.value = res.data
    total.value = res.metadata.totalCount
    totals.current = rows.value.reduce((sum, r) => sum + r.currentStock, 0)
    totals.available = rows.value.reduce((sum, r) => sum + r.availableStock, 0)
    totals.incoming = rows.value.reduce((sum, r) => sum + r.incomingStock, 0)
    totals.valuation = rows.value.reduce((sum, r) => sum + r.valuationValue, 0)
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

function formatNumber(n: number) {
  return new Intl.NumberFormat().format(n)
}

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(page, load)
watch(pageSize, load)
watch(() => [filter.companyId, filter.warehouseId], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.companyId !== undefined || filter.warehouseId !== undefined)
function clearFilters() {
  search.value = ''
  filter.companyId = undefined
  filter.warehouseId = undefined
  load()
}
</script>
