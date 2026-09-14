<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="AR summary"
      description="Total outstanding and overdue receivables, as of a date."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounts receivable reports' }, { label: 'AR summary' }]"
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
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <div v-else-if="summary" class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatTile label="Total outstanding" :value="formatCurrency(summary.totalOutstanding)" icon="i-lucide-wallet" color="primary" />
      <StatTile label="Total overdue" :value="formatCurrency(summary.totalOverdue)" icon="i-lucide-alert-circle" color="error" />
      <StatTile
        label="Customers with a balance"
        :value="String(summary.customerCount)"
        :sublabel="`${summary.overdueCustomerCount} overdue`"
        icon="i-lucide-users"
        color="info"
      />
      <StatTile
        label="Oldest overdue"
        :value="summary.oldestOverdueDays > 0 ? `${summary.oldestOverdueDays} days` : 'None'"
        icon="i-lucide-clock"
        :color="summary.oldestOverdueDays > 0 ? 'warning' : 'success'"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ArSummary } from '~/composables/useArReports'

definePageMeta({ middleware: 'admin' })

const { companyId, asOfDate, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { summary: fetchSummary } = useArReports()

const loading = ref(false)
const error = ref('')
const summary = ref<ArSummary | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    summary.value = await fetchSummary({ companyId: companyId.value, asOfDate: asOfDate.value })
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
