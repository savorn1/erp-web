<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Payments by method"
      description="Count and net amount per payment method, split by customer and supplier ledgers."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Payment reports' }, { label: 'By method' }]"
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
      <p class="text-xs text-gray-400 mt-3">Amounts are net of refunds.</p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="report">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Net received from customers" :value="formatCurrency(report.totalCustomerNet)" icon="i-lucide-hand-coins" color="success" />
        <StatTile label="Net paid to suppliers" :value="formatCurrency(report.totalSupplierNet)" icon="i-lucide-banknote" color="info" />
      </div>
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" exportable export-filename="payments-by-method">
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
import type { PaymentByMethod, PaymentByMethodRow } from '~/composables/usePaymentReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { byMethod: fetchByMethod } = usePaymentReports()

const loading = ref(false)
const error = ref('')
const report = ref<PaymentByMethod | null>(null)

const columns: ColumnDef<PaymentByMethodRow>[] = [
  { key: 'method', label: 'Method', type: 'status' },
  { key: 'customerCount', label: 'Customer payments' },
  { key: 'customerNet', label: 'Customer net', type: 'currency' },
  { key: 'supplierCount', label: 'Supplier payments' },
  { key: 'supplierNet', label: 'Supplier net', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchByMethod({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
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
