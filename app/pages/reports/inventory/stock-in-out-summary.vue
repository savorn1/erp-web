<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock in/out summary"
      description="Inbound and outbound quantity side by side, per product and warehouse."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock in/out summary' }]"
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

    <template v-else>
      <UAlert
        color="neutral"
        variant="subtle"
        class="mb-4"
        title="Totals mix units across products"
        description="These are raw sums of quantity across every product and warehouse in view, in each product's base unit — they don't account for different products using different units of measure, and aren't affected by the display-unit toggle above."
      />
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatTile label="Total in" :value="String(totalIn)" icon="i-lucide-log-in" color="success" />
        <StatTile label="Total out" :value="String(totalOut)" icon="i-lucide-log-out" color="error" />
        <StatTile label="Net change" :value="(totalIn - totalOut >= 0 ? '+' : '') + String(totalIn - totalOut)" icon="i-lucide-arrow-left-right" color="info" />
      </div>
      <UCard>
        <DataTable :rows="rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-arrow-left-right" title="No movements in this range" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'

definePageMeta({ middleware: 'admin' })

interface SummaryRow {
  productId: number
  productName: string | null
  productSku: string | null
  warehouseId: number
  warehouseName: string | null
  inQuantity: number
  outQuantity: number
  net: number
  movementCount: number
}

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { stockIn, stockOut } = useInventoryReports()
const { list: listProducts } = useProducts()
const { mode, displayUnitOptions, ensurePackUnits, displayQuantity } = useDisplayUnit()

const loading = ref(false)
const error = ref('')
const rows = ref<SummaryRow[]>([])
const products = ref<{ id: number; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]>([])
const totalIn = computed(() => rows.value.reduce((sum, r) => sum + r.inQuantity, 0))
const totalOut = computed(() => rows.value.reduce((sum, r) => sum + r.outQuantity, 0))

function formatted(row: SummaryRow, baseQuantity: number) {
  const { quantity, unit } = displayQuantity(
    products.value.find((p) => p.id === row.productId),
    baseQuantity
  )
  return unit ? `${quantity} ${unit}` : quantity
}

const columns = computed<ColumnDef<SummaryRow>[]>(() => [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  { key: 'inQuantity', label: 'In', value: (row) => formatted(row, row.inQuantity), class: 'text-success' },
  { key: 'outQuantity', label: 'Out', value: (row) => formatted(row, row.outQuantity), class: 'text-error' },
  {
    key: 'net',
    label: 'Net',
    value: (row) => {
      const { quantity, unit } = displayQuantity(products.value.find((p) => p.id === row.productId), row.net)
      const signed = quantity >= 0 ? `+${quantity}` : String(quantity)
      return unit ? `${signed} ${unit}` : signed
    },
    class: (row) => (row.net > 0 ? 'text-success' : row.net < 0 ? 'text-error' : '')
  },
  { key: 'movementCount', label: 'Movements' }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const query = { companyId: companyId.value, warehouseId: warehouseId.value, dateFrom: dateFrom.value, dateTo: dateTo.value }
    const [inResult, outResult, productsRes] = await Promise.all([
      stockIn(query),
      stockOut(query),
      products.value.length === 0 ? listProducts({ size: 10000 }) : Promise.resolve(null)
    ])
    if (productsRes) products.value = productsRes.data

    const byKey = new Map<string, SummaryRow>()
    function bucketFor(productId: number, warehouseId: number, productName: string | null, productSku: string | null, warehouseName: string | null) {
      const key = `${productId}:${warehouseId}`
      let bucket = byKey.get(key)
      if (!bucket) {
        bucket = { productId, productName, productSku, warehouseId, warehouseName, inQuantity: 0, outQuantity: 0, net: 0, movementCount: 0 }
        byKey.set(key, bucket)
      }
      return bucket
    }
    for (const row of inResult.rows) {
      const bucket = bucketFor(row.productId, row.warehouseId, row.productName, row.productSku, row.warehouseName)
      bucket.inQuantity += row.quantity
      bucket.movementCount += row.movementCount
    }
    for (const row of outResult.rows) {
      const bucket = bucketFor(row.productId, row.warehouseId, row.productName, row.productSku, row.warehouseName)
      bucket.outQuantity += row.quantity
      bucket.movementCount += row.movementCount
    }
    for (const bucket of byKey.values()) {
      bucket.net = bucket.inQuantity - bucket.outQuantity
    }
    rows.value = Array.from(byKey.values()).sort((a, b) => Math.abs(b.net) - Math.abs(a.net))
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
