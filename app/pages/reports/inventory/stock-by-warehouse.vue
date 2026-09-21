<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock by warehouse"
      description="On-hand quantity and value totalled per warehouse — same data as Warehouse Stock."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock by warehouse' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" exportable export-filename="inventory-stock-by-warehouse">
        <template #empty-state>
          <EmptyState icon="i-lucide-warehouse" title="No stock yet" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'

definePageMeta({ middleware: 'admin' })

interface WarehouseStockRow {
  warehouseId: number
  warehouseName: string | null
  productCount: number
  totalQuantity: number
  totalValue: number
}

const { companyId, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { get: fetchInventoryOverview } = useInventoryOverview()

const loading = ref(false)
const error = ref('')
const rows = ref<WarehouseStockRow[]>([])

const columns: ColumnDef<WarehouseStockRow>[] = [
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'productCount', label: 'Products' },
  { key: 'totalQuantity', label: 'Total quantity' },
  { key: 'totalValue', label: 'Total value', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const overview = (await fetchInventoryOverview({ companyId: companyId.value, size: 100000 })).data
    const byWarehouse = new Map<number, WarehouseStockRow>()
    for (const row of overview) {
      let bucket = byWarehouse.get(row.warehouseId)
      if (!bucket) {
        bucket = { warehouseId: row.warehouseId, warehouseName: row.warehouseName, productCount: 0, totalQuantity: 0, totalValue: 0 }
        byWarehouse.set(row.warehouseId, bucket)
      }
      bucket.productCount++
      bucket.totalQuantity += row.currentStock
      bucket.totalValue += row.valuationValue
    }
    rows.value = Array.from(byWarehouse.values()).sort((a, b) => b.totalValue - a.totalValue)
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
watch(companyId, load)
</script>
