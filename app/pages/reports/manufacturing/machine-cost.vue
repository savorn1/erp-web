<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Machine cost"
      description="Hours logged on completed work orders x each machine's cost per hour."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'Machine cost' }]"
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
      <p class="text-xs text-gray-400 mt-3">Machines without a cost per hour set show a dash rather than $0 — set one on the machine's edit form.</p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="report">
      <StatTile label="Total machine cost" :value="formatCurrency(report.totalCost)" icon="i-lucide-cog" color="warning" class="mb-4" />
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" exportable export-filename="manufacturing-machine-cost">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No completed work orders with a machine assigned in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { MachineCost, MachineCostRow } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { machineCost: fetchMachineCost } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const report = ref<MachineCost | null>(null)

const columns: ColumnDef<MachineCostRow>[] = [
  { key: 'machineName', label: 'Machine', value: (row) => row.machineName ?? '—' },
  { key: 'operationCount', label: 'Operations' },
  { key: 'totalActualHours', label: 'Total hours' },
  { key: 'costPerHour', label: 'Cost/hr', type: 'currency' },
  { key: 'totalCost', label: 'Total cost', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchMachineCost({
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
