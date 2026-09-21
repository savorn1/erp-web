<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Plan vs actual"
      description="Planned vs produced quantity, achievement rate, and yield for every completed order."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'Plan vs actual' }]"
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
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Average achievement" :value="`${report.averageAchievementPercent}%`" icon="i-lucide-target" color="primary" />
        <StatTile label="Average yield" :value="`${report.averageYieldPercent}%`" icon="i-lucide-package-check" color="success" />
      </div>
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" exportable export-filename="manufacturing-plan-vs-actual">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No completed orders in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PlanVsActual, PlanVsActualRow } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { planVsActual: fetchPlanVsActual } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const report = ref<PlanVsActual | null>(null)

const columns: ColumnDef<PlanVsActualRow>[] = [
  { key: 'moNumber', label: 'MO number' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'plannedQuantity', label: 'Planned' },
  { key: 'producedQuantity', label: 'Produced' },
  { key: 'scrapQuantity', label: 'Scrap' },
  {
    key: 'achievementPercent',
    label: 'Achievement',
    suffix: '%',
    class: (row) => (row.achievementPercent < 100 ? 'text-warning' : 'text-success')
  },
  { key: 'yieldPercent', label: 'Yield', suffix: '%' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchPlanVsActual({
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
