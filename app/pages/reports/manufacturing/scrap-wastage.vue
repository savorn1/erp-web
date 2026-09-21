<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Scrap & wastage"
      description="Completed manufacturing orders that scrapped finished-good units."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'Scrap & wastage' }]"
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
      <StatTile label="Total scrap quantity" :value="String(report.totalScrapQuantity)" icon="i-lucide-trash-2" color="error" class="mb-4" />
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" exportable export-filename="manufacturing-scrap-wastage">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No scrap or wastage in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { ScrapWastage, ScrapWastageRow } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { scrapWastage: fetchScrapWastage } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const report = ref<ScrapWastage | null>(null)

const columns: ColumnDef<ScrapWastageRow>[] = [
  { key: 'moNumber', label: 'MO number' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'producedQuantity', label: 'Produced qty' },
  { key: 'scrapQuantity', label: 'Scrap qty' },
  { key: 'scrapPercent', label: 'Scrap %', suffix: '%' },
  { key: 'scrapReason', label: 'Reason', value: (row) => row.scrapReason ?? '—' },
  { key: 'actualEndDate', label: 'Completed', type: 'date' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchScrapWastage({
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
