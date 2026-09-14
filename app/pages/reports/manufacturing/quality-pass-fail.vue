<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Quality pass/fail"
      description="Inspection pass rate, per product, for orders inspected in a period."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'Quality pass/fail' }]"
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
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <StatTile label="Inspected" :value="String(report.totalInspected)" icon="i-lucide-clipboard-check" color="info" />
        <StatTile label="Passed" :value="String(report.totalPassed)" icon="i-lucide-badge-check" color="success" />
        <StatTile label="Failed" :value="String(report.totalFailed)" icon="i-lucide-shield-x" color="error" />
        <StatTile label="Pass rate" :value="`${report.overallPassRatePercent}%`" icon="i-lucide-percent" color="primary" />
      </div>
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No inspections in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { QualityPassFail, QualityPassFailRow } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { qualityPassFail: fetchQualityPassFail } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const report = ref<QualityPassFail | null>(null)

const columns: ColumnDef<QualityPassFailRow>[] = [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'inspectedCount', label: 'Inspected' },
  { key: 'passedCount', label: 'Passed' },
  { key: 'failedCount', label: 'Failed' },
  { key: 'passRatePercent', label: 'Pass rate', suffix: '%' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchQualityPassFail({
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
