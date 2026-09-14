<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Debit notes"
      description="Every credit note received from a supplier against a purchase invoice."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounts payable reports' }, { label: 'Debit notes' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
      </div>
      <p class="text-xs text-gray-400 mt-3">
        Called a "debit note" from the buyer's side — the system records it as a supplier credit note against the original purchase invoice.
      </p>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Debit notes" :value="String(rows.length)" icon="i-lucide-receipt" color="neutral" />
        <StatTile label="Total credited" :value="formatCurrency(totalAmount)" icon="i-lucide-circle-dollar-sign" color="neutral" />
      </div>
      <UCard>
        <DataTable :rows="rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No debit notes" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { PurchaseCreditNote } from '~/composables/usePurchaseCreditNotes'

definePageMeta({ middleware: 'admin' })

const { companyId, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { list: listPurchaseCreditNotes } = usePurchaseCreditNotes()

const loading = ref(false)
const error = ref('')
const rows = ref<PurchaseCreditNote[]>([])
const totalAmount = computed(() => rows.value.reduce((sum, r) => sum + r.amount, 0))

const columns: ColumnDef<PurchaseCreditNote>[] = [
  { key: 'creditNoteNumber', label: 'Debit note' },
  { key: 'creditNoteDate', label: 'Date', type: 'date' },
  { key: 'invoiceNumber', label: 'Invoice', value: (row) => row.invoiceNumber ?? '—' },
  { key: 'supplierName', label: 'Supplier', value: (row) => row.supplierName ?? '—' },
  { key: 'reason', label: 'Reason', value: (row) => row.reason ?? '—' },
  { key: 'amount', label: 'Amount', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await listPurchaseCreditNotes({ companyId: companyId.value, size: 500, sortBy: 'creditNoteDate', sortOrder: 'desc' })
    rows.value = res.data
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
watch(companyId, load)
</script>
