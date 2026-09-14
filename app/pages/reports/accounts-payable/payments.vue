<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Payments made"
      description="Payments made to suppliers during a period."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounts payable reports' }, { label: 'Payments made' }]"
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
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="payments">
      <div class="mb-4">
        <StatTile label="Total paid" :value="formatCurrency(payments.totalPaid)" icon="i-lucide-banknote" color="warning" />
      </div>
      <UCard>
        <DataTable :rows="payments.rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No payments in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { ApPayment, ApPaymentRow } from '~/composables/useApReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { payments: fetchPayments } = useApReports()

const loading = ref(false)
const error = ref('')
const payments = ref<ApPayment | null>(null)

const columns: ColumnDef<ApPaymentRow>[] = [
  { key: 'paymentNumber', label: 'Payment', value: (row) => row.paymentNumber ?? '—' },
  { key: 'paymentDate', label: 'Date', type: 'date' },
  { key: 'supplierName', label: 'Supplier', value: (row) => row.supplierName ?? '—' },
  { key: 'method', label: 'Method', type: 'status' },
  { key: 'amount', label: 'Amount', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    payments.value = await fetchPayments({
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
