<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="By product category"
      description="Quantity purchased and spend per product category."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Purchase reports' }, { label: 'By product category' }]"
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

    <UCard v-else-if="byCategory">
      <DataTable :rows="byCategory.rows" :columns="columns" :exportable="false">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="No purchases in this period" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PurchaseByCategory, PurchaseByCategoryRow } from '~/composables/usePurchaseReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, purchaseStatus, activeCompanyOptions, purchaseStatusOptions, ensureLoaded } = useReportFilters()
const { byCategory: fetchByCategory } = usePurchaseReports()

const loading = ref(false)
const error = ref('')
const byCategory = ref<PurchaseByCategory | null>(null)

const columns = computed<ColumnDef<PurchaseByCategoryRow>[]>(() => [
  { key: 'categoryName', label: 'Category', value: (row) => row.categoryName ?? 'Uncategorized', footer: () => 'Total' },
  { key: 'quantity', label: 'Quantity', footer: () => byCategory.value?.totalQuantity },
  { key: 'amount', label: 'Amount', type: 'currency', footer: () => byCategory.value?.totalAmount }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    byCategory.value = await fetchByCategory({
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
