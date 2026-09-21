<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Rejections"
      description="Finished-good batches rejected at quality control, distinct from routine production scrap."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'Rejections' }]"
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
      <StatTile label="Total rejected quantity" :value="String(report.totalRejectedQuantity)" icon="i-lucide-shield-x" color="error" class="mb-4" />
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" exportable export-filename="manufacturing-rejections">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No rejections in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { Rejections, RejectionRow } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { rejections: fetchRejections } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const report = ref<Rejections | null>(null)

const columns: ColumnDef<RejectionRow>[] = [
  { key: 'moNumber', label: 'MO number' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'quantity', label: 'Quantity rejected' },
  { key: 'reason', label: 'Reason', value: (row) => row.reason ?? '—' },
  { key: 'rejectedBy', label: 'Rejected by', value: (row) => row.rejectedBy ?? '—' },
  { key: 'rejectedAt', label: 'Rejected at', type: 'datetime' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchRejections({
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
