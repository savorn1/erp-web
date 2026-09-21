<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Transfers"
      description="Money moved between bank and cash accounts."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Payment reports' }, { label: 'Transfers' }]"
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

    <template v-else-if="report">
      <StatTile label="Total transferred" :value="formatCurrency(report.totalTransferred)" icon="i-lucide-arrow-left-right" color="info" class="mb-4" />
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" exportable export-filename="payments-transfers">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No transfers in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { TransferReport, TransferRow } from '~/composables/usePaymentReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { transfers: fetchTransfers } = usePaymentReports()

const loading = ref(false)
const error = ref('')
const report = ref<TransferReport | null>(null)

const columns: ColumnDef<TransferRow>[] = [
  { key: 'transactionDate', label: 'Date', type: 'date' },
  { key: 'transactionNumber', label: 'Number', value: (row) => row.transactionNumber ?? '—' },
  { key: 'fromAccountName', label: 'From', value: (row) => row.fromAccountName ?? '—' },
  { key: 'toAccountName', label: 'To', value: (row) => row.toAccountName ?? '—' },
  { key: 'amount', label: 'Amount', type: 'currency' },
  { key: 'reference', label: 'Reference', value: (row) => row.reference ?? '—' },
  { key: 'description', label: 'Description', value: (row) => row.description ?? '—' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchTransfers({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
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
