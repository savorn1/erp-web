<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Supplier performance"
      description="On-time delivery rate and average delay per supplier, from expected date to receipt."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Purchase reports' }, { label: 'Supplier performance' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="From">
          <UInput v-model="dateFrom" type="date" class="w-40" />
        </UFormField>
        <UFormField label="To">
          <UInput v-model="dateTo" type="date" class="w-40" />
        </UFormField>
      </div>
      <p class="text-xs text-gray-400 mt-3">
        Only orders with an expected date and at least one goods receipt count toward the on-time rate — "On time" means the latest receipt landed on or
        before the expected date.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else-if="performance">
      <DataTable :rows="performance.rows" :columns="columns" :exportable="false">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="No purchases in this period" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { SupplierPerformance, SupplierPerformanceRow } from '~/composables/usePurchaseReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { supplierPerformance: fetchPerformance } = usePurchaseReports()

const loading = ref(false)
const error = ref('')
const performance = ref<SupplierPerformance | null>(null)

const columns: ColumnDef<SupplierPerformanceRow>[] = [
  { key: 'supplierName', label: 'Supplier', value: (row) => row.supplierName ?? '—' },
  { key: 'orderCount', label: 'Orders' },
  { key: 'measurableOrderCount', label: 'Measurable' },
  {
    key: 'onTimePercent',
    label: 'On-time %',
    value: (row) => (row.onTimePercent === null ? null : Math.round(row.onTimePercent * 10) / 10),
    suffix: (row) => (row.onTimePercent === null ? '' : '%')
  },
  {
    key: 'averageDelayDays',
    label: 'Avg delay (days)',
    value: (row) => (row.averageDelayDays === null ? null : Math.round(row.averageDelayDays * 10) / 10),
    class: (row) => (row.averageDelayDays !== null && row.averageDelayDays > 0 ? 'text-error' : 'text-success')
  }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    performance.value = await fetchPerformance({
      companyId: companyId.value,
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
watch([companyId, dateFrom, dateTo], load)
</script>
