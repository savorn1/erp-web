<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="AR aging"
      description="Outstanding customer invoices by age bucket."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounting reports' }, { label: 'AR aging' }]"
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

    <UCard v-else-if="arAging">
      <EmptyState v-if="arAging.rows.length === 0" icon="i-lucide-check-circle" title="Nothing outstanding" />
      <AgingTable v-else :report="arAging" entity-label="Customer" />
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { InvoiceAgingReport } from '~/composables/useInvoices'

definePageMeta({ middleware: 'admin' })

const { companyId, asOfDate, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { agingReport: fetchArAging } = useInvoices()

const loading = ref(false)
const error = ref('')
const arAging = ref<InvoiceAgingReport | null>(null)

async function load() {
  loading.value = true
  error.value = ''
  try {
    arAging.value = await fetchArAging({ companyId: companyId.value, asOfDate: asOfDate.value })
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
