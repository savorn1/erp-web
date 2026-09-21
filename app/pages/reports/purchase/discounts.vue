<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Discounts"
      description="Every discounted line, with the discount amount received."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Purchase reports' }, { label: 'Discounts' }]"
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
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="discounts">
      <div class="mb-4">
        <StatTile label="Total discount received" :value="formatCurrency(discounts.totalDiscountAmount)" icon="i-lucide-percent" color="success" />
      </div>
      <UCard>
        <DataTable :rows="discounts.rows" :columns="columns" exportable export-filename="purchase-discounts">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No discounted lines in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PurchaseDiscount, PurchaseDiscountRow } from '~/composables/usePurchaseReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, purchaseStatus, activeCompanyOptions, purchaseStatusOptions, ensureLoaded } = useReportFilters()
const { discounts: fetchDiscounts } = usePurchaseReports()

const loading = ref(false)
const error = ref('')
const discounts = ref<PurchaseDiscount | null>(null)

const columns: ColumnDef<PurchaseDiscountRow>[] = [
  { key: 'poNumber', label: 'Order', value: (row) => row.poNumber ?? '—' },
  { key: 'orderDate', label: 'Date', type: 'date' },
  { key: 'supplierName', label: 'Supplier', value: (row) => row.supplierName ?? '—' },
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'quantity', label: 'Quantity' },
  { key: 'unitCost', label: 'Unit cost', type: 'currency' },
  { key: 'discountPercent', label: 'Discount', suffix: '%' },
  { key: 'discountAmount', label: 'Discount amount', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    discounts.value = await fetchDiscounts({
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
