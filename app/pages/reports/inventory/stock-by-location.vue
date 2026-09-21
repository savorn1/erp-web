<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock by location"
      description="On-hand quantity totalled per bin/location — same data as Location Stock."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock by location' }]"
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
      <DataTable :rows="rows" :columns="columns" exportable export-filename="inventory-stock-by-location">
        <template #empty-state>
          <EmptyState icon="i-lucide-package-2" title="No stock yet" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'

definePageMeta({ middleware: 'admin' })

interface LocationStockRow {
  binId: number | null
  binName: string
  warehouseName: string | null
  productCount: number
  totalQuantity: number
}

const { companyId, warehouseId, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { stockDetail } = useInventoryReports()

const loading = ref(false)
const error = ref('')
const rows = ref<LocationStockRow[]>([])

const columns: ColumnDef<LocationStockRow>[] = [
  { key: 'binName', label: 'Bin / location' },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'productCount', label: 'Products' },
  { key: 'totalQuantity', label: 'Total quantity' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const detail = (await stockDetail({ companyId: companyId.value, warehouseId: warehouseId.value })).rows
    const byBin = new Map<string, LocationStockRow>()
    for (const row of detail) {
      const key = `${row.warehouseId}:${row.binId ?? 'none'}`
      let bucket = byBin.get(key)
      if (!bucket) {
        bucket = { binId: row.binId, binName: row.binName ?? 'Unassigned', warehouseName: row.warehouseName, productCount: 0, totalQuantity: 0 }
        byBin.set(key, bucket)
      }
      bucket.productCount++
      bucket.totalQuantity += row.quantityOnHand
    }
    rows.value = Array.from(byBin.values()).sort((a, b) => b.totalQuantity - a.totalQuantity)
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
