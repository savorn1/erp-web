<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Tax detail"
      description="Every taxed invoice line — output tax from sales, input tax from purchases."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounting reports' }, { label: 'Tax detail' }]"
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

    <template v-else-if="detail">
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Output tax (sales)" :value="formatCurrency(detail.totalOutputTax)" icon="i-lucide-trending-up" color="success" />
        <StatTile label="Input tax (purchases)" :value="formatCurrency(detail.totalInputTax)" icon="i-lucide-trending-down" color="info" />
      </div>
      <UCard>
        <DataTable :rows="detail.rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No taxed lines in this period" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { TaxDetail, TaxDetailRow } from '~/composables/useTaxReport'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { detail: fetchDetail } = useTaxReport()

const loading = ref(false)
const error = ref('')
const detail = ref<TaxDetail | null>(null)

const columns: ColumnDef<TaxDetailRow>[] = [
  { key: 'type', label: 'Type' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'reference', label: 'Reference', value: (row) => row.reference ?? '—' },
  { key: 'partyName', label: 'Party', value: (row) => row.partyName ?? '—' },
  { key: 'taxableAmount', label: 'Taxable amount', type: 'currency' },
  { key: 'taxRatePercent', label: 'Rate', suffix: '%' },
  { key: 'taxAmount', label: 'Tax amount', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    detail.value = await fetchDetail({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
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
