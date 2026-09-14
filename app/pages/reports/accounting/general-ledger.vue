<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="General ledger"
      description="Every posted line for one account, with a running balance."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounting reports' }, { label: 'General ledger' }]"
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
        <UFormField label="Account" required>
          <USelect v-model="accountId" :items="accountOptions" placeholder="Select an account" class="w-56" />
        </UFormField>
      </div>
      <p class="text-xs text-gray-400 mt-3">
        Reflects only what's been manually posted in
        <NuxtLink to="/journal-entries" class="underline">Journal Entries</NuxtLink> — nothing else in the system posts to the general ledger automatically yet.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <EmptyState v-if="!accountId" icon="i-lucide-book-text" title="Select an account" description="Choose an account above to see its ledger." />
      <template v-else-if="generalLedger">
        <div class="flex items-center justify-between mb-3 text-sm">
          <span class="text-gray-900 dark:text-white font-medium">{{ generalLedger.accountCode }} — {{ generalLedger.accountName }}</span>
          <span class="text-gray-400">Opening: {{ formatCurrency(generalLedger.openingBalance) }}</span>
        </div>
        <DataTable :rows="generalLedger.lines" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No activity in this period" />
          </template>
        </DataTable>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { GeneralLedger, GeneralLedgerLine } from '~/composables/useFinancialReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, accountId, activeCompanyOptions, accountOptions, ensureLoaded } = useReportFilters()
const { generalLedger: fetchGeneralLedger } = useFinancialReports()

const loading = ref(false)
const error = ref('')
const generalLedger = ref<GeneralLedger | null>(null)

const columns = computed<ColumnDef<GeneralLedgerLine>[]>(() => [
  { key: 'entryDate', label: 'Date', type: 'date' },
  { key: 'journalNumber', label: 'Journal' },
  { key: 'description', label: 'Description', value: (row) => row.description ?? '—', footer: () => 'Closing balance' },
  { key: 'debit', label: 'Debit', type: 'currency', value: (row) => (row.debit > 0 ? row.debit : null) },
  { key: 'credit', label: 'Credit', type: 'currency', value: (row) => (row.credit > 0 ? row.credit : null) },
  { key: 'runningBalance', label: 'Balance', type: 'currency', footer: () => generalLedger.value?.closingBalance }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    generalLedger.value = accountId.value
      ? await fetchGeneralLedger({ accountId: accountId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
      : null
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
watch([companyId, dateFrom, dateTo, accountId], load)
</script>
