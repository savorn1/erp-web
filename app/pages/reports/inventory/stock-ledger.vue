<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock ledger"
      description="Chronological stock movements for a product, with a running balance."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock ledger' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Warehouse">
          <USelect v-model="warehouseId" :items="warehouseFilterOptions" placeholder="All warehouses" class="w-48" />
        </UFormField>
        <UFormField label="Product">
          <USelect v-model="productId" :items="productOptions" placeholder="Select a product" class="w-56" />
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

    <template v-else-if="ledger">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Opening balance" :value="String(ledger.openingBalance)" icon="i-lucide-log-in" color="neutral" />
        <StatTile label="Closing balance" :value="String(ledger.closingBalance)" icon="i-lucide-log-out" color="info" />
      </div>
      <UCard>
        <DataTable :rows="ledger.rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-history" title="No movements in this range" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StockLedger, StockLedgerRow } from '~/composables/useInventoryReports'
import type { Product } from '~/composables/useProducts'

definePageMeta({ middleware: 'admin' })

const { companyId, warehouseId, dateFrom, dateTo, activeCompanyOptions, warehouseFilterOptions, ensureLoaded } = useReportFilters()
const { stockLedger } = useInventoryReports()
const { list: listProducts } = useProducts()
const { mode, displayUnitOptions, ensurePackUnits, displayQuantity } = useDisplayUnit()

const loading = ref(false)
const error = ref('')
const ledger = ref<StockLedger | null>(null)
const products = ref<Product[]>([])
const productId = ref<number | undefined>(undefined)

const productOptions = computed(() => [
  { label: 'Select a product', value: undefined },
  ...products.value.filter((p) => companyId.value === undefined || p.companyId === companyId.value).map((p) => ({ label: `${p.sku} — ${p.name}`, value: p.id }))
])

const columns = computed<ColumnDef<StockLedgerRow>[]>(() => [
  { key: 'date', label: 'Date', type: 'datetime' },
  { key: 'type', label: 'Type', type: 'badge' },
  { key: 'referenceType', label: 'Reference', value: (row) => `${row.referenceType ?? '—'} #${row.referenceId ?? '—'}` },
  {
    key: 'quantityDelta',
    label: 'Change',
    value: (row) => {
      const { quantity, unit } = displayQuantity(products.value.find((p) => p.id === row.productId), row.quantityDelta)
      const signed = quantity >= 0 ? `+${quantity}` : String(quantity)
      return unit ? `${signed} ${unit}` : signed
    },
    class: (row) => (row.quantityDelta < 0 ? 'text-error' : 'text-success')
  },
  {
    key: 'balance',
    label: 'Balance',
    value: (row) => {
      const { quantity, unit } = displayQuantity(products.value.find((p) => p.id === row.productId), row.balance)
      return unit ? `${quantity} ${unit}` : quantity
    }
  }
])

async function load() {
  if (!productId.value) {
    ledger.value = null
    return
  }
  loading.value = true
  error.value = ''
  try {
    ledger.value = await stockLedger({
      companyId: companyId.value,
      warehouseId: warehouseId.value,
      productId: productId.value,
      dateFrom: dateFrom.value,
      dateTo: dateTo.value
    })
    await ensurePackUnits([productId.value])
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
watch([companyId, warehouseId, productId, dateFrom, dateTo], load)
</script>
