<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Product stock"
      description="On-hand quantity and value per product, across every warehouse."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Product stock' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
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
          <EmptyState icon="i-lucide-package" title="No stock yet" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'

definePageMeta({ middleware: 'admin' })

interface ProductStockRow {
  productId: number
  productName: string | null
  productSku: string | null
  warehouseCount: number
  totalQuantity: number
  totalValue: number
}

const { companyId, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { get: fetchInventoryOverview } = useInventoryOverview()
const { list: listProducts } = useProducts()
const { mode, displayUnitOptions, ensurePackUnits, formatQuantity } = useDisplayUnit()

const loading = ref(false)
const error = ref('')
const rows = ref<ProductStockRow[]>([])
const products = ref<{ id: number; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]>([])

const columns = computed<ColumnDef<ProductStockRow>[]>(() => [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseCount', label: 'Warehouses' },
  {
    key: 'totalQuantity',
    label: 'Total quantity',
    value: (row) => formatQuantity(products.value.find((p) => p.id === row.productId), row.totalQuantity)
  },
  { key: 'totalValue', label: 'Total value', type: 'currency' }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [overviewRes, productsRes] = await Promise.all([
      fetchInventoryOverview({ companyId: companyId.value, size: 100000 }),
      products.value.length === 0 ? listProducts({ size: 10000 }) : Promise.resolve(null)
    ])
    if (productsRes) products.value = productsRes.data
    const overview = overviewRes.data
    const byProduct = new Map<number, ProductStockRow>()
    for (const row of overview) {
      let bucket = byProduct.get(row.productId)
      if (!bucket) {
        bucket = { productId: row.productId, productName: row.productName, productSku: row.productSku, warehouseCount: 0, totalQuantity: 0, totalValue: 0 }
        byProduct.set(row.productId, bucket)
      }
      bucket.warehouseCount++
      bucket.totalQuantity += row.currentStock
      bucket.totalValue += row.valuationValue
    }
    rows.value = Array.from(byProduct.values()).sort((a, b) => b.totalValue - a.totalValue)
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
watch(companyId, load)
</script>
