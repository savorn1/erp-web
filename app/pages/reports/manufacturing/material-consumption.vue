<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Material consumption"
      description="Raw materials drawn from stock by manufacturing orders that started production in this period."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'Material consumption' }]"
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
      <StatTile label="Total material cost consumed" :value="formatCurrency(report.totalConsumedCost)" icon="i-lucide-boxes" color="warning" class="mb-4" />
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" exportable export-filename="manufacturing-material-consumption">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No material consumption in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { MaterialConsumption, MaterialConsumptionRow } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { materialConsumption: fetchMaterialConsumption } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const report = ref<MaterialConsumption | null>(null)

const columns: ColumnDef<MaterialConsumptionRow>[] = [
  { key: 'componentProductName', label: 'Component', value: (row) => `${row.componentProductName ?? '—'} (${row.componentProductSku ?? '—'})` },
  { key: 'totalConsumedQuantity', label: 'Quantity consumed' },
  { key: 'totalCost', label: 'Total cost', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchMaterialConsumption({
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
