<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Production time"
      description="Actual cycle time (start to finish) for every completed manufacturing order."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'Production time' }]"
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
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="report">
      <StatTile label="Average cycle time" :value="`${report.averageDurationHours} h`" icon="i-lucide-timer" color="info" class="mb-4" />
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" exportable export-filename="manufacturing-production-time">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No completed production in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { ProductionTime, ProductionTimeRow } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { productionTime: fetchProductionTime } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const report = ref<ProductionTime | null>(null)

const columns: ColumnDef<ProductionTimeRow>[] = [
  { key: 'moNumber', label: 'MO number' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'actualStartDate', label: 'Started', type: 'datetime' },
  { key: 'actualEndDate', label: 'Finished', type: 'datetime' },
  { key: 'actualDurationHours', label: 'Duration', suffix: ' h' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchProductionTime({
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
