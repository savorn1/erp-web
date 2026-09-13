<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="By supplier type"
      description="Orders and spend per supplier type."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Purchase reports' }, { label: 'By supplier type' }]"
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

    <UCard v-else-if="bySupplierType">
      <DataTable :rows="bySupplierType.rows" :columns="columns" :exportable="false">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="No purchases in this period" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PurchaseBySupplierType, PurchaseBySupplierTypeRow } from '~/composables/usePurchaseReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, purchaseStatus, activeCompanyOptions, purchaseStatusOptions, ensureLoaded } = useReportFilters()
const { bySupplierType: fetchBySupplierType } = usePurchaseReports()

const loading = ref(false)
const error = ref('')
const bySupplierType = ref<PurchaseBySupplierType | null>(null)

const columns = computed<ColumnDef<PurchaseBySupplierTypeRow>[]>(() => [
  { key: 'supplierTypeName', label: 'Supplier type', value: (row) => row.supplierTypeName ?? 'Untyped', footer: () => 'Total' },
  { key: 'orderCount', label: 'Orders' },
  { key: 'amount', label: 'Amount', type: 'currency', footer: () => bySupplierType.value?.totalAmount }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    bySupplierType.value = await fetchBySupplierType({
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
