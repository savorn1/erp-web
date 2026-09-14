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
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" :exportable="false">
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
  productName: string | null
  productTotalQuantity: number
}

const { companyId, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { get: fetchInventoryOverview } = useInventoryOverview()
const { list: listVariants } = useProductVariants()

const loading = ref(false)
const error = ref('')
const rows = ref<VariantStockRow[]>([])

const columns: ColumnDef<VariantStockRow>[] = [
  { key: 'variantName', label: 'Variant', value: (row) => `${row.variantName} (${row.variantSku})` },
  { key: 'productName', label: 'Parent product', value: (row) => row.productName ?? '—' },
  { key: 'productTotalQuantity', label: "Product's total on-hand" }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [overview, variants] = await Promise.all([
      fetchInventoryOverview({ companyId: companyId.value, size: 100000 }).then((r) => r.data),
      listVariants({ size: 10000 }).then((r) => r.data)
    ])
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
        productName: v.productName,
        productTotalQuantity: quantityByProduct.get(v.productId) ?? 0
      }))
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
