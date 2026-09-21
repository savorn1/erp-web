<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Supplier statement"
      description="One supplier's invoices, payments, and credit notes over a period, with a running balance."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounts payable reports' }, { label: 'Supplier statement' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
        <UFormField label="Supplier" required>
          <USelect v-model="supplierId" :items="supplierOptions" placeholder="Select a supplier" class="w-56" />
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

    <UCard v-else>
      <EmptyState v-if="!supplierId" icon="i-lucide-book-text" title="Select a supplier" description="Choose a supplier above to see their statement." />
      <template v-else-if="statement">
        <div class="flex items-center justify-between mb-3 text-sm">
          <span class="text-gray-900 dark:text-white font-medium">{{ statement.supplierName }}</span>
          <span class="text-gray-500 dark:text-gray-400">Opening: {{ formatCurrency(statement.openingBalance) }}</span>
        </div>
        <DataTable :rows="statement.lines" :columns="columns" exportable export-filename="accounts-payable-supplier-statement">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No activity in this period" />
          </template>
        </DataTable>
      </template>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { SupplierStatement, SupplierStatementLine } from '~/composables/useApReports'

definePageMeta({ middleware: 'admin' })

const { companyId, dateFrom, dateTo, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { supplierStatement: fetchStatement } = useApReports()
const { list: listSuppliers } = useSuppliers()

const suppliers = ref<{ id: number; name: string; companyId: number }[]>([])
const supplierId = ref<number | undefined>(undefined)
const supplierOptions = computed(() =>
  suppliers.value.filter((s) => companyId.value === undefined || s.companyId === companyId.value).map((s) => ({ label: s.name, value: s.id }))
)

const loading = ref(false)
const error = ref('')
const statement = ref<SupplierStatement | null>(null)

const columns: ColumnDef<SupplierStatementLine>[] = [
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'type', label: 'Type', type: 'status' },
  { key: 'reference', label: 'Reference', value: (row) => row.reference ?? '—' },
  { key: 'debit', label: 'Debit', type: 'currency', value: (row) => (row.debit > 0 ? row.debit : null) },
  { key: 'credit', label: 'Credit', type: 'currency', value: (row) => (row.credit > 0 ? row.credit : null) },
  { key: 'runningBalance', label: 'Balance', type: 'currency' }
]

async function load() {
  if (!supplierId.value) {
    statement.value = null
    return
  }
  loading.value = true
  error.value = ''
  try {
    statement.value = await fetchStatement({
      companyId: companyId.value,
      supplierId: supplierId.value,
      dateFrom: dateFrom.value || undefined,
      dateTo: dateTo.value || undefined
    })
  } catch (err) {
    error.value = apiErrorMessage(err)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await ensureLoaded()
  suppliers.value = (await listSuppliers({ size: 500 })).data
  await load()
})
watch([companyId, supplierId, dateFrom, dateTo], load)
</script>
