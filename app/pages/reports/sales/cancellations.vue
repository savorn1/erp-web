<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Cancellations"
      description="Cancelled orders and the revenue they would have represented."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Sales reports' }, { label: 'Cancellations' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
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
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="cancellations">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Cancelled orders" :value="String(cancellations.orderCount)" icon="i-lucide-ban" color="error" />
        <StatTile label="Revenue lost" :value="formatCurrency(cancellations.totalAmount)" icon="i-lucide-circle-dollar-sign" color="error" />
      </div>
      <UCard>
        <DataTable :rows="cancellations.rows" :columns="columns" exportable export-filename="sales-cancellations">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No cancellations in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { SalesCancellation, SalesCancellationRow } from '~/composables/useSalesReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { cancellations: fetchCancellations } = useSalesReports()

const loading = ref(false)
const error = ref('')
const cancellations = ref<SalesCancellation | null>(null)

const columns: ColumnDef<SalesCancellationRow>[] = [
  { key: 'soNumber', label: 'Order', value: (row) => row.soNumber ?? '—' },
  { key: 'orderDate', label: 'Date', type: 'date' },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'amount', label: 'Amount', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    cancellations.value = await fetchCancellations({
      companyId: companyId.value,
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
  await load()
})
watch([companyId, dateFrom, dateTo], load)
</script>
