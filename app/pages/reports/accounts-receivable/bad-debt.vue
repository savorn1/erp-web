<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Bad debt"
      description="Outstanding invoices overdue beyond a threshold — worth reviewing for write-off."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounts receivable reports' }, { label: 'Bad debt' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="As of date">
          <UInput v-model="asOfDate" type="date" class="w-44" />
        </UFormField>
        <UFormField label="Overdue beyond (days)">
          <UInput v-model.number="thresholdDays" type="number" min="1" class="w-32" />
        </UFormField>
      </div>
      <p class="text-xs text-gray-400 mt-3">
        There's no write-off status in the system — this just flags invoices old enough to warrant a closer look, using the AR aging logic.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="badDebt">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Invoices" :value="String(badDebt.invoiceCount)" icon="i-lucide-receipt" color="error" />
        <StatTile label="Total at risk" :value="formatCurrency(badDebt.totalAmount)" icon="i-lucide-circle-dollar-sign" color="error" />
      </div>
      <UCard>
        <DataTable :rows="badDebt.rows" :columns="columns" exportable export-filename="accounts-receivable-bad-debt">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="Nothing this old" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { ArBadDebt, ArBadDebtRow } from '~/composables/useArReports'

definePageMeta({ middleware: 'admin' })

const { companyId, asOfDate, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { badDebt: fetchBadDebt } = useArReports()

const thresholdDays = ref(90)
const loading = ref(false)
const error = ref('')
const badDebt = ref<ArBadDebt | null>(null)

const columns: ColumnDef<ArBadDebtRow>[] = [
  { key: 'invoiceNumber', label: 'Invoice', value: (row) => row.invoiceNumber ?? '—' },
  { key: 'invoiceDate', label: 'Invoice date', type: 'date' },
  { key: 'dueDate', label: 'Due date', type: 'date' },
  { key: 'daysOverdue', label: 'Days overdue', class: 'text-error' },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'outstandingAmount', label: 'Outstanding', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    badDebt.value = await fetchBadDebt({ companyId: companyId.value, asOfDate: asOfDate.value, thresholdDays: thresholdDays.value })
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
watch([companyId, asOfDate, thresholdDays], load)
</script>
