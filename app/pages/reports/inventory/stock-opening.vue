<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock opening"
      description="Quantity on hand at the start of a date range (before its first movement)."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock opening' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-48" />
        </UFormField>
        <UFormField label="As of">
          <UInput v-model="dateFrom" type="date" class="w-40" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" :exportable="false">
        <template #empty-state>
          <EmptyState icon="i-lucide-log-in" title="No stock movements before this date" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StockOpeningClosingRow } from '~/composables/useInventoryReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { openingClosingStock } = useInventoryReports()

const loading = ref(false)
const error = ref('')
const rows = ref<StockOpeningClosingRow[]>([])

const columns: ColumnDef<StockOpeningClosingRow>[] = [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'openingQuantity', label: 'Opening quantity' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = (await openingClosingStock({ companyId: companyId.value, warehouseId: warehouseId.value, dateFrom: dateFrom.value })).rows
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
watch([companyId, warehouseId, dateFrom], load)
</script>
