<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Trial balance"
      description="Debit and credit balances for every account, as of a date."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounting reports' }, { label: 'Trial balance' }]"
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
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Reflects only what's been manually posted in
        <NuxtLink to="/journal-entries" class="underline">Journal Entries</NuxtLink> — nothing else in the system posts to the general ledger automatically yet.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="trialBalance">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatTile label="Total debits" :value="formatCurrency(trialBalance.debitTotal)" icon="i-lucide-arrow-down-to-line" color="info" />
        <StatTile label="Total credits" :value="formatCurrency(trialBalance.creditTotal)" icon="i-lucide-arrow-up-from-line" color="info" />
        <StatTile
          label="Balanced"
          :value="trialBalance.debitTotal === trialBalance.creditTotal ? 'Yes' : 'No'"
          icon="i-lucide-scale"
          :color="trialBalance.debitTotal === trialBalance.creditTotal ? 'success' : 'error'"
        />
      </div>
      <UCard>
        <DataTable :rows="trialBalance.rows" :columns="columns" exportable export-filename="accounting-trial-balance">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="Nothing posted yet" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { TrialBalance, TrialBalanceRow } from '~/composables/useFinancialReports'

definePageMeta({ middleware: 'admin' })

const { companyId, asOfDate, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { trialBalance: fetchTrialBalance } = useFinancialReports()

const loading = ref(false)
const error = ref('')
const trialBalance = ref<TrialBalance | null>(null)

const columns = computed<ColumnDef<TrialBalanceRow>[]>(() => [
  { key: 'accountCode', label: 'Code', class: 'font-mono text-gray-400' },
  { key: 'accountName', label: 'Account', footer: () => 'Total' },
  { key: 'accountType', label: 'Type', type: 'status' },
  {
    key: 'debitBalance',
    label: 'Debit',
    type: 'currency',
    value: (row) => (row.debitBalance > 0 ? row.debitBalance : null),
    footer: () => trialBalance.value?.debitTotal
  },
  {
    key: 'creditBalance',
    label: 'Credit',
    type: 'currency',
    value: (row) => (row.creditBalance > 0 ? row.creditBalance : null),
    footer: () => trialBalance.value?.creditTotal
  }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    trialBalance.value = await fetchTrialBalance({ companyId: companyId.value, asOfDate: asOfDate.value })
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
