<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Customer balance"
      description="Outstanding balance per customer, as of a date."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounts receivable reports' }, { label: 'Customer balance' }]"
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
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else-if="balance">
      <DataTable :rows="balance.rows" :columns="columns" exportable export-filename="accounts-receivable-customer-balance">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="Nothing outstanding" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { CustomerBalance, CustomerBalanceRow } from '~/composables/useArReports'

definePageMeta({ middleware: 'admin' })

const { companyId, asOfDate, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { customerBalance: fetchBalance } = useArReports()

const loading = ref(false)
const error = ref('')
const balance = ref<CustomerBalance | null>(null)

const columns = computed<ColumnDef<CustomerBalanceRow>[]>(() => [
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—', footer: () => 'Total' },
  { key: 'invoiceCount', label: 'Invoices' },
  { key: 'oldestDueDate', label: 'Oldest due date', type: 'date' },
  { key: 'outstandingAmount', label: 'Outstanding', type: 'currency', footer: () => balance.value?.totalOutstanding }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    balance.value = await fetchBalance({ companyId: companyId.value, asOfDate: asOfDate.value })
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
