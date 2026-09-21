<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="UOM stock"
      description="On-hand quantity totalled per unit of measure."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'UOM stock' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" exportable export-filename="inventory-uom-stock">
        <template #empty-state>
          <EmptyState icon="i-lucide-ruler" title="No stock yet" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'

definePageMeta({ middleware: 'admin' })

interface UomStockRow {
  unitOfMeasureName: string
  productCount: number
  totalQuantity: number
  totalValue: number
}

const { companyId, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { get: fetchInventoryOverview } = useInventoryOverview()
const { list: listProducts } = useProducts()

const loading = ref(false)
const error = ref('')
const rows = ref<UomStockRow[]>([])

const columns: ColumnDef<UomStockRow>[] = [
  { key: 'unitOfMeasureName', label: 'Unit of measure' },
  { key: 'productCount', label: 'Products' },
  { key: 'totalQuantity', label: 'Total quantity' },
  { key: 'totalValue', label: 'Total value', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [overview, products] = await Promise.all([
      fetchInventoryOverview({ companyId: companyId.value, size: 100000 }).then((r) => r.data),
      listProducts({ companyId: companyId.value, size: 10000 }).then((r) => r.data)
    ])
    const uomByProduct = new Map(products.map((p) => [p.id, p.unitOfMeasureName ?? p.unitOfMeasureAbbreviation ?? 'Unknown']))
    const byUom = new Map<string, UomStockRow>()
    const productsSeenPerUom = new Map<string, Set<number>>()
    for (const row of overview) {
      const uomName = uomByProduct.get(row.productId) ?? 'Unknown'
      let bucket = byUom.get(uomName)
      if (!bucket) {
        bucket = { unitOfMeasureName: uomName, productCount: 0, totalQuantity: 0, totalValue: 0 }
        byUom.set(uomName, bucket)
        productsSeenPerUom.set(uomName, new Set())
      }
      const seen = productsSeenPerUom.get(uomName)!
      if (!seen.has(row.productId)) {
        seen.add(row.productId)
        bucket.productCount++
      }
      bucket.totalQuantity += row.currentStock
      bucket.totalValue += row.valuationValue
    }
    rows.value = Array.from(byUom.values()).sort((a, b) => b.totalValue - a.totalValue)
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
