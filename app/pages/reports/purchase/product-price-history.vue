<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Product price history"
      description="Every price paid for one product over time, across every supplier."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Purchase reports' }, { label: 'Product price history' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Product" required>
          <USelect v-model="productId" :items="productOptions" placeholder="Select a product" class="w-56" />
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

    <UCard v-else>
      <EmptyState
        v-if="!productId"
        icon="i-lucide-history"
        title="Select a product"
        description="Choose a product above to see what's been paid for it over time."
      />
      <DataTable v-else-if="history" :rows="history.rows" :columns="columns" exportable export-filename="purchase-product-price-history">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="No purchases in this period" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { ProductPurchasePriceHistory, ProductPurchasePriceHistoryRow } from '~/composables/usePurchaseReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { productPriceHistory: fetchHistory } = usePurchaseReports()
const { list: listProducts } = useProducts()

const products = ref<{ id: number; name: string; sku: string; companyId: number }[]>([])
const productId = ref<number | undefined>(undefined)
const productOptions = computed(() =>
  products.value.filter((p) => companyId.value === undefined || p.companyId === companyId.value).map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
)

const loading = ref(false)
const error = ref('')
const history = ref<ProductPurchasePriceHistory | null>(null)

const columns: ColumnDef<ProductPurchasePriceHistoryRow>[] = [
  { key: 'orderDate', label: 'Date', type: 'date' },
  { key: 'poNumber', label: 'Order', value: (row) => row.poNumber ?? '—' },
  { key: 'supplierName', label: 'Supplier', value: (row) => row.supplierName ?? '—' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unitCost', label: 'Unit cost', type: 'currency' }
]

async function load() {
  if (!productId.value) {
    history.value = null
    return
  }
  loading.value = true
  error.value = ''
  try {
    history.value = await fetchHistory({
      companyId: companyId.value,
      productId: productId.value,
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
  products.value = (await listProducts({ size: 1000 })).data
  await load()
})
watch([companyId, productId, dateFrom, dateTo], load)
</script>
