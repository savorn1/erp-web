<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Collection by salesperson"
      description="Amounts collected in a period, attributed to whoever created the underlying sales order."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Payment reports' }, { label: 'Collection by salesperson' }]"
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
        Follows each payment's invoice allocations back to the sales order's creator — the same attribution as the "Sales by salesperson" report. Payment
        amounts not yet applied to any invoice show under "Unallocated".
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="report">
      <StatTile label="Total collected" :value="formatCurrency(report.totalAllocated)" icon="i-lucide-hand-coins" color="success" class="mb-4" />
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No customer payments in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { CollectionBySalesperson, CollectionBySalespersonRow } from '~/composables/usePaymentReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { collectionBySalesperson: fetchCollectionBySalesperson } = usePaymentReports()

const loading = ref(false)
const error = ref('')
const report = ref<CollectionBySalesperson | null>(null)

const columns: ColumnDef<CollectionBySalespersonRow>[] = [
  { key: 'salesperson', label: 'Salesperson' },
  { key: 'invoiceCount', label: 'Invoices' },
  { key: 'allocatedAmount', label: 'Collected', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchCollectionBySalesperson({
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
