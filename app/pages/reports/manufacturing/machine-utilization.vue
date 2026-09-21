<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Machine utilization"
      description="Hours logged against completed work orders, per machine."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'Machine utilization' }]"
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
      <DataTable :rows="report.rows" :columns="columns" exportable export-filename="manufacturing-machine-utilization">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="No completed work orders with a machine assigned in this period" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { MachineUtilization, MachineUtilizationRow } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { machineUtilization: fetchMachineUtilization } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const report = ref<MachineUtilization | null>(null)

const columns: ColumnDef<MachineUtilizationRow>[] = [
  { key: 'machineName', label: 'Machine', value: (row) => row.machineName ?? '—' },
  { key: 'machineStatus', label: 'Status', value: (row) => row.machineStatus ?? '—' },
  { key: 'operationCount', label: 'Operations' },
  { key: 'totalActualHours', label: 'Total hours' },
  { key: 'averageHoursPerOperation', label: 'Avg hours/op' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchMachineUtilization({
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
