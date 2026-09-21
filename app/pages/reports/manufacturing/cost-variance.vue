<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Cost variance"
      description="Standard material cost (from the BOM's current recipe cost) vs. what an order actually consumed."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'Cost variance' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-52" />
        </UFormField>
        <UFormField label="From">
          <UInput v-model="dateFrom" type="date" class="w-40" />
        </UFormField>
        <UFormField label="To">
          <UInput v-model="dateTo" type="date" class="w-40" />
        </UFormField>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-3">Grouped by when each order started production.</p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="report">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatTile label="Standard cost" :value="formatCurrency(report.totalStandardMaterialCost)" icon="i-lucide-list-tree" color="info" />
        <StatTile label="Actual cost" :value="formatCurrency(report.totalActualMaterialCost)" icon="i-lucide-boxes" color="warning" />
        <StatTile
          label="Variance"
          :value="formatCurrency(report.totalVarianceAmount)"
          icon="i-lucide-scale"
          :color="report.totalVarianceAmount > 0 ? 'error' : 'success'"
        />
      </div>
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" exportable export-filename="manufacturing-cost-variance">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No orders in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { CostVariance, CostVarianceRow } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { costVariance: fetchCostVariance } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const report = ref<CostVariance | null>(null)

const columns: ColumnDef<CostVarianceRow>[] = [
  { key: 'moNumber', label: 'MO number' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'standardMaterialCost', label: 'Standard cost', type: 'currency' },
  { key: 'actualMaterialCost', label: 'Actual cost', type: 'currency' },
  {
    key: 'varianceAmount',
    label: 'Variance',
    type: 'currency',
    class: (row) => (row.varianceAmount > 0 ? 'text-error-600 dark:text-error-400' : row.varianceAmount < 0 ? 'text-success-700 dark:text-success-400' : '')
  },
  { key: 'variancePercent', label: 'Variance %', suffix: '%' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchCostVariance({
      companyId: companyId.value,
      warehouseId: warehouseId.value,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined
    })
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
watch([companyId, warehouseId, dateFrom, dateTo], load)
</script>
