<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock roll-forward"
      description="Beginning balance, in, out, and ending balance per product and warehouse, for a date range."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock roll-forward' }]"
    />

    <UAlert
      color="neutral"
      variant="subtle"
      class="mb-4"
      title="Adjustments reconcile the difference"
      description="In/Out only cover receipts, issues, transfers, and manufacturing movements. Stock adjustments made during the range aren't split into in/out — they show up in the Adjustments column instead, so Beginning + In − Out + Adjustments always equals Ending."
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-48" />
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
          <EmptyState icon="i-lucide-list-restart" title="No movements in this range" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'

definePageMeta({ middleware: 'admin' })

interface RollForwardRow {
  productId: number
  productName: string | null
  productSku: string | null
  warehouseId: number
  warehouseName: string | null
  beginningQuantity: number
  inQuantity: number
  outQuantity: number
  adjustments: number
  endingQuantity: number
}

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { openingClosingStock, stockIn, stockOut } = useInventoryReports()
const { list: listProducts } = useProducts()
const { mode, displayUnitOptions, ensurePackUnits, formatQuantity } = useDisplayUnit()

const loading = ref(false)
const error = ref('')
const rows = ref<RollForwardRow[]>([])
const products = ref<{ id: number; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]>([])

function formatted(row: RollForwardRow, baseQuantity: number, signed = false) {
  return formatQuantity(products.value.find((p) => p.id === row.productId), baseQuantity, { signed })
}

const columns = computed<ColumnDef<RollForwardRow>[]>(() => [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'beginningQuantity', label: 'Beginning', value: (row) => formatted(row, row.beginningQuantity) },
  { key: 'inQuantity', label: 'In', value: (row) => formatted(row, row.inQuantity), class: 'text-success' },
  { key: 'outQuantity', label: 'Out', value: (row) => formatted(row, row.outQuantity), class: 'text-error' },
  {
    key: 'adjustments',
    label: 'Adjustments',
    value: (row) => formatted(row, row.adjustments, true),
    class: (row) => (row.adjustments > 0 ? 'text-success' : row.adjustments < 0 ? 'text-error' : '')
  },
  { key: 'endingQuantity', label: 'Ending', value: (row) => formatted(row, row.endingQuantity) }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const query = { companyId: companyId.value, warehouseId: warehouseId.value, dateFrom: dateFrom.value, dateTo: dateTo.value }
    const [openingClosing, inResult, outResult, productsRes] = await Promise.all([
      openingClosingStock(query),
      stockIn(query),
      stockOut(query),
      products.value.length === 0 ? listProducts({ size: 10000 }) : Promise.resolve(null)
    ])
    if (productsRes) products.value = productsRes.data

    const byKey = new Map<string, RollForwardRow>()
    function bucketFor(productId: number, warehouseId: number, productName: string | null, productSku: string | null, warehouseName: string | null) {
      const key = `${productId}:${warehouseId}`
      let bucket = byKey.get(key)
      if (!bucket) {
        bucket = { productId, productName, productSku, warehouseId, warehouseName, beginningQuantity: 0, inQuantity: 0, outQuantity: 0, adjustments: 0, endingQuantity: 0 }
        byKey.set(key, bucket)
      }
      return bucket
    }
    for (const row of openingClosing.rows) {
      const bucket = bucketFor(row.productId, row.warehouseId, row.productName, row.productSku, row.warehouseName)
      bucket.beginningQuantity = row.openingQuantity
      bucket.endingQuantity = row.closingQuantity
    }
    for (const row of inResult.rows) {
      const bucket = bucketFor(row.productId, row.warehouseId, row.productName, row.productSku, row.warehouseName)
      bucket.inQuantity += row.quantity
    }
    for (const row of outResult.rows) {
      const bucket = bucketFor(row.productId, row.warehouseId, row.productName, row.productSku, row.warehouseName)
      bucket.outQuantity += row.quantity
    }
    for (const bucket of byKey.values()) {
      bucket.adjustments = bucket.endingQuantity - bucket.beginningQuantity - bucket.inQuantity + bucket.outQuantity
    }
    rows.value = Array.from(byKey.values()).sort((a, b) => (a.productName ?? '').localeCompare(b.productName ?? ''))
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
watch([companyId, warehouseId, dateFrom, dateTo], load)
</script>
