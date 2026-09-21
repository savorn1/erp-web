<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="AR detail"
      description="Every line of every currently-outstanding invoice."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounts receivable reports' }, { label: 'AR detail' }]"
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
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else-if="detail">
      <DataTable :rows="detail.rows" :columns="columns" exportable export-filename="accounts-receivable-detail">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="Nothing outstanding" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { ArDetail, ArDetailRow } from '~/composables/useArReports'

definePageMeta({ middleware: 'admin' })

const { companyId, asOfDate, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { detail: fetchDetail } = useArReports()

const loading = ref(false)
const error = ref('')
const detail = ref<ArDetail | null>(null)

const columns: ColumnDef<ArDetailRow>[] = [
  { key: 'invoiceNumber', label: 'Invoice', value: (row) => row.invoiceNumber ?? '—' },
  { key: 'dueDate', label: 'Due date', type: 'date' },
  {
    key: 'daysOverdue',
    label: 'Days overdue',
    class: (row) => (row.daysOverdue > 0 ? 'text-error-600 dark:text-error-400' : 'text-gray-500 dark:text-gray-400')
  },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unitPrice', label: 'Unit price', type: 'currency' },
  { key: 'lineTotal', label: 'Line total', type: 'currency' },
  { key: 'invoiceOutstanding', label: 'Invoice outstanding', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    detail.value = await fetchDetail({ companyId: companyId.value, asOfDate: asOfDate.value })
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
