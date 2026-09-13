<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock valuation"
      description="Total quantity and value on hand, by warehouse."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock valuation' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-48" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="stockValuation">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Total quantity" :value="String(stockValuation.totalQuantity)" icon="i-lucide-boxes" color="info" />
        <StatTile label="Total value" :value="formatCurrency(stockValuation.totalValue)" icon="i-lucide-circle-dollar-sign" color="neutral" />
      </div>
      <UCard>
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">By warehouse</h2></template>
        <DataTable :rows="stockValuation.rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No stock yet" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StockValuation, StockValuationRow } from '~/composables/useInventoryReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { stockValuation: fetchStockValuation } = useInventoryReports()

const loading = ref(false)
const error = ref('')
const stockValuation = ref<StockValuation | null>(null)

const columns: ColumnDef<StockValuationRow>[] = [
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'productCount', label: 'Products' },
  { key: 'totalQuantity', label: 'Quantity' },
  { key: 'totalValue', label: 'Value', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    stockValuation.value = await fetchStockValuation({ companyId: companyId.value, warehouseId: warehouseId.value })
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureLoaded()
  await load()
})
watch([companyId, warehouseId], load)
</script>
