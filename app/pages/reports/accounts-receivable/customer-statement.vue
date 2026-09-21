<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Customer statement"
      description="One customer's invoices, payments, and credit notes over a period, with a running balance."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounts receivable reports' }, { label: 'Customer statement' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Customer" required>
          <USelect v-model="customerId" :items="customerOptions" placeholder="Select a customer" class="w-56" />
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
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else>
      <EmptyState v-if="!customerId" icon="i-lucide-book-text" title="Select a customer" description="Choose a customer above to see their statement." />
      <template v-else-if="statement">
        <div class="flex items-center justify-between mb-3 text-sm">
          <span class="text-gray-900 dark:text-white font-medium">{{ statement.customerName }}</span>
          <span class="text-gray-400">Opening: {{ formatCurrency(statement.openingBalance) }}</span>
        </div>
        <DataTable :rows="statement.lines" :columns="columns" exportable export-filename="accounts-receivable-customer-statement">
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
import type { CustomerStatement, CustomerStatementLine } from '~/composables/useArReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { customerStatement: fetchStatement } = useArReports()
const { list: listCustomers } = useCustomers()

const customers = ref<{ id: number; name: string; companyId: number }[]>([])
const customerId = ref<number | undefined>(undefined)
const customerOptions = computed(() =>
  customers.value.filter((c) => companyId.value === undefined || c.companyId === companyId.value).map((c) => ({ label: c.name, value: c.id }))
)

const loading = ref(false)
const error = ref('')
const statement = ref<CustomerStatement | null>(null)

const columns: ColumnDef<CustomerStatementLine>[] = [
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'type', label: 'Type', type: 'status' },
  { key: 'reference', label: 'Reference', value: (row) => row.reference ?? '—' },
  { key: 'debit', label: 'Debit', type: 'currency', value: (row) => (row.debit > 0 ? row.debit : null) },
  { key: 'credit', label: 'Credit', type: 'currency', value: (row) => (row.credit > 0 ? row.credit : null) },
  { key: 'runningBalance', label: 'Balance', type: 'currency' }
]

async function load() {
  if (!customerId.value) {
    statement.value = null
    return
  }
  loading.value = true
  error.value = ''
  try {
    statement.value = await fetchStatement({
      companyId: companyId.value,
      customerId: customerId.value,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined
    })
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureLoaded()
  customers.value = (await listCustomers({ size: 500 })).data
  await load()
})
watch([companyId, customerId, dateFrom, dateTo], load)
</script>
