<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock valuation"
      description="Total quantity and value on hand, by warehouse."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock valuation' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-48" />
        </UFormField>
        <UFormField label="Show quantity in">
          <USelect v-model="mode" :items="displayUnitOptions" class="w-36" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="stockValuation">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Products" :value="String(productRows.length)" icon="i-lucide-boxes" color="info" />
        <StatTile label="Total value" :value="formatCurrency(stockValuation.totalValue)" icon="i-lucide-circle-dollar-sign" color="neutral" />
      </div>

      <UCard class="mb-4">
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">By warehouse</h2></template>
        <!-- A warehouse row sums quantity across every product it holds, which
             usually mixes units of measure (boxes + kg + pcs…) — that total
             can't be expressed in any single UOM, so only value is totaled
             here. Quantity in a real unit lives in the by-product table below. -->
        <DataTable :rows="stockValuation.rows" :columns="warehouseColumns" exportable export-filename="inventory-stock-valuation-by-warehouse">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No stock yet" />
          </template>
        </DataTable>
      </UCard>

      <UCard>
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">By product</h2></template>
        <DataTable :rows="productRows" :columns="productColumns" exportable export-filename="inventory-stock-valuation-by-product">
          <template #empty-state>
            <EmptyState icon="i-lucide-package" title="No stock yet" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StockValuation, StockValuationRow } from '~/composables/useInventoryReports'

definePageMeta({ middleware: 'admin' })

interface ProductValuationRow {
  productId: number
  productName: string | null
  productSku: string | null
  warehouseCount: number
  totalQuantity: number
  totalValue: number
}

const { companyId, warehouseId, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { stockValuation: fetchStockValuation } = useInventoryReports()
const { get: fetchInventoryOverview } = useInventoryOverview()
const { list: listProducts } = useProducts()
const { mode, displayUnitOptions, ensurePackUnits, formatQuantity } = useDisplayUnit()

const loading = ref(false)
const error = ref('')
const stockValuation = ref<StockValuation | null>(null)
const productRows = ref<ProductValuationRow[]>([])
const products = ref<{ id: number; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]>([])

const warehouseColumns: ColumnDef<StockValuationRow>[] = [
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'productCount', label: 'Products' },
  { key: 'totalValue', label: 'Value', type: 'currency' }
]

const productColumns = computed<ColumnDef<ProductValuationRow>[]>(() => [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseCount', label: 'Warehouses' },
  {
    key: 'totalQuantity',
    label: 'Quantity',
    value: (row) =>
      formatQuantity(
        products.value.find((p) => p.id === row.productId),
        row.totalQuantity
      )
  },
  { key: 'totalValue', label: 'Value', type: 'currency' }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [valuation, overviewRes, productsRes] = await Promise.all([
      fetchStockValuation({ companyId: companyId.value, warehouseId: warehouseId.value }),
      fetchInventoryOverview({ companyId: companyId.value, warehouseId: warehouseId.value, size: 100000 }),
      products.value.length === 0 ? listProducts({ size: 10000 }) : Promise.resolve(null)
    ])
    stockValuation.value = valuation
    if (productsRes) products.value = productsRes.data

    const byProduct = new Map<number, ProductValuationRow>()
    for (const row of overviewRes.data) {
      let bucket = byProduct.get(row.productId)
      if (!bucket) {
        bucket = { productId: row.productId, productName: row.productName, productSku: row.productSku, warehouseCount: 0, totalQuantity: 0, totalValue: 0 }
        byProduct.set(row.productId, bucket)
      }
      bucket.warehouseCount++
      bucket.totalQuantity += row.currentStock
      bucket.totalValue += row.valuationValue
    }
    productRows.value = Array.from(byProduct.values()).sort((a, b) => b.totalValue - a.totalValue)
    await ensurePackUnits(productRows.value.map((r) => r.productId))
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
