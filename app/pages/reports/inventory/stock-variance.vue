<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock variance"
      description="Every counted line where the physical count differed from the system quantity."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock variance' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-48" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" :exportable="false">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="No variances found" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StockCountVarianceRow } from '~/composables/useInventoryReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { stockCountVariance } = useInventoryReports()

const loading = ref(false)
const error = ref('')
const rows = ref<StockCountVarianceRow[]>([])

const columns: ColumnDef<StockCountVarianceRow>[] = [
  { key: 'countNumber', label: 'Count #' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'systemQuantity', label: 'System qty' },
  { key: 'countedQuantity', label: 'Counted qty', value: (row) => row.countedQuantity ?? '—' },
  {
    key: 'varianceQuantity',
    label: 'Variance',
    value: (row) => row.varianceQuantity ?? '—',
    class: (row) => ((row.varianceQuantity ?? 0) < 0 ? 'text-error' : (row.varianceQuantity ?? 0) > 0 ? 'text-success' : '')
  },
  { key: 'countDate', label: 'Count date', type: 'date' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await stockCountVariance({ companyId: companyId.value, warehouseId: warehouseId.value })
    rows.value = result.rows.filter((r) => r.varianceQuantity !== null && r.varianceQuantity !== 0)
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
watch([companyId, warehouseId], load)
</script>
