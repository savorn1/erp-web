<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Operation performance"
      description="Standard vs. actual time per operation, across every completed work order."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'Operation performance' }]"
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

    <UCard v-else-if="report">
      <DataTable :rows="report.rows" :columns="columns" exportable export-filename="manufacturing-operation-performance">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="No completed work orders in this period" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { OperationPerformance, OperationPerformanceRow } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { operationPerformance: fetchOperationPerformance } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const report = ref<OperationPerformance | null>(null)

const columns: ColumnDef<OperationPerformanceRow>[] = [
  { key: 'operationName', label: 'Operation' },
  { key: 'workCenterName', label: 'Work center', value: (row) => row.workCenterName ?? '—' },
  { key: 'executionCount', label: 'Executions' },
  { key: 'standardTimeMinutes', label: 'Standard (min)' },
  { key: 'averageActualTimeMinutes', label: 'Actual avg (min)' },
  {
    key: 'varianceMinutes',
    label: 'Variance (min)',
    class: (row) => (row.varianceMinutes > 0 ? 'text-error' : row.varianceMinutes < 0 ? 'text-success' : '')
  }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchOperationPerformance({
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
