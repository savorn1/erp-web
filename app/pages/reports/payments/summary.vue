<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Payment summary"
      description="Received from customers, paid to suppliers, refunds both ways, and the net cash flow for a period."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Payment reports' }, { label: 'Summary' }]"
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

    <template v-else-if="summary">
      <StatTile
        label="Net cash flow"
        :value="formatCurrency(summary.netCashFlow)"
        icon="i-lucide-scale"
        :color="summary.netCashFlow >= 0 ? 'success' : 'error'"
        class="mb-4"
      />
      <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Customers</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        <StatTile label="Payments" :value="String(summary.customerPaymentCount)" icon="i-lucide-hand-coins" color="neutral" />
        <StatTile label="Received" :value="formatCurrency(summary.customerReceived)" icon="i-lucide-trending-up" color="success" />
        <StatTile label="Refunded" :value="formatCurrency(summary.customerRefunded)" icon="i-lucide-undo-2" color="warning" />
        <StatTile label="Net received" :value="formatCurrency(summary.customerNet)" icon="i-lucide-banknote" color="primary" />
      </div>
      <h2 class="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-2">Suppliers</h2>
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatTile label="Payments" :value="String(summary.supplierPaymentCount)" icon="i-lucide-banknote" color="neutral" />
        <StatTile label="Paid" :value="formatCurrency(summary.supplierPaid)" icon="i-lucide-trending-down" color="info" />
        <StatTile label="Refunded" :value="formatCurrency(summary.supplierRefunded)" icon="i-lucide-undo-2" color="warning" />
        <StatTile label="Net paid" :value="formatCurrency(summary.supplierNet)" icon="i-lucide-credit-card" color="primary" />
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { PaymentSummary } from '~/composables/usePaymentReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { summary: fetchSummary } = usePaymentReports()

const loading = ref(false)
const error = ref('')
const summary = ref<PaymentSummary | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    summary.value = await fetchSummary({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
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
