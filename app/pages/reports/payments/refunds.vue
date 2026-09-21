<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Refunds"
      description="Refunds issued to customers and received back from suppliers, with the original payment each reverses."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Payment reports' }, { label: 'Refunds' }]"
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
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Refunds are REFUND-type payment rows — cash going back. Credit notes (document-level credits against an invoice) are a separate mechanism, see the AR/AP
        credit/debit note reports.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="report">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Refunded to customers" :value="formatCurrency(report.totalCustomerRefunds)" icon="i-lucide-undo-2" color="warning" />
        <StatTile label="Refunded by suppliers" :value="formatCurrency(report.totalSupplierRefunds)" icon="i-lucide-undo-2" color="info" />
      </div>
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" exportable export-filename="payments-refunds">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No refunds in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { RefundReport, RefundRow } from '~/composables/usePaymentReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { refunds: fetchRefunds } = usePaymentReports()

const loading = ref(false)
const error = ref('')
const report = ref<RefundReport | null>(null)

const columns: ColumnDef<RefundRow>[] = [
  { key: 'refundDate', label: 'Date', type: 'date' },
  { key: 'party', label: 'Party', type: 'status' },
  { key: 'refundNumber', label: 'Refund', value: (row) => row.refundNumber ?? '—' },
  { key: 'partyName', label: 'Name', value: (row) => row.partyName ?? '—' },
  { key: 'method', label: 'Method', type: 'status' },
  { key: 'amount', label: 'Amount', type: 'currency' },
  { key: 'originalPaymentNumber', label: 'Reverses', value: (row) => row.originalPaymentNumber ?? '—' },
  { key: 'notes', label: 'Notes', value: (row) => row.notes ?? '—' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchRefunds({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
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
