<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Payment reconciliation"
      description="Bank-method payments vs. bank deposits and withdrawals, plus each account's reconciled status."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Payment reports' }, { label: 'Payment reconciliation' }]"
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
        Payments and bank transactions aren't linked row-by-row in this system, so this reconciles at the totals level: bank-method (transfer/gateway) receipts
        against deposits, bank-method supplier payments against withdrawals. A non-zero variance means something was recorded on one side only. Internal
        transfers are excluded from the totals.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="report">
      <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Receipts</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatTile label="Bank-method customer receipts" :value="formatCurrency(report.customerBankReceipts)" icon="i-lucide-hand-coins" color="success" />
        <StatTile label="Bank deposits" :value="formatCurrency(report.totalDeposits)" icon="i-lucide-landmark" color="info" />
        <StatTile
          label="Variance"
          :value="formatCurrency(report.receiptsVariance)"
          icon="i-lucide-git-compare"
          :color="report.receiptsVariance === 0 ? 'success' : 'error'"
        />
      </div>
      <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Payments</h2>
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatTile label="Bank-method supplier payments" :value="formatCurrency(report.supplierBankPayments)" icon="i-lucide-banknote" color="warning" />
        <StatTile label="Bank withdrawals" :value="formatCurrency(report.totalWithdrawals)" icon="i-lucide-landmark" color="info" />
        <StatTile
          label="Variance"
          :value="formatCurrency(report.paymentsVariance)"
          icon="i-lucide-git-compare"
          :color="report.paymentsVariance === 0 ? 'success' : 'error'"
        />
      </div>
      <UCard>
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Per account</h2></template>
        <DataTable :rows="report.rows" :columns="columns" exportable export-filename="payments-reconciliation">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No bank transactions in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PaymentReconciliation, PaymentReconciliationRow } from '~/composables/usePaymentReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { reconciliation: fetchReconciliation } = usePaymentReports()

const loading = ref(false)
const error = ref('')
const report = ref<PaymentReconciliation | null>(null)

const columns: ColumnDef<PaymentReconciliationRow>[] = [
  { key: 'bankAccountName', label: 'Account', value: (row) => row.bankAccountName ?? '—' },
  { key: 'accountType', label: 'Type', type: 'status' },
  { key: 'deposits', label: 'Deposits', type: 'currency' },
  { key: 'withdrawals', label: 'Withdrawals', type: 'currency' },
  { key: 'reconciledCount', label: 'Reconciled' },
  { key: 'reconciledAmount', label: 'Reconciled amount', type: 'currency' },
  {
    key: 'unreconciledCount',
    label: 'Unreconciled',
    class: (row) => (row.unreconciledCount > 0 ? 'text-error-600 dark:text-error-400' : 'text-gray-500 dark:text-gray-400')
  },
  {
    key: 'unreconciledAmount',
    label: 'Unreconciled amount',
    type: 'currency',
    class: (row) => (row.unreconciledAmount > 0 ? 'text-error-600 dark:text-error-400' : '')
  }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchReconciliation({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
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
