<template>
  <div>
    <div class="mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Stock levels</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Current on-hand quantity per product and location.</p>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <USelect v-model="filter.companyId" :items="companyFilterOptions" placeholder="Company" class="w-44" />
        <USelect v-model="filter.warehouseId" :items="warehouseFilterOptions" placeholder="Warehouse" class="w-44" />
        <USelect v-model="filter.productId" :items="productFilterOptions" placeholder="Product" class="w-48" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters">
          Clear filters
        </UButton>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <TruncatedResultsAlert v-if="truncated" />

    <UCard>
      <DataTable
        v-model:sort="sort"
        :rows="pagedRows"
        :columns="columns"
        :loading="loading"
        refreshable
        numbered
        exportable
        export-filename="stock-levels"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No stock matches your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-boxes" title="No stock yet" description="Post a goods receipt to bring stock into a warehouse." />
        </template>
      </DataTable>

      <div v-if="total > 0" class="pt-4">
        <DataPagination v-model:page="page" v-model:page-size="pageSize" :total="total" />
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StockLevel } from '~/composables/useStockLevels'

definePageMeta({ middleware: 'admin' })

const { list } = useStockLevels()
const { list: listCompanies } = useCompanies()
const { list: listWarehouses } = useWarehouses()
const { list: listProducts } = useProducts()

const rows = ref<StockLevel[]>([])
const loading = ref(false)
const error = ref('')

const companies = ref<{ id: number; name: string }[]>([])
const warehouses = ref<{ id: number; name: string }[]>([])
const products = ref<{ id: number; name: string; sku: string }[]>([])

async function loadLookups() {
  const [c, w, p] = await Promise.all([
    listCompanies({ size: 200 }),
    listWarehouses({ size: 200 }),
    listProducts({ size: 200 })
  ])
  companies.value = c.data
  warehouses.value = w.data
  products.value = p.data
}

const companyFilterOptions = computed(() => [{ label: 'All companies', value: undefined }, ...companies.value.map((c) => ({ label: c.name, value: c.id }))])
const warehouseFilterOptions = computed(() => [{ label: 'All warehouses', value: undefined }, ...warehouses.value.map((w) => ({ label: w.name, value: w.id }))])
const productFilterOptions = computed(() => [{ label: 'All products', value: undefined }, ...products.value.map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))])

const filter = reactive<{ companyId: number | undefined; warehouseId: number | undefined; productId: number | undefined }>({
  companyId: undefined,
  warehouseId: undefined,
  productId: undefined
})

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated } = useClientTable(rows, { pageSize: 15 })

const columns: ColumnDef<StockLevel>[] = [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'binName', label: 'Bin', value: (row) => row.binName ?? '—' },
  { key: 'quantityOnHand', label: 'On hand', value: (row) => `${row.quantityOnHand} ${row.unitOfMeasureAbbreviation ?? ''}`.trim() }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      companyId: filter.companyId,
      warehouseId: filter.warehouseId,
      productId: filter.productId,
      sortBy: sort.value?.column,
      sortOrder: sort.value?.direction,
      size: 200
    })
    rows.value = res.data
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadLookups()
  await load()
})
watch(sort, load)
watch(() => [filter.companyId, filter.warehouseId, filter.productId], load)

const hasActiveFilter = computed(() => filter.companyId !== undefined || filter.warehouseId !== undefined || filter.productId !== undefined)
function clearFilters() {
  filter.companyId = undefined
  filter.warehouseId = undefined
  filter.productId = undefined
  load()
}
</script>
