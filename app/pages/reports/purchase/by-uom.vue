<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="By unit of measure"
      description="Quantity purchased and spend per unit of measure ordered."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Purchase reports' }, { label: 'By unit of measure' }]"
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
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Quantities aren't converted to a common base unit — mixing Case and Piece purchases for the same product will list separate rows.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else-if="byUom">
      <DataTable :rows="byUom.rows" :columns="columns" exportable export-filename="purchase-by-uom">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="No purchases in this period" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PurchaseByUom, PurchaseByUomRow } from '~/composables/usePurchaseReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, purchaseStatus, activeCompanyOptions, purchaseStatusOptions, ensureLoaded } = useReportFilters()
const { byUom: fetchByUom } = usePurchaseReports()

const loading = ref(false)
const error = ref('')
const byUom = ref<PurchaseByUom | null>(null)

const columns = computed<ColumnDef<PurchaseByUomRow>[]>(() => [
  { key: 'uomName', label: 'Unit', value: (row) => row.uomName ?? 'Unspecified', footer: () => 'Total' },
  { key: 'quantity', label: 'Quantity' },
  { key: 'amount', label: 'Amount', type: 'currency', footer: () => byUom.value?.totalAmount }
])

async function load() {
  loading.value = true
  error.value = ''
  try {
    byUom.value = await fetchByUom({
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
