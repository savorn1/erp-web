<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Manufacturing profitability"
      description="Selling price vs. actual manufacturing unit cost, per product — a manufacturing margin, not a full P&L."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Manufacturing reports' }, { label: 'Profitability' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-52" />
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

    <template v-else-if="report">
      <StatTile label="Total margin" :value="formatCurrency(report.totalMargin)" icon="i-lucide-piggy-bank" color="success" class="mb-4" />
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No completed production in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { ManufacturingProfitability, ManufacturingProfitabilityRow } from '~/composables/useManufacturingReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { profitability: fetchProfitability } = useManufacturingReports()

const loading = ref(false)
const error = ref('')
const report = ref<ManufacturingProfitability | null>(null)

const columns: ColumnDef<ManufacturingProfitabilityRow>[] = [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'totalProducedQuantity', label: 'Produced qty' },
  { key: 'averageUnitCost', label: 'Unit cost', type: 'currency' },
  { key: 'sellingPrice', label: 'Selling price', type: 'currency' },
  { key: 'marginPerUnit', label: 'Margin/unit', type: 'currency' },
  { key: 'totalMargin', label: 'Total margin', type: 'currency' },
  { key: 'marginPercent', label: 'Margin %', suffix: '%' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchProfitability({
      companyId: companyId.value,
      warehouseId: warehouseId.value,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined
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
