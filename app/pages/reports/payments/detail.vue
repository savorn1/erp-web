<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Payment detail"
      description="Every customer and supplier payment in one ledger — narrow by party, type, or method."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Payment reports' }, { label: 'Detail' }]"
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
        <UFormField label="Party">
          <USelect v-model="party" :items="partyOptions" class="w-40" />
        </UFormField>
        <UFormField label="Type">
          <USelect v-model="type" :items="typeOptions" class="w-40" />
        </UFormField>
        <UFormField label="Method">
          <USelect v-model="method" :items="methodOptions" class="w-44" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="detail">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Net received from customers" :value="formatCurrency(detail.totalReceived)" icon="i-lucide-hand-coins" color="success" />
        <StatTile label="Net paid to suppliers" :value="formatCurrency(detail.totalPaid)" icon="i-lucide-banknote" color="info" />
      </div>
      <UCard>
        <DataTable :rows="detail.rows" :columns="columns" exportable export-filename="payments-detail">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No payments match" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PaymentDetail, PaymentDetailRow, PaymentReportMethod, PaymentReportParty, PaymentReportType } from '~/composables/usePaymentReports'

definePageMeta({ middleware: 'admin' })

const route = useRoute()
const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { detail: fetchDetail } = usePaymentReports()

const partyOptions = [
  { label: 'Both', value: undefined },
  { label: 'Customer', value: 'CUSTOMER' },
  { label: 'Supplier', value: 'SUPPLIER' }
]
const typeOptions = [
  { label: 'All types', value: undefined },
  { label: 'Payment', value: 'PAYMENT' },
  { label: 'Refund', value: 'REFUND' }
]
const methodOptions = [
  { label: 'All methods', value: undefined },
  { label: 'Cash', value: 'CASH' },
  { label: 'Bank transfer', value: 'BANK_TRANSFER' },
  { label: 'Payment gateway', value: 'PAYMENT_GATEWAY' }
]

// Deep-linkable — the Receipts / Cash payments / Bank payments tiles on
// /reports land here with these pre-set.
function fromQuery<T extends string>(key: string, allowed: readonly T[]): T | undefined {
  const raw = route.query[key]
  return typeof raw === 'string' && (allowed as readonly string[]).includes(raw) ? (raw as T) : undefined
}
const party = ref<PaymentReportParty | undefined>(fromQuery('party', ['CUSTOMER', 'SUPPLIER'] as const))
const type = ref<PaymentReportType | undefined>(fromQuery('type', ['PAYMENT', 'REFUND'] as const))
const method = ref<PaymentReportMethod | undefined>(fromQuery('method', ['CASH', 'BANK_TRANSFER', 'PAYMENT_GATEWAY'] as const))

const loading = ref(false)
const error = ref('')
const detail = ref<PaymentDetail | null>(null)

const columns: ColumnDef<PaymentDetailRow>[] = [
  { key: 'paymentDate', label: 'Date', type: 'date' },
  { key: 'party', label: 'Party', type: 'status' },
  { key: 'paymentNumber', label: 'Number', value: (row) => row.paymentNumber ?? '—' },
  { key: 'partyName', label: 'Name', value: (row) => row.partyName ?? '—' },
  { key: 'type', label: 'Type', type: 'status' },
  { key: 'method', label: 'Method', type: 'status' },
  { key: 'amount', label: 'Amount', type: 'currency', class: (row) => (row.type === 'REFUND' ? 'text-warning-700 dark:text-warning-400' : '') },
  { key: 'reference', label: 'Reference', value: (row) => row.reference ?? '—' },
  { key: 'createdBy', label: 'Recorded by', value: (row) => row.createdBy ?? '—' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    detail.value = await fetchDetail({
      companyId: companyId.value,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
      party: party.value,
      type: type.value,
      method: method.value
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
watch([companyId, dateFrom, dateTo, party, type, method], load)
</script>
