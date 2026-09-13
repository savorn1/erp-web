<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Statement of changes in equity"
      description="How equity moved over a period — beginning balance, net income, and other equity changes."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounting reports' }, { label: 'Statement of changes in equity' }]"
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
        "Other equity changes" is a residual (ending equity − beginning equity − net income) — capital contributions, owner draws, or any other posting
        made directly to an equity account during the period, from
        <NuxtLink to="/journal-entries" class="underline">Journal Entries</NuxtLink>.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="statement">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Net income for the period" :value="formatCurrency(statement.netIncome)" icon="i-lucide-trending-up" :color="statement.netIncome >= 0 ? 'success' : 'error'" />
        <StatTile label="Ending equity" :value="formatCurrency(statement.endingEquity)" icon="i-lucide-landmark" color="primary" />
      </div>
      <UCard>
        <DataTable :rows="statement.lines" :columns="columns" :exportable="false" />
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { StatementOfChangesInEquity, StatementOfChangesInEquityLine } from '~/composables/useFinancialReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { statementOfChangesInEquity: fetchStatement } = useFinancialReports()

const loading = ref(false)
const error = ref('')
const statement = ref<StatementOfChangesInEquity | null>(null)

const columns: ColumnDef<StatementOfChangesInEquityLine>[] = [
  { key: 'label', label: '' },
  { key: 'amount', label: 'Amount', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    statement.value = await fetchStatement({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
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
