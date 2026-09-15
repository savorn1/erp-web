<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock out"
      description="Outbound quantity (issues, transfers out, material consumption) per product and warehouse."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock out' }]"
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
        <UFormField label="Show quantity in">
          <USelect v-model="mode" :items="displayUnitOptions" class="w-36" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="result">
      <UAlert
        color="neutral"
        variant="subtle"
        class="mb-4"
        title="Total out mixes units across products"
        description="This is a raw sum of quantity across every matched movement, in each product's base unit — it doesn't account for different products using different units of measure, and it isn't affected by the display-unit toggle above."
      />
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
        <StatTile label="Total out" :value="String(result.totalQuantity)" icon="i-lucide-log-out" color="error" />
      </div>
      <UCard>
        <DataTable :rows="result.rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-package-minus" title="No outbound movements in this range" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StockInOut, StockInOutRow } from '~/composables/useInventoryReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { stockOut } = useInventoryReports()
const { list: listProducts } = useProducts()
const { mode, displayUnitOptions, ensurePackUnits, formatQuantity } = useDisplayUnit()

const loading = ref(false)
const error = ref('')
const result = ref<StockInOut | null>(null)
const products = ref<{ id: number; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]>([])

const columns = computed<ColumnDef<StockInOutRow>[]>(() => [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  {
    key: 'quantity',
    label: 'Quantity out',
    value: (row) => formatQuantity(products.value.find((p) => p.id === row.productId), row.quantity)
  },
  { key: 'movementCount', label: 'Movements' }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [res, productsRes] = await Promise.all([
      stockOut({ companyId: companyId.value, warehouseId: warehouseId.value, dateFrom: dateFrom.value, dateTo: dateTo.value }),
      products.value.length === 0 ? listProducts({ size: 10000 }) : Promise.resolve(null)
    ])
    result.value = res
    if (productsRes) products.value = productsRes.data
    await ensurePackUnits(res.rows.map((r) => r.productId))
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
