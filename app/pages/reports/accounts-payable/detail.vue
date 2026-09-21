<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="AP detail"
      description="Every line of every currently-outstanding purchase invoice."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounts payable reports' }, { label: 'AP detail' }]"
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
      <DataTable :rows="detail.rows" :columns="columns" exportable export-filename="accounts-payable-detail">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="Nothing outstanding" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { ApDetail, ApDetailRow } from '~/composables/useApReports'

definePageMeta({ middleware: 'admin' })

const { companyId, asOfDate, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { detail: fetchDetail } = useApReports()

const loading = ref(false)
const error = ref('')
const detail = ref<ApDetail | null>(null)

const columns: ColumnDef<ApDetailRow>[] = [
  { key: 'invoiceNumber', label: 'Invoice', value: (row) => row.invoiceNumber ?? '—' },
  { key: 'dueDate', label: 'Due date', type: 'date' },
  {
    key: 'daysOverdue',
    label: 'Days overdue',
    class: (row) => (row.daysOverdue > 0 ? 'text-error-600 dark:text-error-400' : 'text-gray-500 dark:text-gray-400')
  },
  { key: 'supplierName', label: 'Supplier', value: (row) => row.supplierName ?? '—' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unitCost', label: 'Unit cost', type: 'currency' },
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
