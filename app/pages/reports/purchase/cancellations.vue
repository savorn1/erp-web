<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Cancellations"
      description="Cancelled orders and the spend they would have represented."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Purchase reports' }, { label: 'Cancellations' }]"
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

    <template v-else-if="cancellations">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Cancelled orders" :value="String(cancellations.orderCount)" icon="i-lucide-ban" color="error" />
        <StatTile label="Spend avoided" :value="formatCurrency(cancellations.totalAmount)" icon="i-lucide-circle-dollar-sign" color="error" />
      </div>
      <UCard>
        <DataTable :rows="cancellations.rows" :columns="columns" exportable export-filename="purchase-cancellations">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No cancellations in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PurchaseCancellation, PurchaseCancellationRow } from '~/composables/usePurchaseReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { cancellations: fetchCancellations } = usePurchaseReports()

const loading = ref(false)
const error = ref('')
const cancellations = ref<PurchaseCancellation | null>(null)

const columns: ColumnDef<PurchaseCancellationRow>[] = [
  { key: 'poNumber', label: 'Order', value: (row) => row.poNumber ?? '—' },
  { key: 'orderDate', label: 'Date', type: 'date' },
  { key: 'supplierName', label: 'Supplier', value: (row) => row.supplierName ?? '—' },
  { key: 'amount', label: 'Amount', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    cancellations.value = await fetchCancellations({
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
