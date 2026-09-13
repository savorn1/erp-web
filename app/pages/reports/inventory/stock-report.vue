<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock report"
      description="On hand, available, and incoming quantity per product and warehouse."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock report' }]"
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

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <StatTile label="Products" :value="String(rows.length)" icon="i-lucide-package" color="primary" />
        <StatTile label="Total on hand" :value="String(totalOnHand)" icon="i-lucide-boxes" color="info" />
        <StatTile label="Total available" :value="String(totalAvailable)" icon="i-lucide-check-circle" color="success" />
        <StatTile label="Total valuation" :value="formatCurrency(totalValuation)" icon="i-lucide-circle-dollar-sign" color="neutral" />
      </div>
      <UCard>
        <DataTable :rows="rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-boxes" title="No stock yet" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { InventoryOverviewRow } from '~/composables/useInventoryOverview'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { get: fetchInventoryOverview } = useInventoryOverview()

const loading = ref(false)
const error = ref('')
const rows = ref<InventoryOverviewRow[]>([])

const totalOnHand = computed(() => rows.value.reduce((sum, r) => sum + r.currentStock, 0))
const totalAvailable = computed(() => rows.value.reduce((sum, r) => sum + r.availableStock, 0))
const totalValuation = computed(() => rows.value.reduce((sum, r) => sum + r.valuationValue, 0))

const columns: ColumnDef<InventoryOverviewRow>[] = [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'currentStock', label: 'On hand' },
  { key: 'availableStock', label: 'Available' },
  { key: 'incomingStock', label: 'Incoming' },
  { key: 'valuationValue', label: 'Valuation', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = (await fetchInventoryOverview({ companyId: companyId.value, warehouseId: warehouseId.value, size: 100000 })).data
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
