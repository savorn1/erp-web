<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock adjustment"
      description="Every stock adjustment request and its approval status."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock adjustment' }]"
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
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" exportable export-filename="inventory-stock-adjustment">
        <template #empty-state>
          <EmptyState icon="i-lucide-scale" title="No stock adjustments yet" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StockAdjustment } from '~/composables/useStockAdjustments'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { list } = useStockAdjustments()

const loading = ref(false)
const error = ref('')
const rows = ref<StockAdjustment[]>([])

const columns: ColumnDef<StockAdjustment>[] = [
  { key: 'adjustmentNumber', label: 'Adjustment #' },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'adjustmentDate', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'badge' },
  { key: 'requestedBy', label: 'Requested by', value: (row) => row.requestedBy ?? '—' },
  { key: 'approvedBy', label: 'Approved by', value: (row) => row.approvedBy ?? '—' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = (await list({ companyId: companyId.value, warehouseId: warehouseId.value, size: 1000 })).data
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
