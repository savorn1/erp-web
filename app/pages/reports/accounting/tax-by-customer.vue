<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Tax by customer"
      description="Output tax collected per customer, for a period."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounting reports' }, { label: 'Tax by customer' }]"
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

    <template v-else-if="report">
      <StatTile label="Total tax collected" :value="formatCurrency(report.totalTaxAmount)" icon="i-lucide-receipt" color="success" class="mb-4" />
      <UCard>
        <DataTable :rows="report.rows" :columns="columns" exportable export-filename="accounting-tax-by-customer">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No tax collected in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { TaxByCustomer, TaxByCustomerRow } from '~/composables/useTaxReport'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { byCustomer: fetchByCustomer } = useTaxReport()

const loading = ref(false)
const error = ref('')
const report = ref<TaxByCustomer | null>(null)

const columns: ColumnDef<TaxByCustomerRow>[] = [
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'taxableAmount', label: 'Taxable amount', type: 'currency' },
  { key: 'taxAmount', label: 'Tax amount', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchByCustomer({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
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
