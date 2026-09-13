<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock movement"
      description="Every stock change — receipts, issues, transfers, and adjustments."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock movement' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-48" />
        </UFormField>
        <UFormField label="Type">
          <USelect v-model="movementType" :items="movementTypeOptions" placeholder="All types" class="w-40" />
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

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" :exportable="false">
        <template #empty-state>
          <EmptyState icon="i-lucide-history" title="No movements match your filters" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StockMovement } from '~/composables/useStockMovements'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, movementType, activeCompanyOptions, warehouseFilterOptions, movementTypeOptions, ensureLoaded } =
  useReportFilters()
const { list: fetchStockMovements } = useStockMovements()

const loading = ref(false)
const error = ref('')
const rows = ref<StockMovement[]>([])

const columns: ColumnDef<StockMovement>[] = [
  { key: 'createdAt', label: 'Date', type: 'datetime' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'type', label: 'Type', type: 'status' },
  {
    key: 'quantityDelta',
    label: 'Qty change',
    prefix: (row) => (row.quantityDelta >= 0 ? '+' : ''),
    class: (row) => (row.quantityDelta >= 0 ? 'text-success' : 'text-error')
  },
  { key: 'reference', label: 'Reference', value: (row) => `${row.referenceType} #${row.referenceId}` }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = (
      await fetchStockMovements({
        companyId: companyId.value,
        warehouseId: warehouseId.value,
        type: movementType.value,
        dateFrom: dateFrom.value || undefined,
        dateTo: dateTo.value || undefined,
        size: 200,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      })
    ).data
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
watch([companyId, warehouseId, dateFrom, dateTo, movementType], load)
</script>
