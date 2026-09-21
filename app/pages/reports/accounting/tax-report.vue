<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Tax report"
      description="Output and input tax by rate, for a period."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounting reports' }, { label: 'Tax report' }]"
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
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-3">
        Groups approved sales and purchase invoices by the tax percent typed on their lines — it can't attribute a rate to a named VAT/withholding
        <NuxtLink to="/tax-rates" class="underline">tax rate</NuxtLink> since order and invoice lines aren't linked to one.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <template v-else-if="taxReport">
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <StatTile label="Output tax (sales)" :value="formatCurrency(taxReport.outputTaxTotal)" icon="i-lucide-trending-up" color="success" />
        <StatTile label="Input tax (purchases)" :value="formatCurrency(taxReport.inputTaxTotal)" icon="i-lucide-trending-down" color="info" />
        <StatTile
          label="Net tax payable"
          :value="formatCurrency(taxReport.netTaxPayable)"
          icon="i-lucide-receipt"
          :color="taxReport.netTaxPayable >= 0 ? 'error' : 'success'"
        />
      </div>
      <UCard class="mb-4">
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Output tax — sales invoices</h2></template>
        <DataTable :rows="taxReport.outputTax" :columns="columns" exportable export-filename="accounting-tax-report-output-tax">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No output tax in this period" />
          </template>
        </DataTable>
      </UCard>
      <UCard>
        <template #header><h2 class="text-sm font-semibold text-gray-900 dark:text-white">Input tax — purchase invoices</h2></template>
        <DataTable :rows="taxReport.inputTax" :columns="columns" exportable export-filename="accounting-tax-report-input-tax">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No input tax in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { TaxReport, TaxReportRateRow } from '~/composables/useTaxReport'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { generate: fetchTaxReport } = useTaxReport()

const loading = ref(false)
const error = ref('')
const taxReport = ref<TaxReport | null>(null)

const columns: ColumnDef<TaxReportRateRow>[] = [
  { key: 'taxRatePercent', label: 'Rate', suffix: '%' },
  { key: 'taxableAmount', label: 'Taxable amount', type: 'currency' },
  { key: 'taxAmount', label: 'Tax amount', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    taxReport.value = await fetchTaxReport({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
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
