<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Product variant stock"
      description="Every product variant alongside its parent product's total on-hand stock."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Product variant stock' }]"
    />

    <UAlert
      color="neutral"
      variant="subtle"
      class="mb-4"
      title="Variants don't carry their own stock"
      description="Stock is tracked at the product level, not per variant — this report shows each variant next to its parent product's total on-hand quantity."
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
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" exportable export-filename="inventory-product-variant-stock">
        <template #empty-state>
          <EmptyState icon="i-lucide-badge" title="No variants yet" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'

definePageMeta({ middleware: 'admin' })

interface VariantStockRow {
  variantId: number
  variantName: string
  variantSku: string
  productId: number
  productName: string | null
  productTotalQuantity: number
}

const { companyId, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { get: fetchInventoryOverview } = useInventoryOverview()
const { list: listVariants } = useProductVariants()
const { list: listProducts } = useProducts()
const { mode, displayUnitOptions, ensurePackUnits, formatQuantity } = useDisplayUnit()

const loading = ref(false)
const error = ref('')
const rows = ref<VariantStockRow[]>([])
const products = ref<{ id: number; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]>([])

const columns = computed<ColumnDef<VariantStockRow>[]>(() => [
  { key: 'variantName', label: 'Variant', value: (row) => `${row.variantName} (${row.variantSku})` },
  { key: 'productName', label: 'Parent product', value: (row) => row.productName ?? '—' },
  {
    key: 'productTotalQuantity',
    label: "Product's total on-hand",
    value: (row) =>
      formatQuantity(
        products.value.find((p) => p.id === row.productId),
        row.productTotalQuantity
      )
  }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [overview, variants, productsRes] = await Promise.all([
      fetchInventoryOverview({ companyId: companyId.value, size: 100000 }).then((r) => r.data),
      listVariants({ size: 10000 }).then((r) => r.data),
      products.value.length === 0 ? listProducts({ size: 10000 }) : Promise.resolve(null)
    ])
    if (productsRes) products.value = productsRes.data
    const quantityByProduct = new Map<number, number>()
    for (const row of overview) {
      quantityByProduct.set(row.productId, (quantityByProduct.get(row.productId) ?? 0) + row.currentStock)
    }
    rows.value = variants
      .filter((v) => v.active)
      .map((v) => ({
        variantId: v.id,
        variantName: v.name,
        variantSku: v.sku,
        productId: v.productId,
        productName: v.productName,
        productTotalQuantity: quantityByProduct.get(v.productId) ?? 0
      }))
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
