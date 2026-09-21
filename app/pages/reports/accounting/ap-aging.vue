<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="AP aging"
      description="Outstanding supplier bills by age bucket."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounting reports' }, { label: 'AP aging' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="As of date">
          <UInput v-model="asOfDate" type="date" class="w-44" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-500 dark:text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else-if="apAging">
      <EmptyState v-if="apAging.rows.length === 0" icon="i-lucide-check-circle" title="Nothing outstanding" />
      <AgingTable v-else :report="apAgingAsGeneric!" entity-label="Supplier" />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { InvoiceAgingReport } from '~/composables/useInvoices'
import type { PurchaseInvoiceAgingReport } from '~/composables/usePurchaseInvoices'

definePageMeta({ middleware: 'admin' })

const { companyId, asOfDate, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { agingReport: fetchApAging } = usePurchaseInvoices()

const loading = ref(false)
const error = ref('')
const apAging = ref<PurchaseInvoiceAgingReport | null>(null)

// AgingTable takes InvoiceAgingReport's row shape (customerId/customerName) —
// re-key the AP report's supplierId/supplierName rows to match so the same
// component can render both.
const apAgingAsGeneric = computed<InvoiceAgingReport | null>(() =>
  apAging.value
    ? {
        asOfDate: apAging.value.asOfDate,
        rows: apAging.value.rows.map((r) => ({
          customerId: r.supplierId,
          customerName: r.supplierName,
          current: r.current,
          days1To30: r.days1To30,
          days31To60: r.days31To60,
          days61To90: r.days61To90,
          days90Plus: r.days90Plus,
          total: r.total
        })),
        totals: {
          customerId: null,
          customerName: apAging.value.totals.supplierName,
          current: apAging.value.totals.current,
          days1To30: apAging.value.totals.days1To30,
          days31To60: apAging.value.totals.days31To60,
          days61To90: apAging.value.totals.days61To90,
          days90Plus: apAging.value.totals.days90Plus,
          total: apAging.value.totals.total
        }
      }
    : null
)

async function load() {
  loading.value = true
  error.value = ''
  try {
    apAging.value = await fetchApAging({ companyId: companyId.value, asOfDate: asOfDate.value })
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
watch([companyId, asOfDate], load)
</script>
