<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Summary"
      description="Order count and total amount, broken down by status."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Purchase reports' }, { label: 'Summary' }]"
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
        <UFormField label="Status">
          <USelect v-model="purchaseStatus" :items="purchaseStatusOptions" placeholder="All except cancelled" class="w-44" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="purchaseSummary">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatTile label="Orders" :value="String(purchaseSummary.orderCount)" icon="i-lucide-file-text" color="primary" />
        <StatTile label="Total amount" :value="formatCurrency(purchaseSummary.totalAmount)" icon="i-lucide-circle-dollar-sign" color="error" />
        <StatTile label="Average order value" :value="formatCurrency(purchaseSummary.averageOrderValue)" icon="i-lucide-bar-chart-3" color="neutral" />
      </div>
      <UCard>
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">By status</h2></template>
        <DataTable :rows="purchaseSummary.byStatus" :columns="purchaseByStatusColumns" exportable export-filename="purchase-summary">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No orders in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PurchaseStatusBreakdown, PurchaseSummary } from '~/composables/usePurchaseReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, purchaseStatus, activeCompanyOptions, purchaseStatusOptions, ensureLoaded } = useReportFilters()
const { summary: fetchPurchaseSummary } = usePurchaseReports()

const loading = ref(false)
const error = ref('')
const purchaseSummary = ref<PurchaseSummary | null>(null)

const purchaseByStatusColumns: ColumnDef<PurchaseStatusBreakdown>[] = [
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'orderCount', label: 'Orders' },
  { key: 'totalAmount', label: 'Amount', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    purchaseSummary.value = await fetchPurchaseSummary({
      companyId: companyId.value,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined,
      status: purchaseStatus.value
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
watch([companyId, dateFrom, dateTo, purchaseStatus], load)
</script>
