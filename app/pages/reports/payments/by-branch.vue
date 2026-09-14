<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Payments by branch"
      description="Net customer and supplier payments per branch."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Payment reports' }, { label: 'By branch' }]"
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
      <p class="text-xs text-gray-400 mt-3">
        Payments don't carry a branch themselves — each is attributed to the branch of the user who recorded it. "Unassigned" collects payments whose
        recording user has no branch.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <UCard v-else-if="report">
      <DataTable :rows="report.rows" :columns="columns" :exportable="false">
        <template #empty-state>
          <EmptyState icon="i-lucide-check-circle" title="No payments in this period" />
        </template>
      </DataTable>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PaymentByBranch, PaymentByBranchRow } from '~/composables/usePaymentReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { byBranch: fetchByBranch } = usePaymentReports()

const loading = ref(false)
const error = ref('')
const report = ref<PaymentByBranch | null>(null)

const columns: ColumnDef<PaymentByBranchRow>[] = [
  { key: 'branchName', label: 'Branch' },
  { key: 'customerCount', label: 'Customer payments' },
  { key: 'customerNet', label: 'Customer net', type: 'currency' },
  { key: 'supplierCount', label: 'Supplier payments' },
  { key: 'supplierNet', label: 'Supplier net', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    report.value = await fetchByBranch({ companyId: companyId.value, dateFrom: dateFrom.value || undefined, dateTo: dateTo.value || undefined })
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
