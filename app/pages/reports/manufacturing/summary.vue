<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Manufacturing order summary"
      description="Order count, planned/produced/scrap quantity, broken down by status."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'Summary' }]"
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
      <p class="text-xs text-gray-400 mt-3">Grouped by manufacturing order creation date.</p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="report">
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <StatTile label="Total orders" :value="String(report.totalOrders)" icon="i-lucide-cog" color="primary" />
        <StatTile label="Planned quantity" :value="String(report.totalPlannedQuantity)" icon="i-lucide-clipboard-list" color="info" />
        <StatTile label="Produced quantity" :value="String(report.totalProducedQuantity)" icon="i-lucide-package-check" color="success" />
        <StatTile label="Scrap quantity" :value="String(report.totalScrapQuantity)" icon="i-lucide-trash-2" color="warning" />
      </div>
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" exportable export-filename="manufacturing-summary">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No manufacturing orders in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { MoSummary, MoSummaryRow } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { summary: fetchSummary } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const report = ref<MoSummary | null>(null)

const columns: ColumnDef<MoSummaryRow>[] = [
  { key: 'status', label: 'Status' },
  { key: 'orderCount', label: 'Orders' },
  { key: 'totalPlannedQuantity', label: 'Planned qty' },
  { key: 'totalProducedQuantity', label: 'Produced qty' },
  { key: 'totalScrapQuantity', label: 'Scrap qty' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchSummary({
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
