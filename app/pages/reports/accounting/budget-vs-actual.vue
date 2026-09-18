<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Budget vs actual"
      description="Planned budget compared against posted GL activity for a period."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounting reports' }, { label: 'Budget vs actual' }]"
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
        <UFormField label="Cost center">
          <USelect v-model="costCenterId" :items="costCenterOptions" placeholder="All cost centers" class="w-48" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="report">
      <UCard v-if="revenueRows.length > 0" class="mb-4">
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Revenue</h2></template>
        <DataTable :rows="revenueRows" :columns="columns" :exportable="false">
          <template #varianceAmount-data="{ row }">
            <span :class="row.varianceAmount >= 0 ? 'text-success' : 'text-error'">{{ formatCurrency(row.varianceAmount) }}</span>
          </template>
        </DataTable>
      </UCard>
      <UCard v-if="expenseRows.length > 0" class="mb-4">
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Expenses</h2></template>
        <DataTable :rows="expenseRows" :columns="columns" :exportable="false">
          <template #varianceAmount-data="{ row }">
            <span :class="row.varianceAmount <= 0 ? 'text-success' : 'text-error'">{{ formatCurrency(row.varianceAmount) }}</span>
          </template>
        </DataTable>
      </UCard>
      <UCard v-if="otherRows.length > 0" class="mb-4">
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Other accounts</h2></template>
        <DataTable :rows="otherRows" :columns="columns" :exportable="false" />
      </UCard>
      <EmptyState
        v-if="report.rows.length === 0"
        icon="i-lucide-calculator"
        title="No budget or actual activity"
        description="Enter a budget or post journal entries for this period."
      />
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { BudgetVsActual, BudgetVsActualRow } from '~/composables/useFinancialReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { budgetVsActual: fetchBudgetVsActual } = useFinancialReports()
const { list: listCostCenters } = useCostCenters()

const loading = ref(false)
const error = ref('')
const report = ref<BudgetVsActual | null>(null)
const costCenterId = ref<number | undefined>(undefined)
const costCenters = ref<{ id: number; name: string; companyId: number; active: boolean }[]>([])

const costCenterOptions = computed(() => [
  { label: 'All cost centers', value: undefined },
  ...costCenters.value
    .filter((cc) => cc.active && (companyId.value === undefined || cc.companyId === companyId.value))
    .map((cc) => ({ label: cc.name, value: cc.id }))
])

const columns: ColumnDef<BudgetVsActualRow>[] = [
  { key: 'accountName', label: 'Account', value: (row) => `${row.accountCode} — ${row.accountName}` },
  { key: 'budgetAmount', label: 'Budget', type: 'currency' },
  { key: 'actualAmount', label: 'Actual', type: 'currency' },
  { key: 'varianceAmount', label: 'Variance', type: 'currency' }
]

const revenueRows = computed(() => report.value?.rows.filter((r) => r.accountType === 'REVENUE') ?? [])
const expenseRows = computed(() => report.value?.rows.filter((r) => r.accountType === 'EXPENSE') ?? [])
const otherRows = computed(() => report.value?.rows.filter((r) => r.accountType !== 'REVENUE' && r.accountType !== 'EXPENSE') ?? [])

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchBudgetVsActual({
      companyId: companyId.value,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
      costCenterId: costCenterId.value
    })
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureLoaded()
  costCenters.value = (await listCostCenters({ size: 200 })).data
  await load()
})
watch([companyId, dateFrom, dateTo, costCenterId], load)
</script>
