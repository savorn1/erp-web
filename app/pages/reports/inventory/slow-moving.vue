<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Slow moving stock"
      description="Products with some outbound activity, but the least of it, over a trailing window."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Slow moving stock' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-48" />
        </UFormField>
        <UFormField label="Window (days)">
          <UInput v-model.number="days" type="number" min="1" class="w-32" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" :exportable="false">
        <template #empty-state>
          <EmptyState icon="i-lucide-turtle" title="Nothing qualifies as slow moving" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StockTurnoverRow } from '~/composables/useInventoryReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { stockTurnover } = useInventoryReports()

const loading = ref(false)
const error = ref('')
const days = ref(90)
const rows = ref<StockTurnoverRow[]>([])

const columns: ColumnDef<StockTurnoverRow>[] = [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'currentStock', label: 'On hand' },
  { key: 'outboundQuantityInWindow', label: 'Outbound qty' },
  { key: 'lastOutboundDate', label: 'Last outbound', type: 'datetime' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const result = await stockTurnover({ companyId: companyId.value, warehouseId: warehouseId.value, days: days.value })
    rows.value = result.rows
      .filter((r) => r.outboundQuantityInWindow > 0)
      .sort((a, b) => a.outboundQuantityInWindow - b.outboundQuantityInWindow)
      .slice(0, 50)
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
watch([companyId, warehouseId, days], load)
</script>
