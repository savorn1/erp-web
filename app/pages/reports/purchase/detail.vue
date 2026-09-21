<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Detail"
      description="Every purchased line, with unit cost, discount, and tax broken out."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Purchase reports' }, { label: 'Detail' }]"
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

    <template v-else-if="detail">
      <UAlert
        v-if="detail.truncated"
        color="warning"
        variant="subtle"
        class="mb-4"
        title="Showing a partial result"
        description="This filter matches more lines than can be shown at once — narrow the date range or company to see everything."
      />
      <UCard>
        <DataTable :rows="detail.rows" :columns="columns" exportable export-filename="purchase-detail">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No purchases in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PurchaseDetail, PurchaseDetailRow } from '~/composables/usePurchaseReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, purchaseStatus, activeCompanyOptions, purchaseStatusOptions, ensureLoaded } = useReportFilters()
const { detail: fetchDetail } = usePurchaseReports()

const loading = ref(false)
const error = ref('')
const detail = ref<PurchaseDetail | null>(null)

const columns: ColumnDef<PurchaseDetailRow>[] = [
  { key: 'poNumber', label: 'Order', value: (row) => row.poNumber ?? '—' },
  { key: 'orderDate', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'status' },
  { key: 'supplierName', label: 'Supplier', value: (row) => row.supplierName ?? '—' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unitCost', label: 'Unit cost', type: 'currency' },
  { key: 'discountPercent', label: 'Discount', suffix: '%' },
  { key: 'discountAmount', label: 'Discount amt', type: 'currency' },
  { key: 'taxRate', label: 'Tax', suffix: '%' },
  { key: 'taxAmount', label: 'Tax amt', type: 'currency' },
  { key: 'lineTotal', label: 'Line total', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    detail.value = await fetchDetail({
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
