<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Tax by product"
      description="Output and input tax attributed to each product, for a period."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounting reports' }, { label: 'Tax by product' }]"
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
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="report">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Output tax (sales)" :value="formatCurrency(report.totalOutputTax)" icon="i-lucide-trending-up" color="success" />
        <StatTile label="Input tax (purchases)" :value="formatCurrency(report.totalInputTax)" icon="i-lucide-trending-down" color="info" />
      </div>
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" exportable export-filename="accounting-tax-by-product">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No taxed products in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { TaxByProduct, TaxByProductRow } from '~/composables/useTaxReport'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { byProduct: fetchByProduct } = useTaxReport()

const loading = ref(false)
const error = ref('')
const report = ref<TaxByProduct | null>(null)

const columns: ColumnDef<TaxByProductRow>[] = [
  { key: 'productName', label: 'Product', value: (row) => `${row.productName ?? '—'} (${row.productSku ?? '—'})` },
  { key: 'outputTaxAmount', label: 'Output tax', type: 'currency' },
  { key: 'inputTaxAmount', label: 'Input tax', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchByProduct({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
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
