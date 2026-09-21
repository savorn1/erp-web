<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Batch / lot stock"
      description="Current quantity per batch/lot, aggregated across every warehouse."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Batch / lot stock' }]"
    />

    <UAlert
      color="neutral"
      variant="subtle"
      class="mb-4"
      title="Manufacturing consumption isn't tracked per batch"
      description="Quantities here reflect goods receipts, deliveries, and approved adjustments only — a batch-tracked component consumed by a manufacturing order won't be subtracted, since Manufacturing doesn't record which batch it drew from."
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Include depleted">
          <USwitch v-model="includeDepleted" />
        </UFormField>
        <UFormField label="Show quantity in">
          <USelect v-model="mode" :items="displayUnitOptions" class="w-36" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" exportable export-filename="inventory-batch-lot-stock">
        <template #empty-state>
          <EmptyState icon="i-lucide-package-2" title="No batches yet" />
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
const includeDepleted = ref(false)
const rows = ref<BatchLotStockRow[]>([])
const products = ref<{ id: number; unitOfMeasureId: number; unitOfMeasureAbbreviation: string | null }[]>([])

const columns = computed<ColumnDef<BatchLotStockRow>[]>(() => [
  { key: 'batchNumber', label: 'Batch / lot' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'expirationDate', label: 'Expiration', value: (row) => row.expirationDate ?? 'None', type: 'date' },
  {
    key: 'currentQuantity',
    label: 'Current qty',
    value: (row) =>
      formatQuantity(
        products.value.find((p) => p.id === row.productId),
        row.currentQuantity
      )
  }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [result, productsRes] = await Promise.all([
      batchLotStock({ companyId: companyId.value, includeDepleted: includeDepleted.value }),
      products.value.length === 0 ? listProducts({ size: 10000 }) : Promise.resolve(null)
    ])
    rows.value = result.rows
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
watch([companyId, includeDepleted], load)
</script>
