<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Supplier performance"
      description="On-time delivery, quality-check pass rate, and price variance vs. the cross-supplier average, per supplier."
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
        <UBadge v-if="supplierId" color="primary" variant="subtle" class="gap-1.5">
          One supplier only
          <UButton size="xs" color="primary" variant="link" icon="i-lucide-x" class="p-0" @click="supplierId = undefined" />
        </UBadge>
      </div>
      <p class="text-xs text-gray-400 mt-3">
        Only orders with an expected date and at least one goods receipt count toward the on-time rate — "On time" means the latest receipt landed on or before
        the expected date. QC pass % covers quality-checked goods-receipt lines only. Price variance compares each supplier's price for a product against the
        quantity-weighted average price paid to all suppliers for that same product — only shown where another supplier was also paid for it in this period.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else-if="performance">
      <DataTable :rows="performance.rows" :columns="columns" exportable export-filename="purchase-supplier-performance">
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

const route = useRoute()
const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { supplierPerformance: fetchPerformance } = usePurchaseReports()

const loading = ref(false)
const error = ref('')
const performance = ref<SupplierPerformance | null>(null)
// Pre-filled when the Suppliers page deep-links here for one supplier.
const supplierId = ref<number | undefined>(route.query.supplierId ? Number(route.query.supplierId) : undefined)

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
  },
  {
    key: 'qualityPassPercent',
    label: 'QC pass %',
    value: (row) => (row.qualityPassPercent === null ? null : Math.round(row.qualityPassPercent * 10) / 10),
    suffix: (row) => (row.qualityPassPercent === null ? '' : '%')
  },
  {
    key: 'priceVariancePercent',
    label: 'Price variance',
    value: (row) => (row.priceVariancePercent === null ? null : Math.round(row.priceVariancePercent * 10) / 10),
    suffix: (row) => (row.priceVariancePercent === null ? '' : '%'),
    class: (row) => (row.priceVariancePercent !== null && row.priceVariancePercent > 0 ? 'text-error' : 'text-success')
  }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    performance.value = await fetchPerformance({
      companyId: companyId.value,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
      supplierId: supplierId.value
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
watch([companyId, dateFrom, dateTo, supplierId], load)
</script>
