<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Outstanding orders"
      description="Orders not yet fully delivered, with undelivered quantity and value."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Sales reports' }, { label: 'Outstanding orders' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
      </div>
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-3">A live snapshot of the current backlog — not scoped to a date range.</p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="outstanding">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Outstanding orders" :value="String(outstanding.orderCount)" icon="i-lucide-clock" color="warning" />
        <StatTile label="Outstanding value" :value="formatCurrency(outstanding.totalOutstandingValue)" icon="i-lucide-circle-dollar-sign" color="warning" />
      </div>
      <UCard>
        <DataTable :rows="outstanding.rows" :columns="columns" exportable export-filename="sales-outstanding">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="Nothing outstanding" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { SalesOutstanding, SalesOutstandingRow } from '~/composables/useSalesReports'

definePageMeta({ middleware: 'admin' })

const { companyId, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { outstanding: fetchOutstanding } = useSalesReports()

const loading = ref(false)
const error = ref('')
const outstanding = ref<SalesOutstanding | null>(null)

const columns: ColumnDef<SalesOutstandingRow>[] = [
  { key: 'soNumber', label: 'Order', value: (row) => row.soNumber ?? '—' },
  { key: 'orderDate', label: 'Order date', type: 'date' },
  { key: 'expectedDate', label: 'Expected', type: 'date' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'outstandingQuantity', label: 'Outstanding qty' },
  { key: 'outstandingValue', label: 'Outstanding value', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    outstanding.value = await fetchOutstanding({ companyId: companyId.value })
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
