<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Balance sheet"
      description="Assets, liabilities, and equity as of a date."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounting reports' }, { label: 'Balance sheet' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="As of date">
          <UInput v-model="asOfDate" type="date" class="w-44" />
        </UFormField>
      </div>
      <p class="text-xs text-gray-400 mt-3">
        Reflects only what's been manually posted in
        <NuxtLink to="/journal-entries" class="underline">Journal Entries</NuxtLink> — nothing else in the system posts to the general ledger automatically yet.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="balanceSheet">
      <UAlert
        v-if="!balanceSheet.balanced"
        color="error"
        variant="subtle"
        class="mb-4"
        title="Out of balance"
        description="Assets don't equal liabilities + equity — this shouldn't happen for posted double-entry data."
      />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <UCard>
          <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Assets</h2></template>
          <DataTable :rows="balanceSheet.assets" :columns="assetsColumns" :exportable="false">
            <template #empty-state>
              <EmptyState icon="i-lucide-check-circle" title="Nothing posted yet" />
            </template>
          </DataTable>
        </UCard>
        <div class="space-y-4">
          <UCard>
            <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Liabilities</h2></template>
            <DataTable :rows="balanceSheet.liabilities" :columns="liabilitiesColumns" :exportable="false">
              <template #empty-state>
                <EmptyState icon="i-lucide-check-circle" title="Nothing posted yet" />
              </template>
            </DataTable>
          </UCard>
          <UCard>
            <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Equity</h2></template>
            <DataTable :rows="balanceSheet.equity" :columns="equityColumns" :exportable="false" />
          </UCard>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { BalanceSheet, FinancialStatementLine } from '~/composables/useFinancialReports'

definePageMeta({ middleware: 'admin' })

const { companyId, asOfDate, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { balanceSheet: fetchBalanceSheet } = useFinancialReports()

const loading = ref(false)
const error = ref('')
const balanceSheet = ref<BalanceSheet | null>(null)

// Assets/Liabilities/Equity are all the same "account name + amount, with a
// labeled total" shape.
function statementColumns(totalLabel: string, total: () => number | undefined): ColumnDef<FinancialStatementLine>[] {
  return [
    { key: 'accountName', label: 'Account', footer: () => totalLabel },
    { key: 'amount', label: 'Amount', type: 'currency', footer: total }
  ]
}
const assetsColumns = computed(() => statementColumns('Total assets', () => balanceSheet.value?.assetsTotal))
const liabilitiesColumns = computed(() => statementColumns('Total liabilities', () => balanceSheet.value?.liabilitiesTotal))
const equityColumns = computed(() => statementColumns('Total equity', () => balanceSheet.value?.equityTotal))

async function load() {
  loading.value = true
  error.value = ''
  try {
    balanceSheet.value = await fetchBalanceSheet({ companyId: companyId.value, asOfDate: asOfDate.value })
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
watch([companyId, asOfDate], load)
</script>
