<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Profit & loss"
      description="Revenue, expenses, and net income for a period."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounting reports' }, { label: 'Profit & loss' }]"
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
      <p class="text-xs text-gray-400 mt-3">
        Reflects only what's been manually posted in
        <NuxtLink to="/journal-entries" class="underline">Journal Entries</NuxtLink> — nothing else in the system posts to the general ledger automatically yet.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="profitAndLoss">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatTile label="Revenue" :value="formatCurrency(profitAndLoss.revenueTotal)" icon="i-lucide-trending-up" color="success" />
        <StatTile label="Expenses" :value="formatCurrency(profitAndLoss.expenseTotal)" icon="i-lucide-trending-down" color="error" />
        <StatTile
          label="Net income"
          :value="formatCurrency(profitAndLoss.netIncome)"
          icon="i-lucide-circle-dollar-sign"
          :color="profitAndLoss.netIncome >= 0 ? 'success' : 'error'"
        />
      </div>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UCard>
          <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Revenue</h2></template>
          <DataTable :rows="profitAndLoss.revenue" :columns="revenueColumns" exportable export-filename="accounting-profit-and-loss-revenue">
            <template #empty-state>
              <EmptyState icon="i-lucide-check-circle" title="No revenue posted in this period" />
            </template>
          </DataTable>
        </UCard>
        <UCard>
          <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Expenses</h2></template>
          <DataTable :rows="profitAndLoss.expenses" :columns="expenseColumns" exportable export-filename="accounting-profit-and-loss-expenses">
            <template #empty-state>
              <EmptyState icon="i-lucide-check-circle" title="No expenses posted in this period" />
            </template>
          </DataTable>
        </UCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { FinancialStatementLine, ProfitAndLoss } from '~/composables/useFinancialReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { profitAndLoss: fetchProfitAndLoss } = useFinancialReports()

const loading = ref(false)
const error = ref('')
const profitAndLoss = ref<ProfitAndLoss | null>(null)

function statementColumns(totalLabel: string, total: () => number | undefined): ColumnDef<FinancialStatementLine>[] {
  return [
    { key: 'accountName', label: 'Account', footer: () => totalLabel },
    { key: 'amount', label: 'Amount', type: 'currency', footer: total }
  ]
}
const revenueColumns = computed(() => statementColumns('Total revenue', () => profitAndLoss.value?.revenueTotal))
const expenseColumns = computed(() => statementColumns('Total expenses', () => profitAndLoss.value?.expenseTotal))

async function load() {
  loading.value = true
  error.value = ''
  try {
    profitAndLoss.value = await fetchProfitAndLoss({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
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
