<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock aging"
      description="Current stock bucketed by days since it was last received."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock aging' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-48" />
        </UFormField>
        <UFormField label="Show quantity in">
          <USelect v-model="mode" :items="displayUnitOptions" class="w-36" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="aging">
      <div class="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-4">
        <StatTile
          v-for="bucket in aging.buckets"
          :key="bucket.bucket"
          :label="bucket.bucket"
          :value="String(bucket.totalQuantity)"
          icon="i-lucide-clock"
          :color="bucket.bucket === '90+' ? 'error' : bucket.bucket === '61-90' ? 'warning' : 'neutral'"
        />
      </div>
      <UCard>
        <DataTable :rows="aging.rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-boxes" title="No stock yet" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StockAging, StockAgingRow } from '~/composables/useInventoryReports'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { stockAging } = useInventoryReports()
const { list: listProducts } = useProducts()
const { mode, displayUnitOptions, ensurePackUnits, formatQuantity } = useDisplayUnit()

const loading = ref(false)
const error = ref('')
const aging = ref<StockAging | null>(null)
const products = ref<{ id: number; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]>([])

const columns = computed<ColumnDef<StockAgingRow>[]>(() => [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'warehouseName', label: 'Warehouse', value: (row) => row.warehouseName ?? '—' },
  {
    key: 'currentStock',
    label: 'On hand',
    value: (row) => formatQuantity(products.value.find((p) => p.id === row.productId), row.currentStock)
  },
  { key: 'value', label: 'Value', type: 'currency' },
  { key: 'daysSinceInbound', label: 'Days since received', value: (row) => row.daysSinceInbound ?? '—' },
  { key: 'ageBucket', label: 'Bucket', type: 'badge', color: (row) => (row.ageBucket === '90+' ? 'error' : row.ageBucket === '61-90' ? 'warning' : 'neutral') }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [result, productsRes] = await Promise.all([
      stockAging({ companyId: companyId.value, warehouseId: warehouseId.value }),
      products.value.length === 0 ? listProducts({ size: 10000 }) : Promise.resolve(null)
    ])
    aging.value = result
    if (productsRes) products.value = productsRes.data
    await ensurePackUnits(result.rows.map((r) => r.productId))
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
watch([companyId, warehouseId], load)
</script>
