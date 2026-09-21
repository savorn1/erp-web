<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Outstanding invoices"
      description="Approved invoices with a balance still owed, by days overdue."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Sales reports' }, { label: 'Outstanding invoices' }]"
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
      <p class="text-xs text-gray-400 mt-3">Filters by invoice date — the invoice may still be outstanding regardless of when it was raised.</p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="outstandingInvoices">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Outstanding invoices" :value="String(outstandingInvoices.invoiceCount)" icon="i-lucide-receipt" color="error" />
        <StatTile label="Total outstanding" :value="formatCurrency(outstandingInvoices.totalOutstanding)" icon="i-lucide-circle-dollar-sign" color="error" />
      </div>
      <UCard>
        <DataTable :rows="outstandingInvoices.rows" :columns="columns" exportable export-filename="sales-outstanding-invoices">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="Nothing outstanding" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { SalesOutstandingInvoiceRow, SalesOutstandingInvoices } from '~/composables/useSalesReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { outstandingInvoices: fetchOutstandingInvoices } = useSalesReports()

const loading = ref(false)
const error = ref('')
const outstandingInvoices = ref<SalesOutstandingInvoices | null>(null)

const columns: ColumnDef<SalesOutstandingInvoiceRow>[] = [
  { key: 'invoiceNumber', label: 'Invoice', value: (row) => row.invoiceNumber ?? '—' },
  { key: 'invoiceDate', label: 'Invoice date', type: 'date' },
  { key: 'dueDate', label: 'Due date', type: 'date' },
  { key: 'daysOverdue', label: 'Days overdue', class: (row) => (row.daysOverdue > 0 ? 'text-error' : 'text-gray-400') },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'outstandingAmount', label: 'Outstanding', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    outstandingInvoices.value = await fetchOutstandingInvoices({
      companyId: companyId.value,
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
  await load()
})
watch([companyId, dateFrom, dateTo], load)
</script>
