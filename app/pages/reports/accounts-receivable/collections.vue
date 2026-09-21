<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Collections"
      description="Payments received from customers during a period."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounts receivable reports' }, { label: 'Collections' }]"
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

    <template v-else-if="collections">
      <div class="mb-4">
        <StatTile label="Total collected" :value="formatCurrency(collections.totalCollected)" icon="i-lucide-hand-coins" color="success" />
      </div>
      <UCard>
        <DataTable :rows="collections.rows" :columns="columns" exportable export-filename="accounts-receivable-collections">
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
import type { ArCollection, ArCollectionRow } from '~/composables/useArReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { collections: fetchCollections } = useArReports()

const loading = ref(false)
const error = ref('')
const collections = ref<ArCollection | null>(null)

const columns: ColumnDef<ArCollectionRow>[] = [
  { key: 'paymentNumber', label: 'Payment', value: (row) => row.paymentNumber ?? '—' },
  { key: 'paymentDate', label: 'Date', type: 'date' },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'method', label: 'Method', type: 'status' },
  { key: 'amount', label: 'Amount', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    collections.value = await fetchCollections({
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
