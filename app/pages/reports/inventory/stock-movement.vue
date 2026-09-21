<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock movement"
      description="Every stock change — receipts, issues, transfers, and adjustments."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock movement' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-48" />
        </UFormField>
        <UFormField label="Type">
          <USelect v-model="movementType" :items="movementTypeOptions" placeholder="All types" class="w-40" />
        </UFormField>
        <UFormField label="Direction">
          <USelect v-model="direction" :items="directionOptions" placeholder="In & out" class="w-32" />
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

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" :exportable="false">
        <template #empty-state>
          <EmptyState icon="i-lucide-history" title="No movements match your filters" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StockMovement, StockMovementDirection } from '~/composables/useStockMovements'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, movementType, activeCompanyOptions, warehouseFilterOptions, movementTypeOptions, ensureLoaded } =
  useReportFilters()
const { list: fetchStockMovements } = useStockMovements()
const { list: listProducts } = useProducts()
const { mode, displayUnitOptions, ensurePackUnits, formatQuantity } = useDisplayUnit()

const loading = ref(false)
const error = ref('')
const rows = ref<StockMovement[]>([])
const products = ref<{ id: number; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]>([])

const direction = ref<StockMovementDirection | undefined>(undefined)
const directionOptions = [
  { label: 'In & out', value: undefined },
  { label: 'In', value: 'IN' },
  { label: 'Out', value: 'OUT' }
]

const columns = computed<ColumnDef<StockMovement>[]>(() => [
  { key: 'createdAt', label: 'Date', type: 'datetime' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'type', label: 'Type', type: 'status' },
  {
    key: 'direction',
    label: 'Direction',
    type: 'badge',
    value: (row) => (row.direction === 'IN' ? 'In' : 'Out'),
    color: (row) => (row.direction === 'IN' ? 'success' : 'error')
  },
  {
    key: 'quantityDelta',
    label: 'Qty change',
    value: (row) =>
      formatQuantity(
        products.value.find((p) => p.id === row.productId),
        row.quantityDelta,
        { signed: true }
      ),
    class: (row) => (row.quantityDelta >= 0 ? 'text-success' : 'text-error')
  },
  { key: 'reference', label: 'Reference', value: (row) => `${row.referenceType} #${row.referenceId}` }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [res, productsRes] = await Promise.all([
      fetchStockMovements({
        companyId: companyId.value,
        warehouseId: warehouseId.value,
        type: movementType.value,
        direction: direction.value,
        dateFrom: dateFrom.value || undefined,
        dateTo: dateTo.value || undefined,
        size: 200,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      }),
      products.value.length === 0 ? listProducts({ size: 10000 }) : Promise.resolve(null)
    ])
    rows.value = res.data
    if (productsRes) products.value = productsRes.data
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
watch([companyId, warehouseId, dateFrom, dateTo, movementType, direction], load)
</script>
