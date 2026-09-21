<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Stock transfer"
      description="Every stock transfer between warehouses and its status."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Inventory reports' }, { label: 'Stock transfer' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <DataTable :rows="rows" :columns="columns" exportable export-filename="inventory-stock-transfer">
        <template #empty-state>
          <EmptyState icon="i-lucide-repeat" title="No stock transfers yet" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StockTransfer } from '~/composables/useStockTransfers'

definePageMeta({ middleware: 'admin' })

const { companyId, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { list } = useStockTransfers()

const loading = ref(false)
const error = ref('')
const rows = ref<StockTransfer[]>([])

const columns: ColumnDef<StockTransfer>[] = [
  { key: 'transferNumber', label: 'Transfer #' },
  { key: 'sourceWarehouseName', label: 'From', value: (row) => row.sourceWarehouseName ?? '—' },
  { key: 'destinationWarehouseName', label: 'To', value: (row) => row.destinationWarehouseName ?? '—' },
  { key: 'requestDate', label: 'Requested', type: 'date' },
  { key: 'shipDate', label: 'Shipped', value: (row) => row.shipDate ?? '—', type: 'date' },
  { key: 'receiveDate', label: 'Received', value: (row) => row.receiveDate ?? '—', type: 'date' },
  { key: 'status', label: 'Status', type: 'badge' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    rows.value = (await list({ companyId: companyId.value, size: 1000 })).data
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
