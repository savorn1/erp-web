<template>
  <div>
    <div class="mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Stock movements</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Audit trail of every stock quantity change.</p>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <USelect v-model="filter.warehouseId" :items="warehouseFilterOptions" placeholder="Warehouse" class="w-44" />
        <USelect v-model="filter.productId" :items="productFilterOptions" placeholder="Product" class="w-48" />
        <USelect v-model="filter.type" :items="typeFilterOptions" placeholder="Type" class="w-40" />
        <UInput v-model="filter.dateFrom" type="date" class="w-40" />
        <UInput v-model="filter.dateTo" type="date" class="w-40" />
        <UButton v-if="hasActiveFilter" size="sm" color="neutral" variant="ghost" icon="i-lucide-x" @click="clearFilters"> Clear filters </UButton>
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
        export-filename="stock-movements"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #quantityDelta-data="{ row }">
          <span :class="row.quantityDelta >= 0 ? 'text-error' : 'text-success'" class="font-medium">
            {{ row.quantityDelta >= 0 ? '+' : '' }}{{ row.quantityDelta }}
          </span>
        </template>
        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No movements match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-history" title="No movements yet" description="Post a goods receipt to see stock movements here." />
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
import type { StockMovement, StockMovementType } from '~/composables/useStockMovements'

definePageMeta({ middleware: 'admin' })

const { list } = useStockMovements()
const { list: listWarehouses } = useWarehouses()
const { list: listProducts } = useProducts()

const rows = ref<StockMovement[]>([])
const loading = ref(false)
const error = ref('')

const warehouses = ref<{ id: number; name: string }[]>([])
const products = ref<{ id: number; name: string; sku: string }[]>([])

async function loadLookups() {
  const [w, p] = await Promise.all([listWarehouses({ size: 200 }), listProducts({ size: 200 })])
  warehouses.value = w.data
  products.value = p.data
}

const warehouseFilterOptions = computed(() => [{ label: 'All warehouses', value: undefined }, ...warehouses.value.map((w) => ({ label: w.name, value: w.id }))])
const productFilterOptions = computed(() => [
  { label: 'All products', value: undefined },
  ...products.value.map((p) => ({ label: `${p.name} (${p.sku})`, value: p.id }))
])

const typeFilterOptions = [
  { label: 'All types', value: undefined },
  { label: 'Receipt', value: 'RECEIPT' },
  { label: 'Issue', value: 'ISSUE' },
  { label: 'Transfer out', value: 'TRANSFER_OUT' },
  { label: 'Transfer in', value: 'TRANSFER_IN' },
  { label: 'Adjustment', value: 'ADJUSTMENT' }
]

const filter = reactive<{
  warehouseId: number | undefined
  productId: number | undefined
  type: StockMovementType | undefined
  dateFrom: string
  dateTo: string
}>({ warehouseId: undefined, productId: undefined, type: undefined, dateFrom: '', dateTo: '' })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'createdAt', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated } = useClientTable(rows, { pageSize: 15 })

const columns: ColumnDef<StockMovement>[] = [
  { key: 'createdAt', label: 'Date', type: 'datetime' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'binName', label: 'Bin', value: (row) => row.binName ?? '—' },
  { key: 'type', type: 'badge' },
  { key: 'quantityDelta', label: 'Qty change' },
  { key: 'referenceType', label: 'Reference', value: (row) => `${row.referenceType} #${row.referenceId}` },
  { key: 'createdBy', label: 'By', value: (row) => row.createdBy ?? '—' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      warehouseId: filter.warehouseId,
      productId: filter.productId,
      type: filter.type,
      dateFrom: filter.dateFrom || undefined,
      dateTo: filter.dateTo || undefined,
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
watch(() => [filter.warehouseId, filter.productId, filter.type, filter.dateFrom, filter.dateTo], load)

const hasActiveFilter = computed(
  () =>
    filter.warehouseId !== undefined ||
    filter.productId !== undefined ||
    filter.type !== undefined ||
    filter.dateFrom !== '' ||
    filter.dateTo !== ''
)
function clearFilters() {
  filter.warehouseId = undefined
  filter.productId = undefined
  filter.type = undefined
  filter.dateFrom = ''
  filter.dateTo = ''
  load()
}
</script>
