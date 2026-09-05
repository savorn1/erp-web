<template>
  <div>
    <div class="mb-4">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">Serial numbers</h1>
      <p class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Individually tracked units, one row per serial.</p>
    </div>

    <UCard class="mb-4">
      <div class="flex flex-wrap gap-3">
        <UInput v-model="search" placeholder="Search serial number" icon="i-lucide-search" class="w-56" />
        <USelect v-model="filter.productId" :items="productFilterOptions" placeholder="Product" class="w-48" />
        <USelect v-model="filter.warehouseId" :items="warehouseFilterOptions" placeholder="Warehouse" class="w-44" />
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
        export-filename="serial-numbers"
        :row-number-start="(page - 1) * pageSize"
        @refresh="load"
      >
        <template #empty-state>
          <EmptyState
            v-if="hasActiveFilter"
            icon="i-lucide-search-x"
            title="No serial numbers match your filters"
            description="Try a different search or clear your filters."
          >
            <template #action>
              <UButton color="neutral" variant="soft" icon="i-lucide-x" @click="clearFilters">Clear filters</UButton>
            </template>
          </EmptyState>
          <EmptyState v-else icon="i-lucide-scan-barcode" title="No serial numbers yet" description="Receive a serial-tracked product to see its units here." />
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
import type { SerialNumber } from '~/composables/useSerialNumbers'

definePageMeta({ middleware: 'admin' })

const { list } = useSerialNumbers()
const { list: listWarehouses } = useWarehouses()
const { list: listProducts } = useProducts()

const rows = ref<SerialNumber[]>([])
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

const filter = reactive<{ productId: number | undefined; warehouseId: number | undefined }>({ productId: undefined, warehouseId: undefined })

const sort = ref<{ column: string; direction: 'asc' | 'desc' } | undefined>({ column: 'id', direction: 'desc' })
const { page, pageSize, total, rows: pagedRows, truncated, search } = useClientTable(rows, { pageSize: 15, searchFields: ['serialNumber'] })

const columns: ColumnDef<SerialNumber>[] = [
  { key: 'serialNumber', label: 'Serial number', sortable: true },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'binName', label: 'Bin', value: (row) => row.binName ?? '—' },
  { key: 'batchNumber', label: 'Batch', value: (row) => row.batchNumber ?? '—' },
  { key: 'expirationDate', label: 'Expires', type: 'date' },
  { key: 'status', type: 'badge' },
  { key: 'createdAt', label: 'Received', type: 'datetime' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await list({
      productId: filter.productId,
      warehouseId: filter.warehouseId,
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
watch(() => [filter.productId, filter.warehouseId], load)

const hasActiveFilter = computed(() => search.value !== '' || filter.productId !== undefined || filter.warehouseId !== undefined)
function clearFilters() {
  search.value = ''
  filter.productId = undefined
  filter.warehouseId = undefined
  load()
}
</script>
