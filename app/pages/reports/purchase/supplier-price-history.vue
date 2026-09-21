<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Supplier price history"
      description="Every price paid to one supplier over time, across every product."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Purchase reports' }, { label: 'Supplier price history' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Supplier" required>
          <USelect v-model="supplierId" :items="supplierOptions" placeholder="Select a supplier" class="w-56" />
        </UFormField>
        <UFormField label="From">
          <UInput v-model="dateFrom" type="date" class="w-40" />
        </UFormField>
        <UFormField label="To">
          <UInput v-model="dateTo" type="date" class="w-40" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <EmptyState
        v-if="!supplierId"
        icon="i-lucide-history"
        title="Select a supplier"
        description="Choose a supplier above to see what's been paid to them over time."
      />
      <DataTable v-else-if="history" :rows="history.rows" :columns="columns" exportable export-filename="purchase-supplier-price-history">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="No purchases in this period" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { SupplierPriceHistory, SupplierPriceHistoryRow } from '~/composables/usePurchaseReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { supplierPriceHistory: fetchHistory } = usePurchaseReports()
const { list: listSuppliers } = useSuppliers()

const suppliers = ref<{ id: number; name: string; companyId: number }[]>([])
const supplierId = ref<number | undefined>(undefined)
const supplierOptions = computed(() =>
  suppliers.value.filter((s) => companyId.value === undefined || s.companyId === companyId.value).map((s) => ({ label: s.name, value: s.id }))
)

const loading = ref(false)
const error = ref('')
const history = ref<SupplierPriceHistory | null>(null)

const columns: ColumnDef<SupplierPriceHistoryRow>[] = [
  { key: 'orderDate', label: 'Date', type: 'date' },
  { key: 'poNumber', label: 'Order', value: (row) => row.poNumber ?? '—' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unitCost', label: 'Unit cost', type: 'currency' }
]

async function load() {
  if (!supplierId.value) {
    history.value = null
    return
  }
  loading.value = true
  error.value = ''
  try {
    history.value = await fetchHistory({
      companyId: companyId.value,
      supplierId: supplierId.value,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined
    })
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureLoaded()
  suppliers.value = (await listSuppliers({ size: 500 })).data
  await load()
})
watch([companyId, supplierId, dateFrom, dateTo], load)
</script>
