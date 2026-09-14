<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock profitability"
      description="Revenue, cost, and gross profit per product for a period — using each product's list cost/selling price."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock profitability' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-48" />
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

    <template v-else-if="result">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatTile label="Revenue" :value="formatCurrency(result.totalRevenue)" icon="i-lucide-circle-dollar-sign" color="info" />
        <StatTile label="COGS" :value="formatCurrency(result.totalCogs)" icon="i-lucide-receipt" color="neutral" />
        <StatTile label="Gross profit" :value="formatCurrency(result.totalGrossProfit)" icon="i-lucide-trending-up" color="success" />
      </div>
      <UCard>
        <DataTable :rows="result.rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-package-check" title="Nothing sold in this range" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StockProfitability, StockProfitabilityRow } from '~/composables/useInventoryReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { stockProfitability } = useInventoryReports()

const loading = ref(false)
const error = ref('')
const result = ref<StockProfitability | null>(null)

const columns: ColumnDef<StockProfitabilityRow>[] = [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'quantitySold', label: 'Qty sold' },
  { key: 'revenue', label: 'Revenue', type: 'currency' },
  { key: 'cogs', label: 'COGS', type: 'currency' },
  { key: 'grossProfit', label: 'Gross profit', type: 'currency' },
  { key: 'marginPercent', label: 'Margin %', suffix: '%' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    result.value = await stockProfitability({
      companyId: companyId.value,
      warehouseId: warehouseId.value,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value
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
