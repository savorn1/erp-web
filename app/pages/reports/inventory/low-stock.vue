<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Low stock"
      description="Products below their reorder point."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Low stock' }]"
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

    <UCard v-else-if="lowStock">
      <UAlert
        color="neutral"
        variant="subtle"
        class="mb-4"
        title="Only products with a reorder point set"
        description="Set a reorder point on a product to have it show up here once available stock falls below it."
      />
      <DataTable :rows="lowStock.rows" :columns="columns" :exportable="false">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="Nothing is low on stock" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { InventoryOverviewRow } from '~/composables/useInventoryOverview'
import type { LowStock } from '~/composables/useInventoryReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { lowStock: fetchLowStock } = useInventoryReports()

const loading = ref(false)
const error = ref('')
const lowStock = ref<LowStock | null>(null)

const columns: ColumnDef<InventoryOverviewRow>[] = [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'availableStock', label: 'Available', class: 'text-error' },
  { key: 'reorderPoint', label: 'Reorder point' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    lowStock.value = await fetchLowStock({ companyId: companyId.value, warehouseId: warehouseId.value })
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
