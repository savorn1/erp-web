<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Manufacturing cost"
      description="Material, labor, and overhead cost for every completed manufacturing order."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'Manufacturing cost' }]"
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
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="report">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <StatTile label="Material cost" :value="formatCurrency(report.totalMaterialCost)" icon="i-lucide-boxes" color="warning" />
        <StatTile label="Labor cost" :value="formatCurrency(report.totalLaborCost)" icon="i-lucide-users" color="info" />
        <StatTile label="Overhead cost" :value="formatCurrency(report.totalOverheadCost)" icon="i-lucide-factory" color="neutral" />
        <StatTile label="Total cost" :value="formatCurrency(report.totalCost)" icon="i-lucide-calculator" color="primary" />
      </div>
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" exportable export-filename="manufacturing-cost">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No completed manufacturing orders in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { ManufacturingCost, ManufacturingCostRow } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { cost: fetchCost } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const report = ref<ManufacturingCost | null>(null)

const columns: ColumnDef<ManufacturingCostRow>[] = [
  { key: 'moNumber', label: 'MO number' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'producedQuantity', label: 'Produced qty' },
  { key: 'materialCost', label: 'Material', type: 'currency' },
  { key: 'laborCost', label: 'Labor', type: 'currency' },
  { key: 'overheadCost', label: 'Overhead', type: 'currency' },
  { key: 'totalCost', label: 'Total', type: 'currency' },
  { key: 'unitCost', label: 'Unit cost', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchCost({
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
