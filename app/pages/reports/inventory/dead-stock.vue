<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Dead stock"
      description="Products still on hand with zero outbound activity over a trailing window."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Dead stock' }]"
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
        <UFormField label="Show quantity in">
          <USelect v-model="mode" :items="displayUnitOptions" class="w-36" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" :exportable="false">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="Nothing is dead stock" />
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
const { list: listProducts } = useProducts()
const { mode, displayUnitOptions, ensurePackUnits, displayQuantity } = useDisplayUnit()

const loading = ref(false)
const error = ref('')
const days = ref(90)
const rows = ref<StockTurnoverRow[]>([])
const products = ref<{ id: number; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]>([])

const columns = computed<ColumnDef<StockTurnoverRow>[]>(() => [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  {
    key: 'currentStock',
    label: 'On hand',
    value: (row) => {
      const { quantity, unit } = displayQuantity(products.value.find((p) => p.id === row.productId), row.currentStock)
      return unit ? `${quantity} ${unit}` : quantity
    }
  },
  { key: 'lastOutboundDate', label: 'Last outbound', value: (row) => row.lastOutboundDate ?? 'Never', type: 'datetime' }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [result, productsRes] = await Promise.all([
      stockTurnover({ companyId: companyId.value, warehouseId: warehouseId.value, days: days.value }),
      products.value.length === 0 ? listProducts({ size: 10000 }) : Promise.resolve(null)
    ])
    if (productsRes) products.value = productsRes.data
    rows.value = result.rows.filter((r) => r.outboundQuantityInWindow === 0)
    await ensurePackUnits(rows.value.map((r) => r.productId))
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
