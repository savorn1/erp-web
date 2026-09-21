<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="By product"
      description="Quantity purchased and spend per product."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Purchase reports' }, { label: 'By product' }]"
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

    <UCard v-else-if="purchaseByProduct">
      <DataTable :rows="purchaseByProduct.rows" :columns="columns" exportable export-filename="purchase-by-product">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="No purchases in this period" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PurchaseByProduct, PurchaseByProductRow } from '~/composables/usePurchaseReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, purchaseStatus, activeCompanyOptions, purchaseStatusOptions, ensureLoaded } = useReportFilters()
const { byProduct: fetchPurchaseByProduct } = usePurchaseReports()

const loading = ref(false)
const error = ref('')
const purchaseByProduct = ref<PurchaseByProduct | null>(null)

const columns = computed<ColumnDef<PurchaseByProductRow>[]>(() => [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})`, footer: () => 'Total' },
  { key: 'quantity', label: 'Quantity', footer: () => purchaseByProduct.value?.totalQuantity },
  { key: 'amount', label: 'Amount', type: 'currency', footer: () => purchaseByProduct.value?.totalAmount }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    purchaseByProduct.value = await fetchPurchaseByProduct({
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
