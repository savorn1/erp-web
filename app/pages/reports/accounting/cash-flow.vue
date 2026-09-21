<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Cash flow"
      description="Opening/closing balance and net change per bank account."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounting reports' }, { label: 'Cash flow' }]"
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

    <UCard v-else-if="cashFlow">
      <DataTable :rows="cashFlow.accounts" :columns="columns" exportable export-filename="accounting-cash-flow">
        <template #empty-state>
          <EmptyState icon="i-lucide-landmark" title="No bank or cash accounts yet" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { CashFlow, CashFlowAccountRow } from '~/composables/useFinancialReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { cashFlow: fetchCashFlow } = useFinancialReports()

const loading = ref(false)
const error = ref('')
const cashFlow = ref<CashFlow | null>(null)

const columns = computed<ColumnDef<CashFlowAccountRow>[]>(() => [
  { key: 'bankAccountName', label: 'Account', footer: () => 'Total' },
  { key: 'openingBalance', label: 'Opening', type: 'currency', footer: () => cashFlow.value?.totalOpeningBalance },
  {
    key: 'inflow',
    label: 'Inflow',
    type: 'currency',
    prefix: () => '+',
    class: 'text-success-700 dark:text-success-400',
    footer: () => cashFlow.value?.totalInflow
  },
  {
    key: 'outflow',
    label: 'Outflow',
    type: 'currency',
    prefix: () => '-',
    class: 'text-error-600 dark:text-error-400',
    footer: () => cashFlow.value?.totalOutflow
  },
  {
    key: 'netChange',
    label: 'Net change',
    type: 'currency',
    class: (row) => (row.netChange >= 0 ? 'text-success-700 dark:text-success-400' : 'text-error-600 dark:text-error-400'),
    footer: () => cashFlow.value?.totalNetChange
  },
  { key: 'closingBalance', label: 'Closing', type: 'currency', footer: () => cashFlow.value?.totalClosingBalance }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    cashFlow.value = await fetchCashFlow({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
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
