<template>
  <div>
    <ReportBackButton />
    <PageHeader
      title="Credit notes"
      description="Every credit note issued against a customer invoice."
      :crumbs="[{ label: 'Reports', to: '/reports' }, { label: 'Accounts receivable reports' }, { label: 'Credit notes' }]"
    />

    <UCard class="mb-4">
      <div class="flex flex-wrap items-end gap-3">
        <UFormField label="Company">
          <USelect v-model="companyId" :items="activeCompanyOptions" placeholder="All companies" class="w-52" />
        </UFormField>
      </div>
    </UCard>

    <UAlert v-if="error" color="error" variant="subtle" class="mb-4" :title="error" icon="i-lucide-triangle-alert" />
    <div v-if="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

    <template v-else>
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <StatTile label="Credit notes" :value="String(rows.length)" icon="i-lucide-receipt" color="neutral" />
        <StatTile label="Total credited" :value="formatCurrency(totalAmount)" icon="i-lucide-circle-dollar-sign" color="neutral" />
      </div>
      <UCard>
        <DataTable :rows="rows" :columns="columns" :exportable="false">
          <template #empty-state>
            <EmptyState icon="i-lucide-check-circle" title="No credit notes" />
          </template>
        </DataTable>
      </UCard>
    </template>
  </div>
</template>

<script setup lang="ts">
import type { ColumnDef } from '#shared/types'
import type { CreditNote } from '~/composables/useCreditNotes'

definePageMeta({ middleware: 'admin' })

const { companyId, activeCompanyOptions, ensureLoaded } = useReportFilters()
const { list: listCreditNotes } = useCreditNotes()

const loading = ref(false)
const error = ref('')
const rows = ref<CreditNote[]>([])
const totalAmount = computed(() => rows.value.reduce((sum, r) => sum + r.amount, 0))

const columns: ColumnDef<CreditNote>[] = [
  { key: 'creditNoteNumber', label: 'Credit note' },
  { key: 'creditNoteDate', label: 'Date', type: 'date' },
  { key: 'invoiceNumber', label: 'Invoice', value: (row) => row.invoiceNumber ?? '—' },
  { key: 'customerName', label: 'Customer', value: (row) => row.customerName ?? '—' },
  { key: 'reason', label: 'Reason', value: (row) => row.reason ?? '—' },
  { key: 'amount', label: 'Amount', type: 'currency' }
]

async function load() {
  loading.value = true
  error.value = ''
  try {
    const res = await listCreditNotes({ companyId: companyId.value, size: 500, sortBy: 'creditNoteDate', sortOrder: 'desc' })
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
