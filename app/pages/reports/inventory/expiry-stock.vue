<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Expiry stock"
      description="Batches with an expiration date, soonest first."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Expiry stock' }]"
    />

    <UAlert
      color="neutral"
      variant="subtle"
      class="mb-4"
      title="Manufacturing consumption isn't tracked per batch"
      description="Remaining quantity reflects goods receipts, deliveries, and approved adjustments only — a batch consumed by a manufacturing order won't be subtracted, since Manufacturing doesn't record which batch it drew from."
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
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" :exportable="false">
        <template #empty-state>
          <EmptyState icon="i-lucide-calendar-x" title="No batches with an expiration date" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { BatchLotStockRow } from '~/composables/useInventoryReports'

definePageMeta({ middleware: 'admin' })

const { companyId, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { batchLotStock } = useInventoryReports()
const { list: listProducts } = useProducts()
const { mode, displayUnitOptions, ensurePackUnits, formatQuantity } = useDisplayUnit()

const loading = ref(false)
const error = ref('')
const rows = ref<BatchLotStockRow[]>([])
const products = ref<{ id: number; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]>([])

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

const columns = computed<ColumnDef<BatchLotStockRow>[]>(() => [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'batchNumber', label: 'Batch / lot' },
  {
    key: 'currentQuantity',
    label: 'Current qty',
    value: (row) => formatQuantity(products.value.find((p) => p.id === row.productId), row.currentQuantity)
  },
  { key: 'expirationDate', label: 'Expiration', type: 'date' },
  {
    key: 'daysUntilExpiry',
    label: 'Days until expiry',
    value: (row) => (row.expirationDate ? daysUntil(row.expirationDate) : '—'),
    class: (row) => (row.expirationDate && daysUntil(row.expirationDate) <= 30 ? 'text-error' : '')
  }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [result, productsRes] = await Promise.all([
      batchLotStock({ companyId: companyId.value, includeDepleted: false }),
      products.value.length === 0 ? listProducts({ size: 10000 }) : Promise.resolve(null)
    ])
    if (productsRes) products.value = productsRes.data
    rows.value = result.rows.filter((r) => r.expirationDate)
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
